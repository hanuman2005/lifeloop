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
import sys
from collections import Counter
from pathlib import Path

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


def load_metadata(data_dir: Path) -> dict:
    """Optional data/metadata.csv, keyed by filename."""
    meta_path = data_dir / "metadata.csv"
    if not meta_path.exists():
        return {}

    frame = pd.read_csv(meta_path)
    if "filename" not in frame.columns:
        print(f"⚠️  {meta_path.name} has no 'filename' column — ignoring it")
        return {}

    return {row["filename"]: row.dropna().to_dict() for _, row in frame.iterrows()}


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
                    "path": str(image_path.resolve()),
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


def grouped_split(frame: pd.DataFrame, seed: int):
    """Stratified by label, disjoint by object_id.

    sklearn's StratifiedGroupKFold gives us both properties at once. We take one fold
    as test, then split the remainder again for validation.
    """
    from sklearn.model_selection import StratifiedGroupKFold

    test_frac = config.SPLIT_RATIOS["test"]
    val_frac = config.SPLIT_RATIOS["val"]

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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=config.RAW_DIR)
    parser.add_argument("--seed", type=int, default=config.SPLIT_SEED)
    args = parser.parse_args()

    if not args.raw_dir.exists():
        print(f"❌ {args.raw_dir} does not exist. Create it and add one folder per class:")
        print(f"   {', '.join(config.CLASSES)}")
        return 1

    metadata = load_metadata(config.DATA_DIR)
    print(f"📖 metadata rows: {len(metadata) or 'none (data/metadata.csv not found)'}")

    frame = scan_raw(args.raw_dir, metadata)
    if frame.empty:
        print(f"❌ No images found under {args.raw_dir}")
        return 1

    before = len(frame)
    frame = frame.drop_duplicates(subset=["path"]).reset_index(drop=True)
    if len(frame) < before:
        print(f"🧹 dropped {before - len(frame)} duplicate paths")

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

    train, val, test = grouped_split(frame, args.seed)

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
