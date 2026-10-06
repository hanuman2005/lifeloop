"""Dataset and loaders for the multimodal observation records.

Reads the splits written by scripts/split_observations.py and turns each row
into the three tensors WasteNet expects: an image, twelve spatial features and
twelve context features.

Imputation
----------
Report §6.3: "missing sensor values (for points without IoT nodes) are imputed
with ward-level medians and flagged with a binary indicator".

The medians are computed from the training split alone and then applied to all
three. Computing them over the whole dataset would leak test-set statistics
into training — a small leak, but a free one to avoid.

A ward can contain no instrumented point at all, in which case there is no ward
median to use and the global median stands in. That is most wards here: 29
points carry sensors and there are 39 wards.
"""

from __future__ import annotations

import csv
import statistics
from collections import defaultdict
from pathlib import Path

import torch
from PIL import Image, ImageOps
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

from .config import ML_ROOT
from .multimodal import CLASS_INDEX, encode_context, encode_spatial

SENSOR_COLUMNS = ["fill_pct", "weight_kg", "temp_c"]

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
IMAGE_SIZE = 224


def build_transforms(train: bool) -> transforms.Compose:
    """Table 6.2 augmentation: flips, mild rotation, resized crops, colour jitter.

    The geometry is kept gentle. A waste photograph has no canonical
    orientation, so horizontal flips are free, but large rotations produce
    images no citizen would ever submit.
    """
    if train:
        return transforms.Compose(
            [
                transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.7, 1.0)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(15),
                transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.2),
                transforms.ToTensor(),
                transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
            ]
        )
    return transforms.Compose(
        [
            transforms.Resize(int(IMAGE_SIZE * 1.14)),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def read_split(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def fit_imputation(train_rows: list[dict]) -> dict[str, dict[str, float]]:
    """Median sensor readings per ward, plus a global fallback.

    Returns {ward_id: {column: value}} with the key "*" holding the global
    medians used wherever a ward has no instrumented point.
    """
    by_ward: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    overall: dict[str, list[float]] = defaultdict(list)

    for row in train_rows:
        if row["has_sensor"] != "true":
            continue
        for column in SENSOR_COLUMNS:
            if row[column]:
                value = float(row[column])
                by_ward[row["ward_id"]][column].append(value)
                overall[column].append(value)

    if not overall:
        raise SystemExit("no sensor readings in the training split; cannot impute")

    global_medians = {
        column: statistics.median(values) for column, values in overall.items()
    }

    table: dict[str, dict[str, float]] = {"*": global_medians}
    for ward, columns in by_ward.items():
        table[ward] = {
            column: statistics.median(columns[column])
            if columns.get(column)
            else global_medians[column]
            for column in SENSOR_COLUMNS
        }
    return table


class ObservationDataset(Dataset):
    def __init__(
        self,
        rows: list[dict],
        imputation: dict[str, dict[str, float]],
        train: bool,
    ) -> None:
        self.rows = rows
        self.imputation = imputation
        self.transform = build_transforms(train)

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int):
        row = self.rows[index]

        path = ML_ROOT / row["image"]
        with Image.open(path) as handle:
            # Phones write orientation into EXIF rather than rotating the
            # pixels. Without this the same photograph trains sideways.
            image = ImageOps.exif_transpose(handle).convert("RGB")
        image_tensor = self.transform(image)

        medians = self.imputation.get(row["ward_id"], self.imputation["*"])
        spatial = torch.tensor(encode_spatial(row), dtype=torch.float32)
        context = torch.tensor(encode_context(row, medians), dtype=torch.float32)
        label = torch.tensor(CLASS_INDEX[row["label"]], dtype=torch.long)

        return image_tensor, spatial, context, label


def build_loaders(
    split_dir: Path, batch_size: int = 32, workers: int = 0
) -> tuple[DataLoader, DataLoader, DataLoader, dict]:
    train_rows = read_split(split_dir / "train.csv")
    val_rows = read_split(split_dir / "val.csv")
    test_rows = read_split(split_dir / "test.csv")

    imputation = fit_imputation(train_rows)

    def loader(rows: list[dict], train: bool) -> DataLoader:
        return DataLoader(
            ObservationDataset(rows, imputation, train=train),
            batch_size=batch_size,
            shuffle=train,
            num_workers=workers,
            pin_memory=False,
            drop_last=False,
        )

    return (
        loader(train_rows, True),
        loader(val_rows, False),
        loader(test_rows, False),
        imputation,
    )
