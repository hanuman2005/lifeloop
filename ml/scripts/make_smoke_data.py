"""Generate a synthetic dataset so the pipeline can be exercised without real photos.

    python scripts/make_smoke_data.py
    python scripts/prepare_dataset.py --raw-dir data/smoke_raw
    python scripts/train.py --phase-a-epochs 2 --phase-b-epochs 3 --batch-size 16
    python scripts/evaluate.py

Each class gets a distinct colour and shape, so a model can genuinely learn the task
and every stage — splitting, class weighting, calibration, abstention — is exercised.

This proves the machinery, not the model. The scores it produces are meaningless and
must never appear in the thesis.
"""

import argparse
import csv
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

COLORS = {
    "Plastic": (60, 120, 220),
    "Glass": (20, 180, 190),
    "Metal": (150, 150, 160),
    "Paper": (220, 200, 140),
    "Organic": (90, 170, 70),
    "Electronic": (160, 90, 200),
    "Textile": (220, 110, 150),
    "Wood": (140, 90, 50),
    "Hazardous": (230, 60, 50),
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--objects-per-class", type=int, default=12)
    parser.add_argument("--shots-per-object", type=int, default=2)
    parser.add_argument("--out", type=Path, default=config.DATA_DIR / "smoke_raw")
    args = parser.parse_args()

    random.seed(0)
    rows = []

    for class_index, class_name in enumerate(COLORS):
        class_dir = args.out / class_name
        class_dir.mkdir(parents=True, exist_ok=True)
        base_color = COLORS[class_name]

        for obj in range(args.objects_per_class):
            for shot in range(args.shots_per_object):
                image = Image.new("RGB", (256, 256), (245, 245, 245))
                draw = ImageDraw.Draw(image)

                color = tuple(max(0, min(255, c + random.randint(-25, 25))) for c in base_color)
                x, y = random.randint(30, 90), random.randint(30, 90)

                if class_index % 3 == 0:
                    draw.ellipse([x, y, x + 120, y + 120], fill=color)
                elif class_index % 3 == 1:
                    draw.rectangle([x, y, x + 120, y + 120], fill=color)
                else:
                    draw.polygon([(x + 60, y), (x, y + 120), (x + 120, y + 120)], fill=color)

                name = f"{class_name}_SM_{obj:03d}_{shot}.jpg"
                image.save(class_dir / name, quality=88)
                # Shots of one object share an object_id, so the split logic is tested.
                rows.append((name, f"{class_name}_obj{obj:03d}"))

    # Deliberately not data/metadata.csv: that file holds the team's hand-recorded
    # rows, is the most expensive thing here to recreate, and writing synthetic rows
    # over it would destroy real work to run a pipeline test.
    meta_path = config.DATA_DIR / "smoke_metadata.csv"
    with open(meta_path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["filename", "object_id", "source"])
        for name, object_id in rows:
            writer.writerow([name, object_id, "smoke"])

    print(f"✅ {len(rows)} synthetic images across {len(COLORS)} classes → {args.out}")
    print(f"✅ metadata → {meta_path}")
    print(f"\n   next: python scripts/prepare_dataset.py --raw-dir {args.out} "
          f"--metadata {meta_path}")
    print("\n⚠️  Synthetic data. Metrics from it are meaningless — never cite them.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
