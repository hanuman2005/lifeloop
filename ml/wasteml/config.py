"""Shared configuration for the LifeLoop waste classifier.

Everything that must agree between training and serving lives here. If a value in
this file changes after a model is trained, that model is invalid — retrain it.
"""

from pathlib import Path

# ── Classes ─────────────────────────────────────────────────────────────────
# Order is load-bearing: it defines the output index of the network. Appending is
# safe only before training; reordering or inserting invalidates every checkpoint.
#
# The first eight mirror WASTE_CATEGORIES in backend/controllers/configController.js.
# "Hazardous" is added to satisfy synopsis objective O1.
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

# ── The five classes of the 28 October review ───────────────────────────────
# Report §6.3 names seven categories. Two of them cannot be built from
# photographs of a material: `recyclable` is a catch-all for anything
# recoverable that is none of the four named materials, and `mixed` means a
# contaminated, unsortable pile. Neither has a dataset, and the project's
# earlier stand-in mappings (Textile and Electronic to recyclable, Hazardous to
# mixed) label the picture of a battery as a picture of a mixed heap.
#
# These five are the materials that dominate Indian municipal generation and
# the five that public datasets actually label. They are the whole of report
# §6.3 minus the two composites, so nothing in Eq. 6.1, the urgency score or
# the allocation rules changes — only the width of the softmax.
FOCUS_CLASSES = ["Organic", "Plastic", "Paper", "Metal", "Glass"]

# Folder name here, report §6.3 name there. Table 6.3 and the κ(class) factor of
# §6.5 are written in the report's lowercase vocabulary, so the translation has
# to live somewhere both sides can see it.
REPORT_NAME = {
    "Organic": "organic",
    "Plastic": "plastic",
    "Paper": "paper",
    "Metal": "metal",
    "Glass": "glass",
}

FOCUS_NUM_CLASSES = len(FOCUS_CLASSES)
FOCUS_CLASS_TO_IDX = {name: i for i, name in enumerate(FOCUS_CLASSES)}

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

# The per-class goal for the five focus classes. 3,000 is not a round number
# chosen for comfort: at a 70/15/15 split it leaves 450 test images per class,
# which is the point where a per-class F1 stops moving by whole points when one
# image changes, and the 95% confidence interval on a ~0.90 F1 narrows to about
# ±0.03. Below roughly 1,000 per class the interval is wide enough that the
# gap between the image-only baseline and the multimodal model would not be
# distinguishable from noise, and that gap is the result the review turns on.
FOCUS_TARGET_PER_CLASS = 3000

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

# Downloaded datasets, named as ingest_public.py tags them. `local` is the team's
# own photographs; any source not listed here is treated as local. Which of these
# may enter validation and test is decided by FIELD_SOURCES below.
PUBLIC_SOURCES = {"trashnet", "garbage12", "taco", "openimages",
    # Web image search. Same treatment as any other public source: training split
    # only, never validation or test, so reported accuracy never rests on it.
    "scraped",
    # ── Added for the five-class, 3,000-per-class dataset ────────────────────
    # Studio-style sets. Large, cleanly labelled, and photographed one item at a
    # time against a plain surface, which is the opposite of what a citizen
    # sends. They supply volume to the training split and are barred from
    # validation and test for exactly the reason TrashNet is.
    "garbage_v2",
    # ── Field sources, below ─────────────────────────────────────────────────
    "realwaste", "mdwd", "zerowaste",
}

# Public sets whose photographs were taken where waste actually is — a landfill
# tipping floor, a sorting conveyor, a street. They are public, so they stay in
# PUBLIC_SOURCES for provenance, but they are the only public sets allowed into
# validation and test.
#
# Why this is a change of policy and not a loophole: the old rule assumed the
# held-out set would be the team's own photographs. With 15,000 images coming
# from public sources and the team's own collection still at a few hundred, that
# rule leaves no test set at all. The honest replacement is a cross-domain
# split — train on curated images, test on field images — which measures the
# thing report Gap 3 says is unmeasured, namely whether a classifier trained on
# clean single-object photographs survives a cluttered real one. A score from
# this split is lower than a same-domain score and means considerably more.
#
# Nothing from a studio set may enter here. If one does, the reported accuracy
# silently becomes a studio accuracy again.
FIELD_SOURCES = {
    "realwaste",   # Whyte's Gully landfill, Wollongong. UCI #908, 2023.
    "mdwd",        # Maltese street-level municipal waste, 2026.
    "zerowaste",   # material-recovery-facility conveyor frames, CVPR 2022.
    "taco",        # litter photographed in place, in context.
}

_not_public = FIELD_SOURCES - PUBLIC_SOURCES
assert not _not_public, (
    f"FIELD_SOURCES must all be public sources; missing from PUBLIC_SOURCES: "
    f"{sorted(_not_public)}"
)

# The studio sets: public, and never eligible for validation or test.
STUDIO_SOURCES = PUBLIC_SOURCES - FIELD_SOURCES

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
