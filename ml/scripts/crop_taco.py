"""Turn TACO's detection annotations into single-item crops we can classify.

    python scripts/crop_taco.py --annotations ~/Downloads/TACO/data/annotations.json \
        --out ~/Downloads/taco_crops --limit Plastic=40 --limit Metal=25

TACO is the only public source whose photographs look like the ones the app receives —
litter on real ground, in real light, dirty and crushed. It is also the only one that
cannot be used as it ships: it is a detection dataset, so a single photograph holds
several objects of several materials, and dropping it whole into a class folder would
label every one of them the same.

This crops each annotation into its own image, so one photograph becomes several
single-item pictures, each honestly labelled. Crops are written into folders named
after TACO's own supercategories, which is what `ingest_public.py --source taco`
already knows how to map:

    python scripts/crop_taco.py --out ~/Downloads/taco_crops --limit Plastic=40
    python scripts/ingest_public.py --source taco --path ~/Downloads/taco_crops

Images are fetched from Flickr on demand and only for the annotations actually
selected, so a run that needs 120 crops downloads roughly 100 photographs rather than
all 1,500.

## What gets rejected, and why

The labelling policy says one item per photograph, filling 50–80% of the frame. A
mechanical crop satisfies neither by default, so three filters apply:

- **Too small.** A 40-pixel bottle cap upscaled to 224 is a smear. Annotations below
  `--min-side` pixels, or below `--min-area-share` of the photograph, are dropped.
- **Not alone.** The crop is padded to put the item at roughly 70% of the frame, which
  can pull in a neighbouring object. If another annotation covers more than
  `--max-neighbour-share` of the padded box, the crop breaks the one-item rule and is
  dropped.
- **Unmappable.** Categories `ingest_public.py` maps to None — `Cigarette`, `Cup`,
  `Unlabeled litter` — are never cropped.

Rejections are counted and reported. A class that yields far less than asked is
usually genuinely thin in TACO rather than a bug: it has 8 `Food waste` annotations and
2 `Battery` in 1,500 photographs.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from io import BytesIO
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

from ingest_public import MAPPINGS  # noqa: E402  — one mapping, not two

enable_utf8()

TACO_MAP = MAPPINGS["taco"]

# The item should fill 50-80% of the frame. Padding the annotation box by this factor
# puts it near 70%, inside the policy's range at both extremes of box shape.
FRAME_PADDING = 1.45

USER_AGENT = "lifeloop-dataset-builder/1.0 (academic use)"


def fetch(url: str, timeout: int) -> Image.Image:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return Image.open(BytesIO(response.read())).convert("RGB")


def padded_box(bbox, width: int, height: int):
    """The annotation box grown around its centre, clipped to the photograph."""
    x, y, w, h = bbox
    cx, cy = x + w / 2, y + h / 2
    half_w, half_h = w * FRAME_PADDING / 2, h * FRAME_PADDING / 2
    return (
        max(0, int(cx - half_w)),
        max(0, int(cy - half_h)),
        min(width, int(cx + half_w)),
        min(height, int(cy + half_h)),
    )


def overlap_share(box, bbox) -> float:
    """How much of `box` is covered by the annotation `bbox`."""
    left, top, right, bottom = box
    x, y, w, h = bbox
    inter_w = max(0, min(right, x + w) - max(left, x))
    inter_h = max(0, min(bottom, y + h) - max(top, y))
    area = (right - left) * (bottom - top)
    return (inter_w * inter_h / area) if area else 0.0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--annotations", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--limit", action="append", metavar="Class=N", default=[],
                        help="crops wanted per our class, repeatable")
    parser.add_argument("--min-side", type=int, default=120,
                        help="reject annotations narrower or shorter than this (pixels)")
    parser.add_argument("--min-area-share", type=float, default=0.015,
                        help="reject annotations smaller than this share of the photograph")
    parser.add_argument("--max-neighbour-share", type=float, default=0.12,
                        help="reject a crop if another object covers this much of it")
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    limits = {}
    for item in args.limit:
        class_name, _, value = item.partition("=")
        if class_name not in config.CLASSES or not value.isdigit():
            print(f"❌ --limit {item!r} must be Class=N, e.g. Plastic=40")
            return 1
        limits[class_name] = int(value)
    if not limits:
        print("❌ nothing to do: pass at least one --limit Class=N")
        return 1

    data = json.loads(args.annotations.read_text(encoding="utf-8"))
    supercategory = {c["id"]: c["supercategory"] for c in data["categories"]}
    images = {img["id"]: img for img in data["images"]}

    by_image = defaultdict(list)
    for annotation in data["annotations"]:
        by_image[annotation["image_id"]].append(annotation)

    # Photographs with fewer objects give cleaner crops, so take them first. Within
    # that, the order is the file's own, which is not sorted by anything meaningful.
    order = sorted(by_image, key=lambda image_id: len(by_image[image_id]))

    written = Counter()
    rejected = Counter()
    downloaded = 0
    failed = []

    for image_id in order:
        if all(written[cls] >= want for cls, want in limits.items()):
            break

        info = images[image_id]
        annotations = by_image[image_id]

        wanted = []
        for annotation in annotations:
            folder = supercategory[annotation["category_id"]]
            target = TACO_MAP.get(folder)
            if target is None:
                rejected["category not mapped"] += 1
                continue
            if written[target] >= limits.get(target, 0):
                continue

            x, y, w, h = annotation["bbox"]
            if w < args.min_side or h < args.min_side:
                rejected["object too small"] += 1
                continue
            if (w * h) / (info["width"] * info["height"]) < args.min_area_share:
                rejected["object too small a share of the photograph"] += 1
                continue

            box = padded_box(annotation["bbox"], info["width"], info["height"])
            crowded = any(
                overlap_share(box, other["bbox"]) > args.max_neighbour_share
                for other in annotations if other is not annotation
            )
            if crowded:
                rejected["another object in the frame"] += 1
                continue

            wanted.append((folder, target, box, annotation["id"]))

        if not wanted:
            continue

        if args.dry_run:
            for folder, target, _, _ in wanted:
                written[target] += 1
            continue

        url = info.get("flickr_url") or info.get("coco_url") or info.get("flickr_640_url")
        try:
            photo = fetch(url, args.timeout)
        except (urllib.error.URLError, OSError, ValueError) as error:
            failed.append(f"{info['file_name']}: {error}")
            continue
        downloaded += 1

        # The annotation coordinates are in the original resolution; Flickr may return
        # a resized copy, so rescale rather than cropping the wrong region.
        scale_x = photo.width / info["width"]
        scale_y = photo.height / info["height"]

        for folder, target, box, annotation_id in wanted:
            left, top, right, bottom = box
            scaled = (int(left * scale_x), int(top * scale_y),
                      int(right * scale_x), int(bottom * scale_y))
            if scaled[2] - scaled[0] < 32 or scaled[3] - scaled[1] < 32:
                rejected["crop degenerate after rescaling"] += 1
                continue

            out_dir = args.out / folder
            out_dir.mkdir(parents=True, exist_ok=True)
            photo.crop(scaled).save(out_dir / f"taco_{annotation_id:05d}.jpg", quality=92)
            written[target] += 1

        done = sum(written.values())
        if done and done % 20 == 0:
            print(f"  … {done} crops from {downloaded} photographs")

    print(f"\n{'(dry run) ' if args.dry_run else ''}crops written:")
    for cls, want in sorted(limits.items()):
        short = "  ← short" if written[cls] < want else ""
        print(f"  {cls:<12} {written[cls]:>4} of {want}{short}")
    print(f"  {'TOTAL':<12} {sum(written.values()):>4}"
          f"{'' if args.dry_run else f'  from {downloaded} photographs'}")

    if rejected:
        print("\nrejected (the one-item and legibility rules):")
        for reason, count in rejected.most_common():
            print(f"  {reason:<44} {count:>5}")

    if failed:
        print(f"\n⚠️  {len(failed)} photograph(s) could not be fetched — TACO's Flickr "
              f"links rot over time:")
        for line in failed[:5]:
            print(f"     {line}")

    if not args.dry_run and sum(written.values()):
        print(f"\n💾 {args.out}")
        print(f"   next: python scripts/ingest_public.py --source taco --path {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
