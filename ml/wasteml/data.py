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


def active_classes(split_csv: Path, minimum: int = 1) -> list:
    """The classes a model should actually be trained on, in config order.

    A class with no images still occupies an output slot, and the network will
    happily emit it having never seen one — a confident "Wood" prediction from a
    model that has never been shown wood. Training only on the classes that are
    present removes that failure mode, and `minimum` additionally drops classes too
    thin to learn anything from.

    Order follows config.CLASSES so the class list stays predictable, and the
    resulting list is recorded in the checkpoint rather than assumed at load time.
    """
    counts = pd.read_csv(split_csv)["label"].value_counts()
    return [name for name in config.CLASSES if int(counts.get(name, 0)) >= minimum]


class WasteDataset(Dataset):
    """Reads a split CSV produced by scripts/prepare_dataset.py.

    `classes` defines the label-to-index mapping. It defaults to the full config
    list, but a model trained on a subset must pass its own list — otherwise the
    indices the loss sees do not match the indices the network emits.
    """

    def __init__(self, split_csv: Path, train: bool, classes: list = None):
        self.classes = list(classes) if classes else list(config.CLASSES)
        self.class_to_idx = {name: i for i, name in enumerate(self.classes)}
        self.transform = build_transforms(train)

        frame = pd.read_csv(split_csv)

        unknown = set(frame["label"]) - set(config.CLASSES)
        if unknown:
            raise ValueError(
                f"{split_csv.name} contains labels absent from config.CLASSES: {sorted(unknown)}"
            )

        # Rows whose class is not being trained are dropped rather than silently
        # mapped to some other index.
        self.frame = frame[frame["label"].isin(self.classes)].reset_index(drop=True)

    def __len__(self) -> int:
        return len(self.frame)

    def __getitem__(self, i):
        row = self.frame.iloc[i]
        # Convert explicitly: PNGs carry an alpha channel and greyscale photos have
        # one channel, either of which would break the 3-channel normalisation.
        image = Image.open(row["path"]).convert("RGB")
        return self.transform(image), self.class_to_idx[row["label"]]


def make_loader(
    split_csv: Path,
    train: bool,
    batch_size: int = config.BATCH_SIZE,
    classes: list = None,
):
    dataset = WasteDataset(split_csv, train=train, classes=classes)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=train,
        num_workers=0,  # Windows + notebooks: worker processes cause more pain than they save
        pin_memory=torch.cuda.is_available(),
    )


def class_weights(split_csv: Path, classes: list = None) -> torch.Tensor:
    """Inverse-frequency weights over the trained classes.

    Without these the network learns to predict the majority class and reports a
    respectable accuracy while being useless — Hazardous is the class that
    disappears first.
    """
    classes = list(classes) if classes else list(config.CLASSES)

    frame = pd.read_csv(split_csv)
    frame = frame[frame["label"].isin(classes)]
    counts = frame["label"].value_counts()

    weights = []
    for name in classes:
        n = int(counts.get(name, 0))
        weights.append(0.0 if n == 0 else len(frame) / (len(classes) * n))

    return torch.tensor(weights, dtype=torch.float32)
