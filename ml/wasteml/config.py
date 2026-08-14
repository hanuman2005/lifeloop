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

# ── Collection targets ──────────────────────────────────────────────────────
# The per-class goals from LABELLING-POLICY.md, kept here so scripts can report
# progress against them instead of the numbers living only in prose. Plastic is
# largest because it is the most common real submission; Hazardous is smallest
# because it is the hardest to find safely, not because it matters least.
TARGET_COUNTS = {
    "Plastic": 350,
    "Paper": 250,
    "Organic": 250,
    "Glass": 200,
    "Metal": 200,
    "Electronic": 200,
    "Textile": 200,
    "Wood": 150,
    "Hazardous": 150,
    "NotWaste": 100,
}

# ── Metadata vocabularies ───────────────────────────────────────────────────
# Free-text metadata is metadata nobody can group by. These are the permitted
# values for data/metadata.csv; check_dataset.py rejects anything else so that
# "wet", "Wet" and "damp" cannot become three different conditions.
CONDITIONS = ["clean", "dirty", "wet", "crushed", "torn", "faded", "rusted"]
BACKGROUNDS = ["floor", "table", "ground", "grass", "road", "hand", "bin", "cloth"]
LIGHTINGS = ["sun", "shade", "indoor", "evening", "flash"]
AREAS = ["home", "hostel", "market", "street", "college", "temple"]

# Conditions other than "clean". The policy asks for roughly half the dataset to
# show damaged or soiled items, because a model trained on tidy objects fails on
# the photographs users actually send.
DAMAGED_CONDITIONS = [c for c in CONDITIONS if c != "clean"]
MIN_DAMAGED_SHARE = 0.40

# Policy caps shots of one physical object, so that near-duplicates cannot pad
# a class count without adding information.
MAX_SHOTS_PER_OBJECT = 3

# Items whose class cannot be decided from the policy wait here for a ruling.
# Never a training class — prepare_dataset.py ignores any folder outside CLASSES.
DOUBTFUL_DIR = "Doubtful"

# Class_Initials_Number, e.g. Plastic_HM_0042.jpg. new_batch.py generates it and
# check_dataset.py enforces it, so the pattern is defined once here.
FILENAME_PATTERN = r"^(?P<cls>[A-Za-z]+)_(?P<initials>[A-Z]{2,4})_(?P<num>\d{4,})$"

# Downloaded datasets, named as ingest_public.py tags them. Images from these are
# confined to the training split: they are studio photographs of single items, so a
# score measured on them describes a different problem from the one the app solves.
# See COLLECTION-PLAN.md. `local` is the team's own photographs; anything else (the
# synthetic smoke set) is treated as local, because it is not this kind of mismatch.
PUBLIC_SOURCES = {"trashnet", "garbage12", "taco", "openimages"}

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

METADATA_PATH = DATA_DIR / "metadata.csv"
PUBLIC_METADATA_PATH = DATA_DIR / "public_metadata.jsonl"

# Column order for data/metadata.csv. `filename` and `object_id` are the two that
# the pipeline actually depends on; the rest exist so the thesis can report what
# the dataset covers, and so a gap in coverage is visible before training.
METADATA_COLUMNS = [
    "filename",
    "object_id",
    "condition",
    "background",
    "lighting",
    "collector",
    "area",
    "source",
]


def preprocess_spec() -> dict:
    """The contract the serving code must honour. Written alongside every checkpoint."""
    return {
        "image_size": IMAGE_SIZE,
        "norm_mean": NORM_MEAN,
        "norm_std": NORM_STD,
        "resize": "shortest side to image_size, then center crop",
        "color_space": "RGB",
    }
