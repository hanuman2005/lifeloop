"""Pack a Colab-sized copy of the training data.

    python scripts/make_colab_bundle.py
    python scripts/make_colab_bundle.py --out lifeloop-colab --classifier-only

Local CPU training dies on this dataset — the last run was killed after one epoch —
so real runs happen on a Colab T4. That means the data has to be uploaded, and
data/raw plus data/detection is about 1.2 GB of phone-resolution photographs.

None of that resolution reaches either model. The classifier sees 224px crops and
the detector trains at 640, so this writes a downscaled copy sized to what training
actually consumes. Typical result is under a tenth of the original.

The originals are never touched. This only ever writes into --out.

## What goes in

    data/raw/<Class>/…         classifier images, long edge capped
    data/splits/               the train/val/test lists, unchanged
    data/detection/            YOLO images and labels, long edge capped
    wasteml/  scripts/         the code, so Colab runs the same pipeline
    requirements.txt

The layout mirrors ml/ exactly, so the bundle root works as ML_ROOT and
wasteml/config.py resolves every path without a single edit on Colab.

Splits reference images by filename, so downscaling in place under a different root
keeps every split valid. Re-running prepare_dataset.py on Colab is neither needed
nor wanted: it would reshuffle and the score would not compare to the local one.
"""

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

# The classifier resizes to 224. 320 leaves room for the random-crop augmentation
# to have something to crop from, without carrying 4000px phone originals.
CLASSIFIER_MAX_EDGE = 320

# train_detector.py defaults to --imgsz 640.
DETECTOR_MAX_EDGE = 640

JPEG_QUALITY = 88


def copy_scaled(source: Path, destination: Path, max_edge: int) -> int:
    """Copy one image, downscaled if it is larger than max_edge. Returns bytes written."""
    from PIL import Image, ImageOps

    try:
        with Image.open(source) as opened:
            # Bakes in any EXIF rotation, so the saved pixels are what a viewer sees.
            image = ImageOps.exif_transpose(opened).convert("RGB")
            scale = min(1.0, max_edge / max(image.width, image.height))
            if scale < 1.0:
                image = image.resize(
                    (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                    Image.LANCZOS,
                )
            destination.parent.mkdir(parents=True, exist_ok=True)
            # Always .jpg on the way out: one format keeps the loader simple, and
            # every source here is a photograph rather than line art.
            image.save(destination.with_suffix(".jpg"), "JPEG", quality=JPEG_QUALITY)
    except Exception as error:  # noqa: BLE001
        print(f"  ✗ {source.name}: {error}")
        return 0

    return destination.with_suffix(".jpg").stat().st_size


def pack_classifier(out: Path) -> tuple:
    count = 0
    written = 0

    for class_dir in sorted(config.RAW_DIR.iterdir()):
        if not class_dir.is_dir() or class_dir.name not in config.CLASSES:
            continue
        for image in sorted(class_dir.iterdir()):
            if image.suffix.lower() not in config.IMAGE_EXTENSIONS:
                continue
            size = copy_scaled(
                image,
                out / "data" / "raw" / class_dir.name / image.name,
                CLASSIFIER_MAX_EDGE,
            )
            if size:
                count += 1
                written += size

    if config.SPLITS_DIR.exists():
        shutil.copytree(config.SPLITS_DIR, out / "data" / "splits", dirs_exist_ok=True)
    if config.MANIFEST_PATH.exists():
        shutil.copy2(config.MANIFEST_PATH, out / "data" / "manifest.csv")

    return count, written


def pack_detector(out: Path) -> tuple:
    source_root = config.DATA_DIR / "detection"
    if not source_root.exists():
        return 0, 0

    count = 0
    written = 0

    for split in ("train", "val", "test"):
        images = source_root / "images" / split
        labels = source_root / "labels" / split
        if not images.exists():
            continue

        for image in sorted(images.iterdir()):
            if image.suffix.lower() not in config.IMAGE_EXTENSIONS:
                continue
            size = copy_scaled(
                image,
                out / "data" / "detection" / "images" / split / image.name,
                DETECTOR_MAX_EDGE,
            )
            if not size:
                continue
            count += 1
            written += size

            # Labels are normalised, so downscaling the image leaves them valid.
            label = labels / f"{image.stem}.txt"
            if label.exists():
                target = out / "data" / "detection" / "labels" / split / label.name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(label, target)

    # `path:` has to be absolute, and it is not resolved against the yaml's own
    # folder — Ultralytics resolves a relative one against the working directory.
    # `path: .` run from the repo root therefore looks for <root>/images/val and
    # dies before the first epoch.
    #
    # The value below is the Colab layout the notebook unpacks into, which is the
    # only place this bundle is ever opened. colab_train.ipynb rewrites it after
    # extracting, so a different root still works.
    (out / "data" / "detection").mkdir(parents=True, exist_ok=True)
    (out / "data" / "detection" / "data.yaml").write_text(
        "path: /content/ml/data/detection\n"
        "train: images/train\n"
        "val: images/val\n"
        "test: images/test\n"
        "\n"
        "nc: 1\n"
        "names:\n"
        "  0: waste\n"
        "\n"
        "# Class-agnostic by design; the classifier answers the material question.\n",
        encoding="utf-8",
    )

    return count, written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=config.ML_ROOT / "colab_bundle")
    parser.add_argument("--classifier-only", action="store_true")
    parser.add_argument("--detector-only", action="store_true")
    parser.add_argument("--no-zip", action="store_true",
                        help="leave the folder in place instead of zipping it")
    args = parser.parse_args()

    out = args.out
    if out.exists():
        print(f"❌ {out} already exists. Remove it or pass a different --out.")
        return 1
    out.mkdir(parents=True)

    total = 0

    if not args.detector_only:
        print(f"📦 classifier images (long edge ≤ {CLASSIFIER_MAX_EDGE}px)")
        count, written = pack_classifier(out)
        print(f"   {count} images, {written / 1e6:.0f} MB")
        total += written

    if not args.classifier_only:
        print(f"📦 detector images (long edge ≤ {DETECTOR_MAX_EDGE}px)")
        count, written = pack_detector(out)
        print(f"   {count} images, {written / 1e6:.0f} MB")
        total += written

    print("📦 code")
    for name in ("wasteml", "scripts"):
        shutil.copytree(
            config.ML_ROOT / name,
            out / name,
            dirs_exist_ok=True,
            # __pycache__ is machine-specific and pure upload weight.
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
        )
    for name in ("requirements.txt", "README.md", "LABELLING-POLICY.md"):
        source = config.ML_ROOT / name
        if source.exists():
            shutil.copy2(source, out / name)

    if args.no_zip:
        print(f"\n✅ {out}  ({total / 1e6:.0f} MB of images)")
        return 0

    print("🗜️  zipping")
    archive = shutil.make_archive(str(out), "zip", root_dir=out)
    size = Path(archive).stat().st_size
    shutil.rmtree(out)

    print()
    print(f"✅ {archive}")
    print(f"   {size / 1e6:.0f} MB — upload to Google Drive, then run colab_train.ipynb")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
