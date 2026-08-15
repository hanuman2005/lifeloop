"""Turn TACO's COCO annotations into a YOLO detection dataset.

    python scripts/prepare_detection.py --limit 600
    python scripts/prepare_detection.py --limit 1500 --workers 12

Produces data/detection/{images,labels}/{train,val,test} plus a data.yaml that
Ultralytics can train from directly.

## Why one class

The detector is trained class-agnostic: every annotation becomes class 0,
"waste item". TACO has 60 categories across 4,784 boxes, roughly 80 per category
and far fewer for most of them — nowhere near enough to learn what a thing is
*made of*. But "is this a discardable object" is one question with 4,784 examples,
which is a reasonable amount.

The material question is already answered by the classifier, trained on 790
images. Splitting the problem this way plays to what each model has data for:

    photo → detector (where are the items) → crop each → classifier (what is it)

Asking the detector to also predict materials would make it worse at both.

## Images

TACO does not redistribute photographs; the annotations carry Flickr URLs and the
images are fetched on demand. `--limit` caps how many are downloaded, since the
full set is about 1,500 files and several gigabytes.

Splits are by image, never by annotation. Two boxes from the same photograph must
never land in different splits, or the test score measures memorisation.
"""

import argparse
import json
import random
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

DETECTION_DIR = config.DATA_DIR / "detection"

# Categories that cannot be detected usefully from a phone photograph, or that
# are not discardable items at all. Excluded so the detector is not taught to
# fire on things the product will never ask about.
EXCLUDED_CATEGORIES = {"Cigarette", "Unlabeled litter"}

# Boxes below this share of the image are too small to survive the crop-and-
# classify step: a 20-pixel fragment upscaled to 224 is a smear, and the
# classifier would be asked to label noise.
MIN_BOX_AREA_SHARE = 0.002


def download(url: str, destination: Path, timeout: int = 30) -> bool:
    if destination.exists() and destination.stat().st_size > 0:
        return True
    try:
        request = Request(url, headers={"User-Agent": "lifeloop-research/1.0"})
        with urlopen(request, timeout=timeout) as response:
            payload = response.read()
        if len(payload) < 1024:
            return False
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload)
        return True
    except Exception:
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--annotations", type=Path, default=config.ML_ROOT / "taco-annotations.json")
    parser.add_argument("--limit", type=int, default=600, help="how many images to fetch")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--seed", type=int, default=config.SPLIT_SEED)
    args = parser.parse_args()

    if not args.annotations.exists():
        print(f"❌ {args.annotations} not found. Fetch it with:")
        print("   curl -L -o taco-annotations.json \\")
        print("     https://raw.githubusercontent.com/pedropro/TACO/master/data/annotations.json")
        return 1

    coco = json.loads(args.annotations.read_text(encoding="utf-8"))

    categories = {c["id"]: c["name"] for c in coco["categories"]}
    excluded_ids = {i for i, name in categories.items() if name in EXCLUDED_CATEGORIES}

    images = {image["id"]: image for image in coco["images"]}

    boxes_by_image = defaultdict(list)
    dropped_small = 0
    dropped_category = 0

    for annotation in coco["annotations"]:
        if annotation.get("iscrowd"):
            continue
        if annotation["category_id"] in excluded_ids:
            dropped_category += 1
            continue

        image = images.get(annotation["image_id"])
        if not image:
            continue

        x, y, width, height = annotation["bbox"]
        if width <= 1 or height <= 1:
            continue

        if (width * height) / (image["width"] * image["height"]) < MIN_BOX_AREA_SHARE:
            dropped_small += 1
            continue

        boxes_by_image[annotation["image_id"]].append((x, y, width, height))

    usable = [image_id for image_id, boxes in boxes_by_image.items() if boxes]
    print(f"\n📖 {len(coco['images'])} images, {len(coco['annotations'])} annotations")
    print(f"   {len(usable)} images have usable boxes")
    print(f"   dropped {dropped_small} boxes below {MIN_BOX_AREA_SHARE:.1%} of the frame")
    print(f"   dropped {dropped_category} in excluded categories: {', '.join(sorted(EXCLUDED_CATEGORIES))}")

    random.Random(args.seed).shuffle(usable)
    selected = usable[: args.limit]

    # Split by image, so boxes from one photograph stay together.
    n_test = max(1, int(len(selected) * config.SPLIT_RATIOS["test"]))
    n_val = max(1, int(len(selected) * config.SPLIT_RATIOS["val"]))
    split_of = {}
    for index, image_id in enumerate(selected):
        if index < n_test:
            split_of[image_id] = "test"
        elif index < n_test + n_val:
            split_of[image_id] = "val"
        else:
            split_of[image_id] = "train"

    for split in ("train", "val", "test"):
        (DETECTION_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (DETECTION_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    print(f"\n⬇️  fetching {len(selected)} images with {args.workers} workers")

    def fetch(image_id):
        image = images[image_id]
        split = split_of[image_id]
        name = image["file_name"].replace("/", "_")
        target = DETECTION_DIR / "images" / split / name

        # The 640px variant is plenty for training at 640 and far quicker to pull
        # than the originals, which run to several megabytes each.
        url = image.get("flickr_640_url") or image.get("flickr_url") or image.get("coco_url")
        if not download(url, target):
            return None

        lines = []
        for x, y, width, height in boxes_by_image[image_id]:
            # COCO gives top-left plus size in pixels; YOLO wants a normalised
            # centre plus size, and clamping matters because a few TACO boxes
            # run a pixel or two past the edge.
            cx = min(max((x + width / 2) / image["width"], 0.0), 1.0)
            cy = min(max((y + height / 2) / image["height"], 0.0), 1.0)
            nw = min(width / image["width"], 1.0)
            nh = min(height / image["height"], 1.0)
            lines.append(f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

        label_path = DETECTION_DIR / "labels" / split / f"{Path(name).stem}.txt"
        label_path.write_text("\n".join(lines), encoding="utf-8")
        return split

    counts = defaultdict(int)
    failures = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for done, result in enumerate(pool.map(fetch, selected), start=1):
            if result:
                counts[result] += 1
            else:
                failures += 1
            if done % 50 == 0:
                print(f"   {done}/{len(selected)}  ok={sum(counts.values())} failed={failures}")

    print(f"\n📊 train {counts['train']} · val {counts['val']} · test {counts['test']}")
    if failures:
        print(f"   {failures} images could not be fetched (dead Flickr links are normal)")

    total_boxes = sum(len(boxes_by_image[i]) for i in selected)
    print(f"   {total_boxes} boxes, {total_boxes / max(1, sum(counts.values())):.2f} per image")

    yaml_path = DETECTION_DIR / "data.yaml"
    yaml_path.write_text(
        "\n".join(
            [
                f"path: {DETECTION_DIR.as_posix()}",
                "train: images/train",
                "val: images/val",
                "test: images/test",
                "",
                "nc: 1",
                "names:",
                "  0: waste",
                "",
                "# Class-agnostic by design. TACO's 60 categories average ~80 boxes each,",
                "# too few to learn materials from; the classifier answers that question",
                "# instead, trained on a separate and larger set.",
            ]
        ),
        encoding="utf-8",
    )

    print(f"\n💾 {yaml_path}")
    print(f"   next: python scripts/train_detector.py --epochs 40\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
