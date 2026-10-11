"""Build the dataset manifest and split it into train/val/test.

    python scripts/prepare_dataset.py

Reads data/raw/<Class>/*.jpg, optionally enriched by data/metadata.csv, and writes
data/manifest.csv plus data/splits/{train,val,test}.csv.

The important work here is the split. Photographs of the same physical object must
never straddle two splits: if three shots of one bottle land in train and a fourth in
test, the test score measures memorisation, not generalisation. That failure is
invisible — it produces a number that looks better than the truth — so grouping is
enforced here rather than left to the collector's discipline.
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()


def derive_object_id(path: Path, metadata: dict) -> str:
    """Prefer a declared object_id; otherwise treat the file as its own group.

    Falling back to per-file grouping is safe (it can only make the split harder,
    never leakier), but it forfeits the protection, so the caller is warned.
    """
    declared = metadata.get(path.name, {}).get("object_id")
    if declared:
        return f"declared::{declared}"
    return f"file::{path.name}"


def load_metadata(meta_path: Path, public_path: Path) -> dict:
    """The metadata CSV, keyed by filename, folded together with public ingests.

    The team's hand-recorded rows and the provenance `ingest_public.py` appends to
    data/public_metadata.jsonl describe disjoint sets of files, so merging them here
    is what lets one lookup answer "what is this image and where did it come from".
    Hand-recorded rows win any collision.
    """
    merged = {}

    if public_path.exists():
        with open(public_path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get("filename"):
                    merged[row["filename"]] = row

    if meta_path.exists():
        frame = pd.read_csv(meta_path)
        if "filename" not in frame.columns:
            print(f"⚠️  {meta_path.name} has no 'filename' column — ignoring it")
        else:
            for _, row in frame.iterrows():
                merged[row["filename"]] = row.dropna().to_dict()

    return merged


def scan_raw(raw_dir: Path, metadata: dict) -> pd.DataFrame:
    rows = []
    unknown_dirs = []

    for class_dir in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        label = class_dir.name

        if label not in config.CLASSES:
            unknown_dirs.append(label)
            continue

        for image_path in sorted(class_dir.rglob("*")):
            if image_path.suffix.lower() not in config.IMAGE_EXTENSIONS:
                continue
            meta = metadata.get(image_path.name, {})
            rows.append(
                {
                    # Relative to ML_ROOT, with forward slashes. An absolute path
                    # here makes the manifest and the splits machine-specific: a set
                    # built on Windows and unzipped on Colab fails on the first
                    # image with a bare FileNotFoundError naming a D:\ path.
                    # wasteml/data.py resolves this back against ML_ROOT.
                    "path": image_path.resolve()
                    .relative_to(config.ML_ROOT)
                    .as_posix(),
                    "label": label,
                    "object_id": derive_object_id(image_path, metadata),
                    "source": meta.get("source", "local"),
                    "condition": meta.get("condition", ""),
                    "background": meta.get("background", ""),
                    "lighting": meta.get("lighting", ""),
                    "collector": meta.get("collector", ""),
                }
            )

    if unknown_dirs:
        print(f"⚠️  Ignored directories that are not classes: {sorted(unknown_dirs)}")
        print(f"    Valid classes: {config.CLASSES}")

    return pd.DataFrame(rows)


def grouped_split(frame: pd.DataFrame, seed: int, ratios: dict | None = None):
    """Stratified by label, disjoint by object_id.

    sklearn's StratifiedGroupKFold gives us both properties at once. We take one fold
    as test, then split the remainder again for validation.

    `ratios` overrides config.SPLIT_RATIOS. The holdout pool is split on its own
    ratios because it is scarce and serves a different purpose: studio images
    already supply the training volume, so a field image spent on training buys
    almost nothing, while the same image in the test set is the only thing that
    can measure anything.
    """
    from sklearn.model_selection import StratifiedGroupKFold

    ratios = ratios or config.SPLIT_RATIOS
    test_frac = ratios["test"]
    val_frac = ratios["val"]

    n_splits = max(2, round(1 / test_frac))
    splitter = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=seed)
    rest_idx, test_idx = next(splitter.split(frame, frame["label"], frame["object_id"]))

    rest = frame.iloc[rest_idx].reset_index(drop=True)
    test = frame.iloc[test_idx].reset_index(drop=True)

    # val_frac is a fraction of the whole, so rescale it against what remains.
    inner_splits = max(2, round(1 / (val_frac / (1 - test_frac))))
    inner = StratifiedGroupKFold(n_splits=inner_splits, shuffle=True, random_state=seed)
    train_idx, val_idx = next(inner.split(rest, rest["label"], rest["object_id"]))

    return (
        rest.iloc[train_idx].reset_index(drop=True),
        rest.iloc[val_idx].reset_index(drop=True),
        test,
    )


def split_with_local_holdout(
    frame: pd.DataFrame,
    seed: int,
    ratios: dict | None = None,
    balance_holdout: bool = False,
):
    """Hold out the field photographs; send the studio ones to train only.

    Studio datasets are shot differently from the app's real input — TrashNet in
    particular is one item on a plain white background — so a test set containing
    them reports a number that does not describe the deployed model. Keeping them
    out of validation matters for the same reason: the temperature and abstention
    thresholds are fitted there and then shown to users as a confidence.

    They stay in training, where extra volume genuinely helps.

    Eligible for the holdout are the team's own photographs and the sources in
    `config.FIELD_SOURCES` — landfill, conveyor and street images, which are
    public but were taken where waste actually is. Training on studio images and
    testing on field ones makes the split cross-domain, so the reported score
    answers report Gap 3 directly: it measures what a clean-image classifier
    does on a cluttered real photograph. Expect it to sit well below a
    same-domain score. That is the point, not a defect.
    """
    is_studio = frame["source"].isin(config.STUDIO_SOURCES)
    holdout_pool = frame[~is_studio].reset_index(drop=True)
    studio = frame[is_studio].reset_index(drop=True)

    if holdout_pool.empty:
        raise SystemExit(
            "❌ every image is from a studio dataset, so there is nothing to hold out.\n"
            "   Fetch a field source (realwaste, mdwd, zerowaste, taco) with\n"
            "   scripts/fetch_datasets.py, collect local photographs, or pass\n"
            "   --allow-public-holdout and treat the reported score as an upper\n"
            "   bound rather than a measurement."
        )

    n_field = int(holdout_pool["source"].isin(config.FIELD_SOURCES).sum())
    n_local = len(holdout_pool) - n_field
    print(f"🎯 holdout pool: {n_local} local + {n_field} field image(s)")

    if balance_holdout:
        holdout_pool = cap_per_class(
            holdout_pool, int(Counter(holdout_pool["label"]).most_common()[-1][1]),
            seed, label="holdout",
        )

    train, val, test = grouped_split(holdout_pool, seed, ratios)
    if not studio.empty:
        train = pd.concat([train, studio], ignore_index=True)
        print(f"📦 {len(studio)} studio image(s) added to train only")
    return train, val, test


def report(name: str, frame: pd.DataFrame) -> None:
    counts = Counter(frame["label"])
    total = len(frame)
    print(f"\n  {name}: {total} images")
    for cls in config.CLASSES:
        n = counts.get(cls, 0)
        share = (n / total * 100) if total else 0
        flag = "  ⚠️ EMPTY" if n == 0 else ""
        print(f"    {cls:<12} {n:>5}  ({share:4.1f}%){flag}")


def verify_no_leakage(train, val, test) -> bool:
    """The check that makes the reported accuracy trustworthy."""
    groups = {
        "train": set(train["object_id"]),
        "val": set(val["object_id"]),
        "test": set(test["object_id"]),
    }

    clean = True
    for a, b in [("train", "val"), ("train", "test"), ("val", "test")]:
        overlap = groups[a] & groups[b]
        if overlap:
            clean = False
            print(f"\n❌ LEAKAGE: {len(overlap)} object(s) appear in both {a} and {b}")
            for obj in list(overlap)[:5]:
                print(f"     {obj}")
    return clean


def cap_per_class(
    frame: pd.DataFrame, cap: int, seed: int, label: str = "class"
) -> pd.DataFrame:
    """Trim every class down to `cap` images, to balance the training signal.

    An imbalanced set teaches the network the prior rather than the picture.
    With Paper at 4,015 and Organic at 1,871, a model that answers "Paper" to
    everything scores 32% and the loss barely complains. Weighting the loss
    fixes the gradient but not the representation the encoder learns, so the
    counts are levelled first and the weighting applied on top.

    Capping the majority is not a worse fix than padding the minority: it costs
    images instead of time, and nothing is deleted — the surplus stays in
    `data/raw` and is simply absent from this manifest, so raising the cap later
    is one re-run.

    Which images go: studio first, then field, local never. Local photographs
    are the scarcest and the only ones that are certainly of this town; field
    images are the only public ones eligible for the held-out set. Dropping the
    most replaceable tier first keeps both intact.

    Whole `object_id` groups are dropped together. Several shots of one item
    that landed on opposite sides of the cap would otherwise put near-duplicates
    in the manifest while their siblings vanish, and the group is what the split
    is disjoint on.
    """
    rng = np.random.default_rng(seed)
    keep = []

    # Not named `label`: that is this function's parameter, and shadowing it
    # made the summary line report a class name instead of what was capped.
    for _class_name, group in frame.groupby("label", sort=True):
        if len(group) <= cap:
            keep.append(group)
            continue

        # Lowest tier is dropped first, so order ascending by how expendable the
        # image is: local (0) survives, field (1) next, studio (2) goes first.
        def tier_of(source: str) -> int:
            if source not in config.PUBLIC_SOURCES:
                return 0
            return 1 if source in config.FIELD_SOURCES else 2

        # Column names carry no leading underscore: DataFrame.itertuples renames
        # those to positional `_1`, `_2`, and `row.tier` stops resolving.
        objects = (
            group.assign(tier=group["source"].map(tier_of))
            .groupby("object_id", sort=True)
            .agg(tier=("tier", "min"), n=("path", "size"))
            .reset_index()
        )
        # Shuffle inside a tier so the choice is not alphabetical by filename,
        # which on these datasets correlates with the order they were shot.
        objects["roll"] = rng.random(len(objects))
        objects = objects.sort_values(["tier", "roll"], kind="stable")

        running, chosen = 0, []
        for row in objects.itertuples():
            if running >= cap:
                break
            chosen.append(row.object_id)
            running += row.n

        keep.append(group[group["object_id"].isin(chosen)])

    capped = pd.concat(keep, ignore_index=True)
    dropped = len(frame) - len(capped)
    if dropped:
        print(f"⚖️  {label} capped at {cap:,} each: {dropped:,} image(s) left out "
              "(still on disk)")
    return capped


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=config.RAW_DIR)
    parser.add_argument("--metadata", type=Path, default=config.METADATA_PATH)
    parser.add_argument("--seed", type=int, default=config.SPLIT_SEED)
    parser.add_argument("--classes", nargs="*", default=None,
                        help="keep only these class folders, e.g. the five focus "
                             "classes. Default: every class in config.CLASSES")
    parser.add_argument("--cap-per-class", type=int, default=None,
                        help="trim each class to at most N images, to balance them")
    parser.add_argument("--balance-holdout", action="store_true",
                        help="cap every class in the holdout pool to the smallest "
                             "one, so val and test are balanced too")
    parser.add_argument("--holdout-ratios", default=None, metavar="TRAIN,VAL,TEST",
                        help="how to split the holdout pool, e.g. 0.2,0.4,0.4. "
                             "Field images are scarce and studio images already "
                             "supply the training volume, so spending them on "
                             "train buys little. Default: config.SPLIT_RATIOS")
    parser.add_argument("--allow-public-holdout", action="store_true",
                        help="let public-dataset images into val and test; the score "
                             "then measures performance on studio photographs")
    args = parser.parse_args()

    if args.classes:
        unknown = set(args.classes) - set(config.CLASSES)
        if unknown:
            print(f"❌ unknown class(es): {sorted(unknown)}")
            return 1

    if not args.raw_dir.exists():
        print(f"❌ {args.raw_dir} does not exist. Create it and add one folder per class:")
        print(f"   {', '.join(config.CLASSES)}")
        return 1

    metadata = load_metadata(args.metadata, config.PUBLIC_METADATA_PATH)
    print(f"📖 metadata rows: {len(metadata) or f'none ({args.metadata} not found)'}")

    frame = scan_raw(args.raw_dir, metadata)
    if frame.empty:
        print(f"❌ No images found under {args.raw_dir}")
        return 1

    before = len(frame)
    frame = frame.drop_duplicates(subset=["path"]).reset_index(drop=True)
    if len(frame) < before:
        print(f"🧹 dropped {before - len(frame)} duplicate paths")

    if args.classes:
        frame = frame[frame["label"].isin(args.classes)].reset_index(drop=True)
        print(f"🎯 restricted to {', '.join(args.classes)}: {len(frame):,} images")
        if frame.empty:
            print("❌ no images left after restricting the classes")
            return 1

    if args.cap_per_class:
        frame = cap_per_class(frame, args.cap_per_class, args.seed)

    declared = frame["object_id"].str.startswith("declared::").sum()
    if declared < len(frame):
        print(
            f"⚠️  {len(frame) - declared} of {len(frame)} images have no object_id.\n"
            "    Each is treated as its own group. Grouping still holds, but multiple\n"
            "    shots of one item will be split apart — add object_id to metadata.csv\n"
            "    to keep them together."
        )

    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    frame.to_csv(config.MANIFEST_PATH, index=False)
    print(f"\n📄 manifest: {config.MANIFEST_PATH}  ({len(frame)} images)")

    counts = Counter(frame["label"])
    thin = [c for c in config.CLASSES if counts.get(c, 0) < config.MIN_IMAGES_PER_CLASS]
    if thin:
        print(f"\n⚠️  Below {config.MIN_IMAGES_PER_CLASS} images — results will be unreliable:")
        for cls in thin:
            print(f"     {cls:<12} {counts.get(cls, 0):>5}")

    ratios = None
    if args.holdout_ratios:
        try:
            parts = [float(x) for x in args.holdout_ratios.split(",")]
        except ValueError:
            parts = []
        if len(parts) != 3 or abs(sum(parts) - 1.0) > 1e-6 or any(p < 0 for p in parts):
            print(f"❌ --holdout-ratios {args.holdout_ratios!r} must be three "
                  "non-negative numbers summing to 1, e.g. 0.2,0.4,0.4")
            return 1
        ratios = dict(zip(("train", "val", "test"), parts))
        print(f"📐 holdout split: train {parts[0]:.0%}, val {parts[1]:.0%}, "
              f"test {parts[2]:.0%}")

    if args.allow_public_holdout:
        print("\n⚠️  --allow-public-holdout: val and test may contain public images.")
        train, val, test = grouped_split(frame, args.seed, ratios)
    else:
        train, val, test = split_with_local_holdout(
            frame, args.seed, ratios, args.balance_holdout
        )

    config.SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    for name, split in [("train", train), ("val", val), ("test", test)]:
        split.to_csv(config.SPLITS_DIR / f"{name}.csv", index=False)
        report(name, split)

    print()
    if not verify_no_leakage(train, val, test):
        print("\n❌ Split rejected. Do not train on this.")
        return 1

    print("✅ No object appears in more than one split.")
    print(f"✅ Splits written to {config.SPLITS_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
