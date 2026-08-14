"""Import a batch of freshly shot photographs into a class folder.

    python scripts/new_batch.py --class Plastic --collector HM --inbox ~/Desktop/today \
        --group-size 3 --condition crushed --background road --lighting sun --area street

Renames each photograph to `Class_Initials_Number.jpg`, copies it into
`data/raw/<Class>/`, and appends a row to `data/metadata.csv`.

Doing this by hand is where datasets go wrong. Filenames drift out of the agreed
pattern, numbers collide between collectors, and — the expensive one — `object_id`
gets forgotten, so three shots of one bottle become three unrelated rows and the
train/test split scatters them across all three splits. This script makes the
correct thing the easy thing.

Files are copied, never moved. The phone's copy stays where it is until the batch
has been checked with `scripts/check_dataset.py`.

## Grouping

`--group-size N` treats every N consecutive files (sorted by name, which for camera
output means by capture time) as shots of one physical object, and gives them one
shared `object_id`. Shoot one object, then the next; do not interleave.

Use `--group-size 1` when every photograph is a different object.

## Per-file metadata

The `--condition/--background/--lighting` flags apply to the whole batch, which is
right when a batch is one session in one place. Where they differ per shot, write a
sidecar CSV with `source_filename` plus any of those columns and pass `--sidecar`;
its values override the flags for the files it names.
"""

import argparse
import csv
import re
import shutil
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

FILENAME_RE = re.compile(config.FILENAME_PATTERN)


def next_number(class_dir: Path, class_name: str, initials: str) -> int:
    """One counter per (class, collector), continuing from what is already on disk.

    Scanning rather than storing a counter means an interrupted import, a manually
    deleted photograph, or a second machine cannot desynchronise the numbering.
    """
    highest = 0
    if not class_dir.exists():
        return 1

    for path in class_dir.iterdir():
        match = FILENAME_RE.match(path.stem)
        if match and match["cls"] == class_name and match["initials"] == initials:
            highest = max(highest, int(match["num"]))
    return highest + 1


def existing_object_ids(metadata_path: Path) -> set:
    if not metadata_path.exists():
        return set()
    with open(metadata_path, newline="", encoding="utf-8") as handle:
        return {row.get("object_id", "") for row in csv.DictReader(handle)}


def next_object_index(known: set, class_name: str, initials: str) -> int:
    """Object ids look like `HM-Plastic-007`; continue that collector's sequence."""
    pattern = re.compile(rf"^{re.escape(initials)}-{re.escape(class_name)}-(\d+)$")
    highest = 0
    for object_id in known:
        match = pattern.match(object_id or "")
        if match:
            highest = max(highest, int(match.group(1)))
    return highest + 1


def load_sidecar(path: Path) -> dict:
    """Per-file metadata overrides, keyed by the original filename."""
    overrides = {}
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if "source_filename" not in (reader.fieldnames or []):
            raise SystemExit(f"❌ {path} needs a 'source_filename' column")
        for row in reader:
            key = (row.get("source_filename") or "").strip()
            if key:
                overrides[key] = {
                    k: v.strip()
                    for k, v in row.items()
                    if k != "source_filename" and v and v.strip()
                }
    return overrides


def append_metadata(metadata_path: Path, rows: list) -> None:
    """Append, writing the header only when the file is new."""
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    is_new = not metadata_path.exists() or metadata_path.stat().st_size == 0
    with open(metadata_path, "a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=config.METADATA_COLUMNS)
        if is_new:
            writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--class", dest="class_name", required=True,
                        choices=config.CLASSES + [config.DOUBTFUL_DIR])
    parser.add_argument("--collector", required=True,
                        help="the collector's initials, e.g. HM")
    parser.add_argument("--inbox", required=True, type=Path,
                        help="folder of photographs to import")
    parser.add_argument("--group-size", type=int, default=1,
                        help="consecutive files that are shots of one object (default 1)")
    parser.add_argument("--condition", choices=config.CONDITIONS, default="clean")
    parser.add_argument("--background", choices=config.BACKGROUNDS, default="floor")
    parser.add_argument("--lighting", choices=config.LIGHTINGS, default="indoor")
    parser.add_argument("--area", choices=config.AREAS, default="home")
    parser.add_argument("--sidecar", type=Path,
                        help="CSV of per-file overrides, keyed by source_filename")
    parser.add_argument("--dest", type=Path, default=config.RAW_DIR)
    parser.add_argument("--metadata", type=Path, default=config.METADATA_PATH)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    initials = args.collector.strip().upper()
    if not re.fullmatch(r"[A-Z]{2,4}", initials):
        print(f"❌ --collector must be 2-4 letters, got {args.collector!r}")
        return 1

    if args.group_size < 1:
        print("❌ --group-size must be at least 1")
        return 1
    if args.group_size > config.MAX_SHOTS_PER_OBJECT:
        print(f"❌ policy allows at most {config.MAX_SHOTS_PER_OBJECT} shots of one "
              f"object; --group-size {args.group_size} would break it")
        return 1

    if not args.inbox.is_dir():
        print(f"❌ {args.inbox} is not a folder")
        return 1

    images = sorted(p for p in args.inbox.iterdir()
                    if p.is_file() and p.suffix.lower() in config.IMAGE_EXTENSIONS)
    if not images:
        print(f"❌ no images in {args.inbox}")
        return 1

    remainder = len(images) % args.group_size
    if remainder:
        print(f"⚠️  {len(images)} images is not a multiple of --group-size "
              f"{args.group_size}; the last {remainder} will form a short group.")

    overrides = load_sidecar(args.sidecar) if args.sidecar else {}
    unknown_sidecar = set(overrides) - {p.name for p in images}
    if unknown_sidecar:
        print(f"⚠️  sidecar names {len(unknown_sidecar)} file(s) not in the inbox, "
              f"e.g. {sorted(unknown_sidecar)[0]}")

    class_dir = args.dest / args.class_name
    number = next_number(class_dir, args.class_name, initials)
    known_ids = existing_object_ids(args.metadata)
    object_index = next_object_index(known_ids, args.class_name, initials)

    rows = []
    planned = []
    for position, image in enumerate(images):
        if position % args.group_size == 0 and position:
            object_index += 1
        object_id = f"{initials}-{args.class_name}-{object_index:03d}"

        new_name = f"{args.class_name}_{initials}_{number:04d}{image.suffix.lower()}"
        number += 1

        override = overrides.get(image.name, {})
        row = {
            "filename": new_name,
            "object_id": object_id,
            "condition": override.get("condition", args.condition),
            "background": override.get("background", args.background),
            "lighting": override.get("lighting", args.lighting),
            "collector": initials,
            "area": override.get("area", args.area),
            "source": "local",
        }

        invalid = [
            f"{field}={row[field]!r}"
            for field, allowed in (
                ("condition", config.CONDITIONS),
                ("background", config.BACKGROUNDS),
                ("lighting", config.LIGHTINGS),
                ("area", config.AREAS),
            )
            if row[field] not in allowed
        ]
        if invalid:
            print(f"❌ sidecar gives {image.name} unrecognised values: {', '.join(invalid)}")
            return 1

        rows.append(row)
        planned.append((image, class_dir / new_name))

    collision = [dest for _, dest in planned if dest.exists()]
    if collision:
        print(f"❌ {len(collision)} target filename(s) already exist, e.g. {collision[0].name}."
              "\n   Numbering is derived from the folder, so this means two imports are"
              "\n   running at once or files were added by hand. Nothing was written.")
        return 1

    print(f"\n{'(dry run) ' if args.dry_run else ''}{args.class_name} · collector {initials}")
    print(f"  {len(planned)} photographs, "
          f"{len({r['object_id'] for r in rows})} object(s)")
    print(f"  {planned[0][0].name} -> {planned[0][1].name}")
    if len(planned) > 1:
        print(f"  {planned[-1][0].name} -> {planned[-1][1].name}")

    conditions = Counter(row["condition"] for row in rows)
    print(f"  conditions: {', '.join(f'{k}×{v}' for k, v in conditions.most_common())}")

    if args.dry_run:
        print("\nnothing written. Drop --dry-run to import.")
        return 0

    class_dir.mkdir(parents=True, exist_ok=True)
    for src, dest in planned:
        shutil.copy2(src, dest)
    append_metadata(args.metadata, rows)

    print(f"\n💾 copied into {class_dir}")
    print(f"💾 {len(rows)} rows appended to {args.metadata}")
    print("   next: python scripts/check_dataset.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
