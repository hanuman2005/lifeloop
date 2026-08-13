"""Shared configuration for the LifeLoop waste classifier.

Everything that must agree between training and serving lives here. If a value in
this file changes after a model is trained, that model is invalid — retrain it.
"""

from pathlib import Path

# ── Classes ─────────────────────────────────────────────────────────────────
# Order is load-bearing: it defines the output index of the network. Appending is
# safe only before training; reordering or inserting invalidates every checkpoint.
#
# The first eight mirror WASTE_CATEGORIES in backend/controllers/configController.js
# and CATEGORY_ADVICE in LifeLoop/src/screens/WasteAnalyzer.js. "Hazardous" is added
# to satisfy synopsis objective O1.
MATERIAL_CLASSES = [
    "Plastic",
    "Glass",
    "Metal",
    "Paper",
    "Organic",
    "Electronic",
    "Textile",
    "Wood",
    "Hazardous",
]

# Photographs of things that are not discardable items — walls, floors, hands,
# plants, empty rooms. This is a real predicted class, deliberately.
#
# The alternative is relying on a low confidence score to catch "the user pointed the
# camera at a wall", but a network asked to choose among nine materials will answer
# confidently even when none apply. Giving it a tenth option to choose instead is
# both more accurate and easier to explain in a viva.
#
# It is appended last so every material keeps its original output index.
NOT_WASTE_CLASS = "NotWaste"

CLASSES = MATERIAL_CLASSES + [NOT_WASTE_CLASS]

NUM_CLASSES = len(CLASSES)
CLASS_TO_IDX = {name: i for i, name in enumerate(CLASSES)}
NOT_WASTE_IDX = CLASS_TO_IDX[NOT_WASTE_CLASS]

# Kept for directory scanning; the folder name and the class name are the same.
NOT_WASTE_DIR = NOT_WASTE_CLASS

# ── Preprocessing ───────────────────────────────────────────────────────────
# Serving must reproduce this exactly. A mismatch here is the most common cause of
# "excellent in the notebook, useless in the app", and it fails silently.
IMAGE_SIZE = 224
NORM_MEAN = [0.485, 0.456, 0.406]  # ImageNet statistics — the backbone expects these
NORM_STD = [0.229, 0.224, 0.225]

# ── Splits ──────────────────────────────────────────────────────────────────
SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}
SPLIT_SEED = 42

# Below this many images a class cannot be evaluated meaningfully; prepare_dataset
# warns loudly rather than letting it pass unnoticed.
MIN_IMAGES_PER_CLASS = 150

# ── Training ────────────────────────────────────────────────────────────────
BATCH_SIZE = 32
PHASE_A_EPOCHS = 5  # frozen backbone, train the head only
PHASE_A_LR = 1e-3
PHASE_B_EPOCHS = 20  # fine-tune the whole network
PHASE_B_LR = 1e-4  # deliberately 10x smaller — see README
WEIGHT_DECAY = 1e-4
EARLY_STOP_PATIENCE = 5

# ── Abstention ──────────────────────────────────────────────────────────────
# Default cutoff below which the service reports "uncertain" instead of a class.
# evaluate.py fits per-class thresholds that override this.
DEFAULT_CONFIDENCE_THRESHOLD = 0.55

# ── Paths ───────────────────────────────────────────────────────────────────
ML_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ML_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
MANIFEST_PATH = DATA_DIR / "manifest.csv"
SPLITS_DIR = DATA_DIR / "splits"
ARTIFACTS_DIR = ML_ROOT / "artifacts"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def preprocess_spec() -> dict:
    """The contract the serving code must honour. Written alongside every checkpoint."""
    return {
        "image_size": IMAGE_SIZE,
        "norm_mean": NORM_MEAN,
        "norm_std": NORM_STD,
        "resize": "shortest side to image_size, then center crop",
        "color_space": "RGB",
    }
