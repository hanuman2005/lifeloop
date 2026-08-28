"""Add a Pascal VOC annotated folder to the YOLO detection set.

    python scripts/ingest_voc_detection.py --path household_trash_images_annotation \
        --prefix household
    python scripts/ingest_voc_detection.py --path <folder> --prefix household --dry-run

`prepare_detection.py` builds data/detection from TACO's COCO annotations. This adds
a second kind of source: a flat folder of `<name>.jpg` beside `<name>.xml` in Pascal
VOC form, which is what most hand-annotated waste sets ship as. Files are appended to
the existing splits rather than replacing them, so running this does not discard the
TACO images already there.

## Every box becomes class 0

Same reasoning as prepare_detection.py: the detector answers "is this a discardable
object", and the classifier answers what it is made of. A VOC set whose only label is
`household_trash` carries no material information anyway.

## EXIF orientation is the trap here

The annotation tool wrote box coordinates against the *displayed* image, so the size
in the XML is the rotated size. A phone photograph with EXIF orientation 6 is stored
4000x3000 and displayed 3000x4000, and normalising the boxes by the stored size puts
every one of them in the wrong place — silently, because the numbers stay in range.

So the image is EXIF-transposed on the way in and written back without the tag. After
that the pixels match the XML, and the check below refuses any file where they still
do not.

## Images are downscaled

Phone originals here are ~2.4 MB each and the detector trains at 640. Long edge is
capped so the folder does not carry gigabytes for no gain.
"""

import argparse
import random
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

DETECTION_DIR = config.DATA_DIR / "detection"

# Matches prepare_detection.py, so a box that is useless there is useless here.
MIN_BOX_AREA_SHARE = 0.002

# The detector trains at 640. Anything past this is bytes on disk, not signal.
MAX_EDGE = 1280

SPLIT_RATIOS = config.SPLIT_RATIOS


def read_boxes(xml_path: Path):
    """Return (width, height, [(xmin, ymin, xmax, ymax), ...]) from a VOC file."""
    root = ET.parse(xml_path).getroot()
    size = root.find("size")
    width = int(float(size.find("width").text))
    height = int(float(size.find("height").text))

    boxes = []
    for obj in root.findall("object"):
        # `difficult` is the VOC convention for "annotated but not expected to be
        # detected". Keeping those would penalise the model for the annotator's own
        # judgement that the object is barely visible.
        if (obj.findtext("difficult") or "0").strip() == "1":
            continue
        node = obj.find("bndbox")
        if node is None:
            continue
        boxes.append(tuple(float(node.findtext(k)) for k in ("xmin", "ymin", "xmax", "ymax")))

    return width, height, boxes


def to_yolo(box, width, height):
    """VOC corners to YOLO centre/size, normalised. None if the box is unusable."""
    xmin, ymin, xmax, ymax = box
    xmin, xmax = sorted((max(0.0, xmin), min(float(width), xmax)))
    ymin, ymax = sorted((max(0.0, ymin), min(float(height), ymax)))

    box_width = xmax - xmin
    box_height = ymax - ymin
    if box_width <= 1 or box_height <= 1:
        return None

    if (box_width * box_height) / (width * height) < MIN_BOX_AREA_SHARE:
        return None

    return (
        (xmin + box_width / 2) / width,
        (ymin + box_height / 2) / height,
        box_width / width,
        box_height / height,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", type=Path, required=True,
                        help="folder holding <name>.jpg beside <name>.xml")
    parser.add_argument("--prefix", required=True,
                        help="filename prefix, so this source stays identifiable "
                             "in data/detection and cannot collide with TACO's")
    parser.add_argument("--seed", type=int, default=config.SPLIT_SEED)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    from PIL import Image, ImageOps

    if not args.path.is_dir():
        print(f"❌ not a directory: {args.path}")
        return 1

    pairs = []
    for xml_path in sorted(args.path.glob("*.xml")):
        image_path = xml_path.with_suffix(".jpg")
        if image_path.exists():
            pairs.append((image_path, xml_path))

    if not pairs:
        print(f"❌ no .jpg/.xml pairs in {args.path}")
        return 1

    # Split by image before anything is written. Two boxes from one photograph in
    # two different splits would make the test score measure memorisation.
    order = list(range(len(pairs)))
    random.Random(args.seed).shuffle(order)
    n_train = int(len(order) * SPLIT_RATIOS["train"])
    n_val = int(len(order) * SPLIT_RATIOS["val"])
    split_of = {}
    for rank, index in enumerate(order):
        split_of[index] = (
            "train" if rank < n_train
            else "val" if rank < n_train + n_val
            else "test"
        )

    stats = {"train": 0, "val": 0, "test": 0}
    boxes_written = 0
    dropped_small = 0
    skipped = []

    for index, (image_path, xml_path) in enumerate(pairs):
        try:
            declared_width, declared_height, boxes = read_boxes(xml_path)
        except ET.ParseError as error:
            skipped.append(f"{xml_path.name}: unreadable XML ({error})")
            continue

        if not boxes:
            skipped.append(f"{xml_path.name}: no usable boxes")
            continue

        with Image.open(image_path) as opened:
            # Bakes the EXIF rotation into the pixels, which is what the annotation
            # coordinates were drawn against.
            image = ImageOps.exif_transpose(opened).convert("RGB")

        if (image.width, image.height) != (declared_width, declared_height):
            skipped.append(
                f"{image_path.name}: size mismatch after EXIF transpose "
                f"(xml {declared_width}x{declared_height}, image {image.width}x{image.height})"
            )
            continue

        rows = []
        for box in boxes:
            converted = to_yolo(box, image.width, image.height)
            if converted is None:
                dropped_small += 1
                continue
            rows.append("0 " + " ".join(f"{v:.6f}" for v in converted))

        if not rows:
            skipped.append(f"{image_path.name}: every box below {MIN_BOX_AREA_SHARE:.1%} of frame")
            continue

        split = split_of[index]
        stats[split] += 1
        boxes_written += len(rows)

        if args.dry_run:
            continue

        stem = f"{args.prefix}_{index:06d}"
        image_out = DETECTION_DIR / "images" / split / f"{stem}.jpg"
        label_out = DETECTION_DIR / "labels" / split / f"{stem}.txt"
        image_out.parent.mkdir(parents=True, exist_ok=True)
        label_out.parent.mkdir(parents=True, exist_ok=True)

        scale = min(1.0, MAX_EDGE / max(image.width, image.height))
        if scale < 1.0:
            image = image.resize(
                (round(image.width * scale), round(image.height * scale)),
                Image.LANCZOS,
            )

        # Saved without the EXIF block: the rotation is in the pixels now, and
        # leaving the tag would make Ultralytics rotate it a second time.
        image.save(image_out, "JPEG", quality=88)
        label_out.write_text("\n".join(rows) + "\n", encoding="utf-8")

    print()
    print(f"{'would add' if args.dry_run else 'added'} from {args.path.name}:")
    for split in ("train", "val", "test"):
        print(f"  {split:6} {stats[split]:4} images")
    print(f"  {boxes_written} boxes, all class 0 (waste)")
    if dropped_small:
        print(f"  {dropped_small} boxes dropped below {MIN_BOX_AREA_SHARE:.1%} of the frame")

    if skipped:
        print(f"\n⚠️  skipped {len(skipped)} files:")
        for line in skipped[:10]:
            print(f"   {line}")
        if len(skipped) > 10:
            print(f"   … and {len(skipped) - 10} more")

    if not args.dry_run:
        for split in ("train", "val", "test"):
            total = len(list((DETECTION_DIR / "images" / split).glob("*.jpg")))
            print(f"  data/detection now holds {total:4} {split} images")
        print("\n   next: python scripts/train_detector.py")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
