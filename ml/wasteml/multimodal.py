"""The multimodal waste-characterisation model of report §6.4.

Eq. 6.1 is  y_hat = Softmax(W_c Z + b_c),  where Z is a 256-dimensional fused
representation of three modalities: the photograph, where it was taken, and
when. Figure 6.2 gives the shape of the network and Table 6.2 its training
configuration; both are followed here.

Why three branches instead of one
---------------------------------
A photograph of a bin is often ambiguous on its own. The same grey mass is
kitchen waste outside a house at seven in the morning and sweepings outside a
shop at seven in the evening. Report §6.4 makes the argument directly: a blurred
shot near a vegetable market before dawn is probably organic, the same shot on a
commercial street is probably packaging.

The attention gate is what makes this more than concatenation. It reads all
three embeddings and emits one weight per modality per sample, so the network
can lean on context when the image is poor and ignore context when the image is
clear. A fixed concatenation would force it to trust all three equally on every
sample.

Feature budget
--------------
Table 6.2 specifies "224 x 224 x 3 image + 24 tabular features", and Code 7.3
splits those 24 as twelve spatial and twelve temporal/sensor. The two blocks
below spend exactly that budget, which is why humidity is absent: it is the
thirteenth candidate and it correlates strongly with temperature, so it is the
cheapest of the set to drop.
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torchvision

# The seven categories of report §6.3. Order defines the output index of the
# network: appending is safe only before training, and reordering invalidates
# every checkpoint.
REPORT_CLASSES = [
    "recyclable",
    "organic",
    "plastic",
    "paper",
    "metal",
    "glass",
    "mixed",
]

NUM_CLASSES = len(REPORT_CLASSES)
CLASS_INDEX = {name: index for index, name in enumerate(REPORT_CLASSES)}

# The eight land uses build_points.py assigns. One-hot, so order is fixed.
LAND_USES = [
    "market",
    "residential",
    "commercial",
    "religious",
    "healthcare",
    "education",
    "civic",
    "industrial",
]

# Bhimavaram's approximate centre, used to express position as a displacement in
# kilometres rather than as a degree value the network would have to learn to
# centre itself.
TOWN_CENTRE_LAT = 16.5449
TOWN_CENTRE_LON = 81.5212
M_PER_DEG_LAT = 111_000
M_PER_DEG_LON = 106_000

# Divisors that bring each feature into roughly [-1, 1]. The town is about 15 km
# across and the largest container is 1100 L.
POSITION_SCALE_KM = 8.0
CAPACITY_SCALE_L = 1100.0
TEMPERATURE_CENTRE_C = 29.0
TEMPERATURE_SCALE_C = 8.0
WEIGHT_SCALE_KG = 300.0

QUANTITY_LEVEL = {"small": 0.0, "medium": 0.5, "large": 1.0}

SPATIAL_FEATURES = [
    "east_km",
    "north_km",
    "capacity",
    *[f"land_use_{name}" for name in LAND_USES],
    "is_market_or_religious",
]

CONTEXT_FEATURES = [
    "hour_sin",
    "hour_cos",
    "weekday_sin",
    "weekday_cos",
    "month_sin",
    "month_cos",
    "is_holiday",
    "reported_qty",
    "fill_fraction",
    "weight",
    "temperature",
    "has_sensor",
]

NUM_SPATIAL = len(SPATIAL_FEATURES)
NUM_CONTEXT = len(CONTEXT_FEATURES)

WEEKDAY_INDEX = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}


def _cyclical(value: float, period: float) -> tuple[float, float]:
    """Encode a cyclical quantity as a point on a circle.

    Hour 23 and hour 0 are one hour apart, but as plain numbers they sit at
    opposite ends of the range. Report §6.3 asks for the sine/cosine encoding
    for exactly this reason.
    """
    angle = 2 * math.pi * value / period
    return math.sin(angle), math.cos(angle)


def encode_spatial(row: dict) -> list[float]:
    """Twelve spatial features for one observation."""
    east_km = (float(row["lon"]) - TOWN_CENTRE_LON) * M_PER_DEG_LON / 1000
    north_km = (float(row["lat"]) - TOWN_CENTRE_LAT) * M_PER_DEG_LAT / 1000

    land_use = row["land_use"]
    one_hot = [1.0 if land_use == name else 0.0 for name in LAND_USES]

    return [
        east_km / POSITION_SCALE_KM,
        north_km / POSITION_SCALE_KM,
        float(row["capacity_l"]) / CAPACITY_SCALE_L,
        *one_hot,
        # The two land uses whose waste is overwhelmingly organic. Stated
        # explicitly because the one-hot alone makes the network learn that
        # pairing from scratch, and these are the categories where context most
        # needs to override an ambiguous photograph.
        1.0 if land_use in ("market", "religious") else 0.0,
    ]


def encode_context(row: dict, imputed: dict[str, float]) -> list[float]:
    """Twelve temporal and sensor features for one observation.

    `imputed` supplies ward-level medians for the sensor columns, which are
    empty at the 85% of points with no node. Report §6.3 specifies median
    imputation plus a binary indicator, and `has_sensor` is that indicator — the
    network can therefore learn to discount an imputed reading rather than
    treating it as measured.
    """
    hour_sin, hour_cos = _cyclical(float(row["hour"]), 24)
    weekday_sin, weekday_cos = _cyclical(WEEKDAY_INDEX[row["weekday"]], 7)
    month = int(row["timestamp"][5:7])
    month_sin, month_cos = _cyclical(month - 1, 12)

    has_sensor = row["has_sensor"] == "true"

    def sensor(column: str, fallback_key: str) -> float:
        raw = row[column]
        if raw:
            return float(raw)
        return imputed[fallback_key]

    fill_pct = sensor("fill_pct", "fill_pct")
    weight_kg = sensor("weight_kg", "weight_kg")
    temp_c = sensor("temp_c", "temp_c")

    return [
        hour_sin,
        hour_cos,
        weekday_sin,
        weekday_cos,
        month_sin,
        month_cos,
        1.0 if row["holiday"] else 0.0,
        QUANTITY_LEVEL[row["reported_qty"]],
        fill_pct / 100.0,
        weight_kg / WEIGHT_SCALE_KG,
        (temp_c - TEMPERATURE_CENTRE_C) / TEMPERATURE_SCALE_C,
        1.0 if has_sensor else 0.0,
    ]


class WasteNet(nn.Module):
    """Image, spatial and context branches fused by an attention gate.

    Dimensions follow Figure 6.2: the image branch projects EfficientNet-B0's
    1280 features to 192, each tabular branch produces 32, and the three
    concatenate to the 256-dimensional Z of Eq. 6.1.
    """

    def __init__(
        self,
        n_spatial: int = NUM_SPATIAL,
        n_context: int = NUM_CONTEXT,
        n_classes: int = NUM_CLASSES,
        pretrained: bool = True,
    ) -> None:
        super().__init__()

        weights = torchvision.models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = torchvision.models.efficientnet_b0(weights=weights)

        self.image_branch = nn.Sequential(
            backbone.features,
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(1280, 192),
            nn.ReLU(),
        )
        self.spatial_branch = nn.Sequential(
            nn.Linear(n_spatial, 64), nn.ReLU(), nn.Linear(64, 32)
        )
        self.context_branch = nn.Sequential(
            nn.Linear(n_context, 64), nn.ReLU(), nn.Linear(64, 32)
        )

        # One weight per modality per sample. Softmax so the three compete:
        # trusting the image more necessarily means trusting context less, which
        # is what makes the weights readable as an explanation afterwards.
        self.gate = nn.Sequential(nn.Linear(256, 3), nn.Softmax(dim=1))

        # W_c and b_c of Eq. 6.1 are the final Linear.
        self.head = nn.Sequential(
            nn.Linear(256, 128), nn.ReLU(), nn.Dropout(0.3), nn.Linear(128, n_classes)
        )

    def freeze_image_encoder(self, frozen: bool = True) -> None:
        """Phase 1 of Table 6.2 trains the fusion and head against a fixed encoder.

        Only the convolutional stack is frozen. The 1280 to 192 projection stays
        trainable, because it is part of the fusion rather than of the
        pretrained features.
        """
        for parameter in self.image_branch[0].parameters():
            parameter.requires_grad = not frozen

    def forward(
        self, image: torch.Tensor, spatial: torch.Tensor, context: torch.Tensor
    ) -> torch.Tensor:
        z_image = self.image_branch(image)
        z_spatial = self.spatial_branch(spatial)
        z_context = self.context_branch(context)

        gates = self.gate(torch.cat([z_image, z_spatial, z_context], dim=1))
        fused = torch.cat(
            [
                z_image * gates[:, 0:1],
                z_spatial * gates[:, 1:2],
                z_context * gates[:, 2:3],
            ],
            dim=1,
        )
        # Logits. Softmax is applied by the loss during training and explicitly
        # at inference, never twice.
        return self.head(fused)

    @torch.no_grad()
    def modality_weights(
        self, image: torch.Tensor, spatial: torch.Tensor, context: torch.Tensor
    ) -> torch.Tensor:
        """The gate's output, for reporting how much each modality contributed.

        Returns (batch, 3) in the order image, spatial, context. This is the
        evidence for the claim in §6.4 that the model leans on context when the
        photograph is ambiguous — without it that claim is only an assertion.
        """
        z_image = self.image_branch(image)
        z_spatial = self.spatial_branch(spatial)
        z_context = self.context_branch(context)
        return self.gate(torch.cat([z_image, z_spatial, z_context], dim=1))
