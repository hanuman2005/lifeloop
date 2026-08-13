"""Model construction and checkpoint I/O."""

import json
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models

from . import config

# Backbones evaluated for the architecture-choice section of the thesis. The default
# is mobilenet_v3_small: the others are stronger but 4-6x larger, and the project
# needs an on-device export path.
BACKBONES = {
    "mobilenet_v3_small": (models.mobilenet_v3_small, models.MobileNet_V3_Small_Weights.IMAGENET1K_V1),
    "resnet18": (models.resnet18, models.ResNet18_Weights.IMAGENET1K_V1),
    "efficientnet_b0": (models.efficientnet_b0, models.EfficientNet_B0_Weights.IMAGENET1K_V1),
}

DEFAULT_BACKBONE = "mobilenet_v3_small"


def build_model(backbone: str = DEFAULT_BACKBONE, pretrained: bool = True) -> nn.Module:
    """Load an ImageNet-pretrained backbone and replace its head with ours.

    Pretraining is not optional at this data scale. A network trained from scratch on
    a few thousand photographs memorises them; one that already knows edges, textures
    and object parts only has to learn which of those mean "plastic".
    """
    if backbone not in BACKBONES:
        raise ValueError(f"Unknown backbone {backbone!r}. Choose from {sorted(BACKBONES)}")

    factory, weights = BACKBONES[backbone]
    model = factory(weights=weights if pretrained else None)

    # Each torchvision family names its classifier differently.
    if backbone.startswith("mobilenet") or backbone.startswith("efficientnet"):
        in_features = model.classifier[-1].in_features
        model.classifier[-1] = nn.Linear(in_features, config.NUM_CLASSES)
    else:  # resnet
        model.fc = nn.Linear(model.fc.in_features, config.NUM_CLASSES)

    return model


def head_parameters(model: nn.Module, backbone: str):
    """The parameters trained during phase A, while the backbone stays frozen."""
    if backbone.startswith("mobilenet") or backbone.startswith("efficientnet"):
        return model.classifier.parameters()
    return model.fc.parameters()


def set_backbone_trainable(model: nn.Module, backbone: str, trainable: bool) -> None:
    for param in model.parameters():
        param.requires_grad = trainable
    for param in head_parameters(model, backbone):
        param.requires_grad = True


def save_checkpoint(path: Path, model: nn.Module, backbone: str, metrics: dict) -> None:
    """A checkpoint carries everything needed to reproduce inference.

    Weights alone are not a deliverable: without the class order and the preprocessing
    spec they cannot be served correctly.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "backbone": backbone,
            "classes": config.CLASSES,
            "preprocess": config.preprocess_spec(),
            "metrics": metrics,
        },
        path,
    )

    sidecar = path.with_suffix(".json")
    sidecar.write_text(
        json.dumps(
            {
                "backbone": backbone,
                "classes": config.CLASSES,
                "preprocess": config.preprocess_spec(),
                "metrics": metrics,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def load_checkpoint(path: Path, device: str = "cpu"):
    """Load a checkpoint and rebuild the matching architecture.

    Refuses to load if the checkpoint's class list disagrees with the current config —
    a silent mismatch would map every prediction to the wrong label.
    """
    blob = torch.load(path, map_location=device, weights_only=False)

    if blob["classes"] != config.CLASSES:
        raise ValueError(
            "Checkpoint class list does not match config.CLASSES.\n"
            f"  checkpoint: {blob['classes']}\n"
            f"  config:     {config.CLASSES}\n"
            "Retrain, or restore the original class order."
        )

    model = build_model(blob["backbone"], pretrained=False)
    model.load_state_dict(blob["state_dict"])
    model.to(device).eval()
    return model, blob
