"""Find and quarantine duplicate images in data/raw.

    python scripts/dedupe_raw.py                 # report only, changes nothing
    python scripts/dedupe_raw.py --apply         # move duplicates to data/quarantine
    python scripts/dedupe_raw.py --distance 3    # also catch near-duplicates

Why this is not optional
------------------------
`check_dataset.py` found 374 byte-identical pairs the moment Garbage
Classification v2 was ingested, almost all of them `garbage_v2_glass_* =
trashnet_glass_*`. The 2024 dataset absorbed the 2016 one. Byte equality is the
part that is easy to see; the same photograph re-encoded at a different quality,
or resized, has a different sha256 and would pass unnoticed.

A duplicate that lands in training and in test at the same time does not look
like a bug. It looks like a good score. The model memorises the training copy
and is then asked the same question in the exam, and every metric in Chapter 8
is inflated by an amount nobody can measure after the fact. That is the single
most common way a reported accuracy becomes fiction, and it is why this runs
before `prepare_dataset.py`, not after.

How duplicates are detected
---------------------------
Two passes over each file:

* **sha256** of the bytes — catches exact copies.
* **dhash**, a 64-bit perceptual hash. The image is converted to greyscale and
  resized to 9x8, then each bit records whether a pixel is brighter than the one
  to its right. Comparing neighbours rather than absolute values is what makes
  it survive re-encoding, rescaling and a change in overall brightness, which is
  exactly how the same photograph differs between two public datasets.

Hamming distance 0 means the gradient pattern is identical. `--distance 3`
widens that to images a person would call the same shot; above about 8 it starts
pairing different photographs of similar objects, so the default stays at 0.

Which copy survives
-------------------
* A pair spanning a field source and a studio source: **the field copy stays.**
  Field images are the only ones eligible for validation and test, so deleting
  the studio copy is what removes the image from training and keeps the held-out
  set intact. Keeping the studio copy instead would leave the duplicate
  straddling the split, which is the whole problem.
* A pair inside one tier: the lexicographically first path stays, so the result
  is the same on every machine and every run.
* **A pair in two different classes is a label conflict**, not a duplicate. One
  of the two labels is wrong and this script cannot tell which, so both copies
  are quarantined and listed for a human. Guessing would write a wrong label
  into the training set deliberately.

Nothing is deleted. Files move to `data/quarantine/<class>/`, keeping their
names, so a mistake is undone by moving them back.
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageOps  # noqa: E402

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

QUARANTINE_DIR = config.DATA_DIR / "quarantine"

# dhash grid. 9 columns produce 8 comparisons per row, so 8 rows give 64 bits.
HASH_W, HASH_H = 9, 8


# A hash with fewer than this many distinct rows carries too little of the
# picture to identify it. Measured on this dataset: real photographs give five
# to eight distinct rows, while the two failure modes below give one or two.
MIN_DISTINCT_ROWS = 4


def is_degenerate(bits: int) -> bool:
    """True when the hash describes something other than the picture.

    Two failure modes showed up here, both on garbage_v2:

    `3333333333333333`, the pattern 00110011 on all eight rows, appeared on
    unrelated 384x384 images. That is resampling ringing, not content.

    `1030303030303030`, seven identical rows and 15 of 64 bits set, appeared on
    product shots against a near-white background — 180x180 up to 1000x770,
    plainly different objects. When the background is most of the frame almost
    every brightness comparison comes out equal, so the hash records the
    backdrop and the object contributes a handful of bits. That clustered
    fourteen different glass and plastic items as one "duplicate".

    Both collapse to the same symptom: too few distinct rows. Such a hash is
    discarded rather than trusted. The cost is that a genuine duplicate among
    these files is missed by the perceptual pass — the byte-identical pass
    still covers it. The alternative is quarantining correctly-labelled images
    and reporting label conflicts that do not exist.
    """
    rows = {(bits >> (8 * i)) & 0xFF for i in range(HASH_H)}
    return len(rows) < MIN_DISTINCT_ROWS


def dhash(path: Path) -> int | None:
    """A 64-bit perceptual hash, or None if the file will not open.

    The reduction happens in two steps, and with BOX rather than LANCZOS.
    Going straight from 384 px to 9 px with a windowed filter leaves periodic
    ringing that is stronger than the image content, which is what produced the
    degenerate hashes above. BOX averages every source pixel into its target
    with no overshoot, and an intermediate size that is an exact multiple of the
    final one keeps that averaging even.
    """
    try:
        with Image.open(path) as handle:
            # EXIF first: a phone photograph stores its rotation as a tag rather
            # than rotating the pixels, so the same image shot sideways would
            # otherwise hash differently from its upright copy.
            image = ImageOps.exif_transpose(handle).convert("L")
            if min(image.size) > HASH_H * 8:
                image = image.resize(
                    (HASH_W * 8, HASH_H * 8), Image.Resampling.BOX
                )
            image = image.resize((HASH_W, HASH_H), Image.Resampling.BOX)
            pixels = list(image.getdata())
    except (OSError, ValueError):
        return None

    bits = 0
    for row in range(HASH_H):
        base = row * HASH_W
        for col in range(HASH_W - 1):
            bits <<= 1
            if pixels[base + col] > pixels[base + col + 1]:
                bits |= 1

    return None if is_degenerate(bits) else bits


def source_of(path: Path) -> str:
    """The ingest source, read back off the filename prefix.

    `ingest_public.py` writes `<source>_<folder>_<original name>`, so the
    provenance survives in the filename itself and this does not have to load
    the manifest. A file with no recognised prefix is the team's own
    photograph.
    """
    name = path.name
    for source in sorted(config.PUBLIC_SOURCES, key=len, reverse=True):
        if name.startswith(f"{source}_"):
            return source
    return "local"


def tier(source: str) -> int:
    """Lower sorts first and therefore survives.

    Local photographs outrank field sources, which outrank studio sources.
    """
    if source == "local":
        return 0
    if source in config.FIELD_SOURCES:
        return 1
    return 2


def collect(classes: list[str]) -> list[Path]:
    paths = []
    for class_name in classes:
        folder = config.RAW_DIR / class_name
        if not folder.is_dir():
            continue
        paths.extend(
            p for p in sorted(folder.iterdir())
            if p.is_file() and p.suffix.lower() in config.IMAGE_EXTENSIONS
        )
    return paths


def group_exact(paths: list[Path]) -> dict[str, list[Path]]:
    groups: dict[str, list[Path]] = defaultdict(list)
    for path in paths:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        groups[digest].append(path)
    return groups


def group_perceptual(paths: list[Path], distance: int) -> list[list[Path]]:
    """Cluster by dhash. Distance 0 buckets exactly; above 0 compares pairwise."""
    hashes: dict[Path, int] = {}
    skipped = []
    for path in paths:
        value = dhash(path)
        if value is None:
            skipped.append(path)
        else:
            hashes[path] = value

    if skipped:
        print(f"  no usable perceptual hash: {len(skipped):,} file(s) "
              "(unreadable, or the hash described the resampling rather than "
              "the picture)")
        print("    these are still covered by the byte-identical check")

    if distance == 0:
        buckets: dict[int, list[Path]] = defaultdict(list)
        for path, value in hashes.items():
            buckets[value].append(path)
        return [sorted(group) for group in buckets.values() if len(group) > 1]

    # Above distance 0 every pair has to be compared. At ~19,000 images that is
    # about 180 million 64-bit XORs — a minute or so, and only when asked for.
    items = sorted(hashes.items())
    seen: set[Path] = set()
    clusters = []
    for index, (path, value) in enumerate(items):
        if path in seen:
            continue
        cluster = [path]
        for other_path, other_value in items[index + 1:]:
            if other_path in seen:
                continue
            if bin(value ^ other_value).count("1") <= distance:
                cluster.append(other_path)
                seen.add(other_path)
        if len(cluster) > 1:
            seen.add(path)
            clusters.append(sorted(cluster))
    return clusters


def resolve(cluster: list[Path]) -> tuple[list[Path], Path | None, bool]:
    """Return (paths to quarantine, surviving path, is_label_conflict).

    The survivor is None for a label conflict, because neither copy is kept.
    """
    classes = {path.parent.name for path in cluster}
    if len(classes) > 1:
        # The same picture carries two different labels. One is wrong, and
        # nothing here can say which, so neither is trusted.
        return list(cluster), None, True

    ordered = sorted(cluster, key=lambda p: (tier(source_of(p)), str(p)))
    return ordered[1:], ordered[0], False


def repoint_observations(replaced_by: dict) -> int:
    """Rewrite observations.csv so no row names a quarantined image.

    An observation is a (photograph, place, time) record, and 2,378 photographs
    carry 10,000 of them. Quarantining a duplicate without this leaves every
    observation that used it pointing at a file that no longer exists, and the
    multimodal loader dies on the first one. The surviving copy is the same
    picture, so the observation stays valid.

    Mapping chains are followed to the end: a file replaced by one that was
    itself replaced later resolves to the final survivor. A row whose image has
    no survivor (a label conflict) is dropped, since its label cannot be trusted.
    """
    import csv

    def key(path: Path) -> str:
        return path.resolve().relative_to(config.ML_ROOT).as_posix()

    final: dict[str, str | None] = {}
    for loser in replaced_by:
        seen, current = set(), loser
        while current in replaced_by and current not in seen:
            seen.add(current)
            current = replaced_by[current]
            if current is None:
                break
        final[key(loser)] = None if current is None else key(current)

    # The mapping is kept beside the quarantined files, so a move-back can be
    # audited and the survivors can be told apart from the rejects.
    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
    with open(QUARANTINE_DIR / "mapping.csv", "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["quarantined", "replaced_by"])
        writer.writerows((k, v or "") for k, v in sorted(final.items()))

    path = config.DATA_DIR / "observations.csv"
    if not path.exists():
        return 0
    with open(path, encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        rows = list(reader)

    kept, changed = [], 0
    for row in rows:
        if row["image"] in final:
            replacement = final[row["image"]]
            if replacement is None:
                continue
            row["image"] = replacement
            changed += 1
        kept.append(row)

    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(kept)
    if len(kept) != len(rows):
        print(f"   dropped {len(rows) - len(kept):,} observation row(s) whose image "
              "was a label conflict")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="move the duplicates; without it nothing changes")
    parser.add_argument("--distance", type=int, default=0,
                        help="maximum dhash Hamming distance, 0-8 (default 0)")
    parser.add_argument("--classes", nargs="*", default=config.FOCUS_CLASSES,
                        help="class folders to scan (default: the five focus classes)")
    args = parser.parse_args()

    if not 0 <= args.distance <= 8:
        print("❌ --distance must be between 0 and 8; above 8 it pairs "
              "different photographs of similar objects")
        return 1

    paths = collect(args.classes)
    if not paths:
        print(f"❌ no images found under {config.RAW_DIR} for {args.classes}")
        return 1
    print(f"scanning {len(paths):,} images in {', '.join(args.classes)}")

    exact = {d: g for d, g in group_exact(paths).items() if len(g) > 1}
    n_exact = sum(len(g) - 1 for g in exact.values())
    print(f"  byte-identical: {n_exact:,} redundant copies in {len(exact):,} groups")

    clusters = group_perceptual(paths, args.distance)
    label = "identical" if args.distance == 0 else f"within distance {args.distance}"
    print(f"  perceptually {label}: {len(clusters):,} groups")

    # The byte-identical groups are merged in rather than merely reported. A
    # file whose perceptual hash was rejected as degenerate has no cluster of
    # its own, so without this an exact duplicate of it would survive both
    # checks — caught by the first, discarded by the second.
    all_clusters = clusters + [sorted(group) for group in exact.values()]

    to_quarantine: list[Path] = []
    conflicts: list[list[Path]] = []
    replaced_by: dict[Path, Path | None] = {}
    for cluster in all_clusters:
        losers, survivor, is_conflict = resolve(cluster)
        to_quarantine.extend(losers)
        for loser in losers:
            replaced_by[loser] = survivor
        if is_conflict:
            conflicts.append(cluster)

    # One file can appear in several clusters once --distance is above 0.
    to_quarantine = sorted(set(to_quarantine))

    if conflicts:
        print(f"\n⚠️  {len(conflicts)} image(s) filed under two different classes.")
        print("    Both copies are quarantined: one of the two labels is wrong and")
        print("    this script cannot tell which. Look at these by hand.")
        for cluster in conflicts[:10]:
            pairs = " = ".join(f"{p.parent.name}/{p.name}" for p in cluster)
            print(f"      {pairs}")
        if len(conflicts) > 10:
            print(f"      … and {len(conflicts) - 10} more")

    per_class: dict[str, int] = defaultdict(int)
    for path in to_quarantine:
        per_class[path.parent.name] += 1

    print(f"\n{len(to_quarantine):,} file(s) to quarantine:")
    for class_name in args.classes:
        before = sum(1 for p in paths if p.parent.name == class_name)
        removed = per_class.get(class_name, 0)
        after = before - removed
        short = config.FOCUS_TARGET_PER_CLASS - after
        flag = f"  short {short:,}" if short > 0 else "  ✅"
        print(f"  {class_name:<10} {before:>6,} - {removed:>5,} = {after:>6,}{flag}")

    if not args.apply:
        print("\nreport only — nothing was moved. Re-run with --apply to act on it.")
        return 0

    moved = 0
    for path in to_quarantine:
        target_dir = QUARANTINE_DIR / path.parent.name
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / path.name
        if target.exists():
            continue
        shutil.move(str(path), str(target))
        moved += 1

    repointed = repoint_observations(replaced_by)
    print(f"\n✅ moved {moved:,} file(s) to {QUARANTINE_DIR}")
    print(f"   {repointed:,} observation row(s) repointed to the surviving copy")
    print("   nothing was deleted; move them back to undo this.")
    print("   next: python scripts/prepare_dataset.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
