"""Map a downloaded public dataset into our class folders.

    python scripts/ingest_public.py --source trashnet --path ~/Downloads/dataset-resized
    python scripts/ingest_public.py --source garbage12 --path ~/Downloads/garbage
    python scripts/ingest_public.py --source taco --path ~/Downloads/TACO/data

Public data supplies volume; the locally collected photographs supply realism. Both
are needed, and they are tagged differently in the manifest so the thesis can report
how the model performs on each.

Files are copied, never moved — the download stays intact so a mapping mistake can be
corrected by re-running rather than re-downloading.

**On TrashNet specifically:** every image is a single item on a plain white background.
Models reach 90%+ on it and then collapse on real photographs. It is useful for volume
and useless as a measure of anything. `--source trashnet` tags every file
`source=trashnet` so it can be excluded from the test split later.
"""

import argparse
import json
import shutil
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

# Folder name in the download -> our class. None means "discard": a category we
# cannot map honestly is dropped rather than forced into an approximate class.
MAPPINGS = {
    # TrashNet — 6 categories, plain white backgrounds
    "trashnet": {
        "plastic": "Plastic",
        "glass": "Glass",
        "metal": "Metal",
        "paper": "Paper",
        "cardboard": "Paper",
        "trash": None,  # a mixed bag by definition; forcing it would teach noise
    },
    # Kaggle "Garbage Classification" — 12 categories
    "garbage12": {
        "plastic": "Plastic",
        "white-glass": "Glass",
        "green-glass": "Glass",
        "brown-glass": "Glass",
        "metal": "Metal",
        "paper": "Paper",
        "cardboard": "Paper",
        "biological": "Organic",
        "clothes": "Textile",
        "shoes": "Textile",
        "battery": "Hazardous",
        "trash": None,
    },
    # TACO — litter in the wild. Its supercategory names vary by release, so this
    # covers the common ones; unmapped folders are reported, not guessed at.
    "taco": {
        "Bottle": "Plastic",
        "Bottle cap": "Plastic",
        "Plastic bag & wrapper": "Plastic",
        "Plastic container": "Plastic",
        "Plastic utensils": "Plastic",
        "Straw": "Plastic",
        "Lid": "Plastic",
        "Other plastic": "Plastic",
        "Styrofoam piece": "Plastic",
        "Can": "Metal",
        "Aluminium foil": "Metal",
        "Metal bottle cap": "Metal",
        "Scrap metal": "Metal",
        "Broken glass": "Glass",
        "Glass jar": "Glass",
        "Glass bottle": "Glass",
        "Paper": "Paper",
        "Carton": "Paper",
        "Paper bag": "Paper",
        "Cardboard": "Paper",
        "Food waste": "Organic",
        "Battery": "Hazardous",
        "Cigarette": None,  # too small to classify from a phone photo
        "Unlabeled litter": None,
    },
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, choices=sorted(MAPPINGS))
    parser.add_argument("--path", required=True, type=Path, help="the extracted download")
    parser.add_argument("--dest", type=Path, default=config.RAW_DIR)
    parser.add_argument("--limit-per-class", type=int, default=None,
                        help="cap per class, to stop one public set from dominating")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.path.exists():
        print(f"❌ {args.path} does not exist")
        return 1

    mapping = MAPPINGS[args.source]
    copied = Counter()
    skipped = Counter()
    unmapped = []
    metadata_rows = []

    for folder in sorted(p for p in args.path.rglob("*") if p.is_dir()):
        key = folder.name
        if key not in mapping:
            images = [f for f in folder.iterdir()
                      if f.is_file() and f.suffix.lower() in config.IMAGE_EXTENSIONS]
            if images:
                unmapped.append((key, len(images)))
            continue

        target_class = mapping[key]
        if target_class is None:
            n = sum(1 for f in folder.iterdir()
                    if f.is_file() and f.suffix.lower() in config.IMAGE_EXTENSIONS)
            skipped[key] += n
            continue

        dest_dir = args.dest / target_class
        if not args.dry_run:
            dest_dir.mkdir(parents=True, exist_ok=True)

        for image in sorted(folder.iterdir()):
            if not image.is_file() or image.suffix.lower() not in config.IMAGE_EXTENSIONS:
                continue
            if args.limit_per_class and copied[target_class] >= args.limit_per_class:
                break

            # Prefix with the source so provenance survives in the filename, and so a
            # public file can never collide with a locally collected one.
            new_name = f"{args.source}_{key.replace(' ', '-')}_{image.name}"
            if not args.dry_run:
                shutil.copy2(image, dest_dir / new_name)

            copied[target_class] += 1
            metadata_rows.append(
                {
                    "filename": new_name,
                    # Public images are single-shot, so each is its own group.
                    "object_id": f"{args.source}-{new_name}",
                    "source": args.source,
                }
            )

    print(f"\n{'(dry run) ' if args.dry_run else ''}from {args.source}:")
    for cls in config.MATERIAL_CLASSES:
        if copied[cls]:
            print(f"  {cls:<12} {copied[cls]:>6}")
    print(f"  {'TOTAL':<12} {sum(copied.values()):>6}")

    if skipped:
        print("\ndeliberately skipped (no honest mapping):")
        for key, n in skipped.items():
            print(f"  {key:<24} {n:>6}")

    if unmapped:
        print("\n⚠️  folders with images but no mapping — add them to MAPPINGS or ignore:")
        for key, n in unmapped[:15]:
            print(f"  {key:<24} {n:>6}")

    if not args.dry_run and metadata_rows:
        # Appended as JSONL so several ingests accumulate; merge_metadata folds these
        # into data/metadata.csv alongside the team's hand-recorded rows.
        out = config.DATA_DIR / "public_metadata.jsonl"
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "a", encoding="utf-8") as handle:
            for row in metadata_rows:
                handle.write(json.dumps(row) + "\n")
        print(f"\n💾 provenance appended to {out}")
        print("   next: python scripts/prepare_dataset.py")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
