"""Crop Open Images boxes into the two classes no waste dataset covers.

    python scripts/crop_openimages.py --annotations validation-bbox.csv \
        --out openimages_crops --limit Electronic=120 --limit NotWaste=120

TrashNet, garbage12 and TACO between them have no electronics beyond batteries, no
wood scrap, and — obviously — no photographs of things that are not rubbish. Open
Images V7 has both of the ones that can be sourced: nine consumer-electronics classes,
and everyday objects and scenes for `NotWaste`.

Needs no account. The annotation CSV is a public Google Cloud Storage object and the
photographs come from a public S3 bucket:

    curl -L -o validation-bbox.csv \\
        https://storage.googleapis.com/openimages/v5/validation-annotations-bbox.csv

The validation split alone holds about 430 usable electronics boxes and 2,200 usable
NotWaste boxes, so the much larger train split is never needed.

## What this data is, and is not

Open Images is not a waste dataset. Its keyboards are working keyboards on desks, its
televisions are televisions in living rooms. A keyboard is Electronic whether or not it
has been thrown away, so the label is honest — but the dirt, damage and floor-level
framing of real discarded electronics are missing entirely.

That is exactly why `prepare_dataset.py` keeps every public image out of validation and
test. These images teach the network what a keyboard looks like; only the photographs
the team shoots can measure whether it recognises a dead one on a hostel floor.

`NotWaste` is the happier case: that class only needs things that are not discardable
items, and a houseplant in a living room is precisely that.

## Filters

The same three as `crop_taco.py` — too small, not alone in the frame, unmappable
category — plus two specific to Open Images:

- `IsDepiction=1` boxes are drawings, paintings and photographs of photographs. A
  cartoon television is not a television.
- `IsGroupOf=1` boxes cover a heap of objects rather than one, which breaks the
  one-item rule at the annotation level.

`--max-per-category` stops one common class swamping the others: Open Images has 147
Camera boxes and 9 Remote control boxes, and without a cap Electronic would be mostly
cameras.
"""

import argparse
import csv
import sys
import urllib.error
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

from ingest_public import MAPPINGS  # noqa: E402
from crop_taco import fetch, overlap_share, padded_box  # noqa: E402  — one definition

enable_utf8()

OPEN_IMAGES_MAP = MAPPINGS["openimages"]

# Open Images identifies classes by machine id; the CSV never spells them out.
# These are the ids for the classes in MAPPINGS["openimages"], from
# oidv7-class-descriptions-boxable.csv.
LABEL_IDS = {
    "/m/01m2v": "Computer keyboard",
    "/m/020lf": "Computer mouse",
    "/m/050k8": "Mobile phone",
    "/m/01c648": "Laptop",
    "/m/01m4t": "Printer",
    "/m/07c52": "Television",
    "/m/0qjjc": "Remote control",
    "/m/01b7fy": "Headphones",
    "/m/0dv5r": "Camera",
    "/m/03fp41": "Houseplant",
    "/m/07j7r": "Tree",
    "/m/01mzpv": "Chair",
    "/m/02dgv": "Door",
    "/m/04bcr3": "Table",
    "/m/0bt_c3": "Book",
}

IMAGE_URL = "https://open-images-dataset.s3.amazonaws.com/{split}/{image_id}.jpg"


def to_pixels(row: dict, width: int, height: int):
    """Open Images stores XMin/XMax/YMin/YMax as fractions; we want x, y, w, h."""
    x_min = float(row["XMin"]) * width
    x_max = float(row["XMax"]) * width
    y_min = float(row["YMin"]) * height
    y_max = float(row["YMax"]) * height
    return [x_min, y_min, x_max - x_min, y_max - y_min]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--annotations", type=Path, required=True,
                        help="validation-annotations-bbox.csv")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--split", default="validation", choices=["validation", "test"],
                        help="which bucket the annotations came from")
    parser.add_argument("--limit", action="append", metavar="Class=N", default=[],
                        help="crops wanted per our class, repeatable")
    parser.add_argument("--max-per-category", type=int, default=20,
                        help="cap per Open Images class, so one does not swamp the rest")
    parser.add_argument("--min-side", type=int, default=120)
    parser.add_argument("--min-area-share", type=float, default=0.10,
                        help="higher than crop_taco's: these are objects in scenes, and "
                             "a small one is mostly background")
    parser.add_argument("--max-neighbour-share", type=float, default=0.12)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    limits = {}
    for item in args.limit:
        class_name, _, value = item.partition("=")
        if class_name not in config.CLASSES or not value.isdigit():
            print(f"❌ --limit {item!r} must be Class=N, e.g. Electronic=120")
            return 1
        limits[class_name] = int(value)
    if not limits:
        print("❌ nothing to do: pass at least one --limit Class=N")
        return 1

    wanted_ids = {
        label_id: name for label_id, name in LABEL_IDS.items()
        if OPEN_IMAGES_MAP.get(name) in limits
    }
    if not wanted_ids:
        print(f"❌ no Open Images category maps to {sorted(limits)}")
        return 1

    # Pass 1: which photographs hold a box we want, big enough to be worth cropping.
    candidates = defaultdict(list)
    with open(args.annotations, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["LabelName"] not in wanted_ids:
                continue
            if row["IsDepiction"] == "1" or row["IsGroupOf"] == "1":
                continue
            share = ((float(row["XMax"]) - float(row["XMin"]))
                     * (float(row["YMax"]) - float(row["YMin"])))
            if share < args.min_area_share:
                continue
            candidates[row["ImageID"]].append(row)

    # Pass 2: every box in those photographs, so the one-item check sees the neighbours
    # too — including objects of classes we are not collecting.
    all_boxes = defaultdict(list)
    with open(args.annotations, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["ImageID"] in candidates:
                all_boxes[row["ImageID"]].append(row)

    print(f"📖 {len(candidates)} candidate photographs")

    # Fewer objects in the photograph means a cleaner crop, so take those first.
    order = sorted(candidates, key=lambda image_id: len(all_boxes[image_id]))

    written = Counter()
    per_category = Counter()
    rejected = Counter()
    downloaded = 0
    failed = []

    for image_id in order:
        if all(written[cls] >= want for cls, want in limits.items()):
            break

        selected = []
        for row in candidates[image_id]:
            category = wanted_ids[row["LabelName"]]
            target = OPEN_IMAGES_MAP[category]
            if written[target] >= limits[target]:
                continue
            if per_category[category] >= args.max_per_category:
                rejected[f"{category} cap reached"] += 1
                continue
            selected.append((category, target, row))

        if not selected:
            continue

        if args.dry_run:
            for category, target, _ in selected:
                written[target] += 1
                per_category[category] += 1
            continue

        url = IMAGE_URL.format(split=args.split, image_id=image_id)
        try:
            photo = fetch(url, args.timeout)
        except (urllib.error.URLError, OSError, ValueError) as error:
            failed.append(f"{image_id}: {error}")
            continue
        downloaded += 1

        neighbours = [to_pixels(r, photo.width, photo.height) for r in all_boxes[image_id]]

        for index, (category, target, row) in enumerate(selected):
            bbox = to_pixels(row, photo.width, photo.height)
            if bbox[2] < args.min_side or bbox[3] < args.min_side:
                rejected["object too small"] += 1
                continue

            box = padded_box(bbox, photo.width, photo.height)
            crowded = any(
                overlap_share(box, other) > args.max_neighbour_share
                for other in neighbours
                if other != bbox
            )
            if crowded:
                rejected["another object in the frame"] += 1
                continue

            out_dir = args.out / category
            out_dir.mkdir(parents=True, exist_ok=True)
            photo.crop(box).save(out_dir / f"oi_{image_id}_{index}.jpg", quality=92)
            written[target] += 1
            per_category[category] += 1

        done = sum(written.values())
        if done and done % 25 == 0:
            print(f"  … {done} crops from {downloaded} photographs")

    print(f"\n{'(dry run) ' if args.dry_run else ''}crops written:")
    for cls, want in sorted(limits.items()):
        short = "  ← short" if written[cls] < want else ""
        print(f"  {cls:<12} {written[cls]:>4} of {want}{short}")
    print(f"  {'TOTAL':<12} {sum(written.values()):>4}"
          f"{'' if args.dry_run else f'  from {downloaded} photographs'}")

    if per_category:
        print("\nspread across Open Images categories:")
        for category, count in per_category.most_common():
            print(f"  {category:<20} {count:>4}")

    if rejected:
        print("\nrejected:")
        for reason, count in rejected.most_common():
            print(f"  {reason:<36} {count:>5}")

    if failed:
        print(f"\n⚠️  {len(failed)} photograph(s) could not be fetched:")
        for line in failed[:5]:
            print(f"     {line}")

    if not args.dry_run and sum(written.values()):
        print(f"\n💾 {args.out}")
        print(f"   next: python scripts/ingest_public.py --source openimages "
              f"--path {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
