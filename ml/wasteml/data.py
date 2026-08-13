"""Dataset and transform construction."""

from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

from . import config


def build_transforms(train: bool):
    """Augmentation is applied to the training split only.

    Validation and test must see exactly what the serving code produces, otherwise
    the reported metrics describe a pipeline that never runs in production.
    """
    base = [
        transforms.Resize(config.IMAGE_SIZE),
        transforms.CenterCrop(config.IMAGE_SIZE),
    ]

    if train:
        # Each of these encodes a real-world variation the model must tolerate:
        # items photographed sideways, in poor light, partially out of frame.
        base = [
            transforms.RandomResizedCrop(config.IMAGE_SIZE, scale=(0.7, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(20),
            transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        ]

    return transforms.Compose(
        base
        + [
            transforms.ToTensor(),
            transforms.Normalize(config.NORM_MEAN, config.NORM_STD),
        ]
    )


class WasteDataset(Dataset):
    """Reads a split CSV produced by scripts/prepare_dataset.py."""

    def __init__(self, split_csv: Path, train: bool):
        self.frame = pd.read_csv(split_csv)
        self.transform = build_transforms(train)

        missing = set(self.frame["label"]) - set(config.CLASSES)
        if missing:
            raise ValueError(
                f"{split_csv.name} contains labels absent from config.CLASSES: {sorted(missing)}"
            )

    def __len__(self) -> int:
        return len(self.frame)

    def __getitem__(self, i):
        row = self.frame.iloc[i]
        # Convert explicitly: PNGs carry an alpha channel and greyscale photos have
        # one channel, either of which would break the 3-channel normalisation.
        image = Image.open(row["path"]).convert("RGB")
        return self.transform(image), config.CLASS_TO_IDX[row["label"]]


def make_loader(split_csv: Path, train: bool, batch_size: int = config.BATCH_SIZE):
    dataset = WasteDataset(split_csv, train=train)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=train,
        num_workers=0,  # Windows + notebooks: worker processes cause more pain than they save
        pin_memory=torch.cuda.is_available(),
    )


def class_weights(split_csv: Path) -> torch.Tensor:
    """Inverse-frequency weights.

    Without these the network learns to predict the majority class and reports a
    respectable accuracy while being useless — Hazardous and Wood are the classes
    that disappear first.
    """
    frame = pd.read_csv(split_csv)
    counts = frame["label"].value_counts()

    weights = []
    for name in config.CLASSES:
        n = int(counts.get(name, 0))
        weights.append(0.0 if n == 0 else len(frame) / (config.NUM_CLASSES * n))

    return torch.tensor(weights, dtype=torch.float32)
