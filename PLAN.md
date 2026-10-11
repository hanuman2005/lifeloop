# LifeLoop — plan of record

Decided 2026-10-06, revised 2026-10-11. The guide's report
(`project doc kalyan sir 193.pdf`) is the specification and is **not being
changed**. The work is to build what it describes.

**Second project review: 28 October 2026.**

## Standing decisions

**No IoT hardware.** Citizens with phones are the sensing layer. The report's
node stays in the document as a designed component; the implementation deploys
the participatory tier only, and the stated reason is cost. Say "the IoT tier is
specified in the design and was not deployed", never that it is missing.
Consequence: nothing produces a measured `fill_pct`. Fill comes from the
citizen's small/medium/large, weighted by the trust score.

**Five classes for this review, not seven.** Report §6.3 names seven:
recyclable, organic, plastic, paper, metal, glass, mixed. Two of them are not
materials a photograph can show. `recyclable` is a catch-all for anything
recoverable that is none of the four named materials; `mixed` means a
contaminated, unsortable pile. The project's earlier stand-in mappings made them
worse than absent — `recyclable` was Textile and Electronic photographs and
`mixed` was Hazardous ones, so the network was being taught that a picture of a
battery is a picture of an unsortable heap.

The five that remain — **organic, plastic, paper, metal, glass** — dominate
Indian municipal generation and are the five that public datasets actually
label. Eq. 6.1 is unchanged; only the width of the softmax is. Say "recyclable
and mixed are deferred because neither names a material a photograph can show",
never that the seven-class model failed.

`config.FOCUS_CLASSES` holds the five. `config.CLASSES` still holds all ten, and
the Textile (3,729), Hazardous (1,109), Electronic (143) and NotWaste (148)
images are kept on disk, so returning to seven classes is a configuration change
rather than a re-collection.

**The report's results are not reproducible.** 97.84% accuracy, 10,000
observations, the ablation table and the 21 passing tests describe experiments
nobody ran. Chapter 8 gets rewritten around real measured numbers. Never quote
97.84% or 10,000 images as this project's results.

**Stack: option C, hybrid.** Keep Node/Express/MongoDB for the app. The Python
service (`ml/serve/app.py`, already FastAPI) grows to hold the models, the
forecaster and the routing. Report Figure 7.1 describes exactly this — an
intelligence layer separate from the service layer. Table 5.4 gets amended; the
backend is not rewritten.

## Two corrections to the report

These are deviations we make deliberately and must be able to defend.

### 1. A pile is classified by detection, not by one softmax

Eq. 6.1 emits one label. A pile is a mixture, so a single label cannot describe
it. The platform therefore runs two stages, which `ml/wasteml/detect.py` already
implements:

```
photo → YOLOv8n detector (class-agnostic "is this a discardable item?")
      → crop each box
      → 5-class classifier on each crop
      → composition = Σ box area per class / Σ total area
```

The 5-class model never sees a pile. It sees one cropped object. This is also
why training on single-object studio photographs is correct rather than
embarrassing: the classifier's real input is a crop.

Detector today: `yolov8n.pt`, one class `waste`, mAP50 0.746, **recall 0.627**,
trained on 468 images. That recall is the weak link — a missed item cannot be
recovered downstream, and it biases every composition estimate.

### 2. CRS composition comes from detections, not from softmax probabilities

§6.7 computes `M_rec` from "the class-probability vectors of the observations,
weighted by their estimated quantity", which treats softmax output as the
proportions of a pile. It is not: 0.6 plastic means "probably plastic", not "60%
plastic". `M_rec` must be computed from detected instances weighted by box area,
which is a quantity that genuinely is a proportion. Same equation, a correctly
measured input.

## Dataset — state at 2026-10-11

### Sources

Chosen on recency and on provenance. Studio sources supply training volume;
**field sources are the only public ones allowed into validation and test**
(`config.FIELD_SOURCES`). Training on curated images and measuring on field
images makes the evaluation cross-domain, which answers report §3.2 Gap 3
directly. Expect a score well below a same-domain score — that is the point.

| Source | Year | Kind | Access | State |
|---|---|---|---|---|
| Garbage Classification v2 (`sumn2u`) | 2024–26 | studio | Kaggle API | **ingested**, 12,259 in `original/` |
| RealWaste (UCI #908) | 2023 | field | direct zip | **ingested**, 4,752 |
| Open Images V7 crops | — | studio | direct | **abandoned**: 167 crops, see below |
| TACO | — | field | clone + `download.py` | not fetched |
| MDWD street-level | 2026 | field | Roboflow | not fetched |
| ZeroWaste-f | 2022 | field | direct page | not fetched |

`ml/scripts/fetch_datasets.py --list` prints all of this and the exact manual
steps for the ones behind accounts.

**garbage_v2 contains TrashNet byte-for-byte.** 313 identical pairs, mostly
`garbage_v2_glass_* = trashnet_glass_*`. The 2024 dataset absorbed the 2016 one,
so "we used a recent dataset" is only partly true. Say so before being asked.

**Open Images yielded 167 crops, not the ~1,600 projected.** The projection
counted annotated boxes; `crop_openimages.py` then rejected 930 of them for
"another object in the frame", because a crop is only usable if the object is
alone. Not ingested. Organic therefore stays the smallest class (1,871) and is
handled by weighting, not by more images.

TACO, MDWD and ZeroWaste are **box-annotated detection datasets**. Fetching them
serves twice: crops for the classifier, and boxes to fix the detector's 0.627
recall. TACO has 4,784 annotated instances and MDWD 11,461, against the
detector's current 468 training images.

### Counts

Per-class in `ml/data/raw/`, after de-duplication:

| Class | images | vs 3,000 target |
|---|---|---|
| Paper | 4,015 | ✅ |
| Plastic | 2,993 | −7 |
| Glass | 2,421 | −579 |
| Metal | 2,061 | −939 |
| Organic | 1,871 | −1,129 |

12,361 unique, up from 2,138. **Decision: balance at 2,400 rather than chase
3,000.** Capping the majority costs images instead of time, nothing is deleted,
and the saved time goes to the LSTM and the scan wiring, which are worth more
marks than 600 extra glass photographs.

### De-duplication is mandatory, not optional

`ml/scripts/dedupe_raw.py` — sha256 plus a 64-bit dhash, quarantines to
`ml/data/quarantine/` rather than deleting. 425 files quarantined so far.

Two traps found and handled, both worth knowing before touching that file:

- **LANCZOS ringing.** Reducing 384 px straight to 9 px leaves a periodic
  artifact stronger than the content; dozens of unrelated images hashed to
  `3333333333333333`. Fixed with a two-stage BOX reduction.
- **White-background product shots.** When the backdrop fills the frame almost
  every brightness comparison ties, so the hash records the backdrop. Fourteen
  different glass and plastic items clustered as one "duplicate". Any hash with
  fewer than 4 distinct rows is now discarded as degenerate; 634 files fall into
  this category and are covered by the byte-exact pass instead. That count is
  also a direct measure of how much of garbage_v2 is studio photography.

## Splits

Image classifier — the command of record:

```
python scripts/prepare_dataset.py \
  --classes Organic Plastic Paper Metal Glass \
  --cap-per-class 2400 --balance-holdout --holdout-ratios 0.2,0.4,0.4
```

| split | images | balance |
|---|---|---|
| train | 7,330 | studio-heavy, 15–28% per class |
| val | 533 | 107 per class |
| test | **1,065** | **213 per class, exactly 20%** |

`--holdout-ratios 0.2,0.4,0.4` exists because field images are scarce and studio
images already supply the training volume. Spending a field image on training
buys almost nothing; the same image in the test set is the only thing that can
measure anything. This took the test set from 620 images with 60 glass to 1,065
with 213 glass.

Multimodal — `python scripts/split_observations.py`, filters
`observations.csv` to `REPORT_CLASSES` at split time so the seven-class file
stays intact. 8,097 of 10,000 rows survive; `mixed` 1,414 and `recyclable` 489
are dropped.

**Known weakness, unresolved.** The observation splits inherit the real class
prior, so organic is 57% and glass/metal get ~41 test rows each — a per-class
F1 there carries roughly ±15 points. Options: raise the generated total from
10,000 to 30,000 (images are already reused ~4×, so this costs nothing but
time), or report macro-F1 with explicit intervals and say the rare classes are
underpowered. Not yet decided.

## Imbalance — settled approach

Balancing file counts is necessary but not sufficient. Two go in:

1. **Class-weighted cross-entropy**, weight ∝ 1/count. Both trainers do this.
2. **Report macro-F1 and balanced accuracy, never bare accuracy.**

A `WeightedRandomSampler` was considered and **dropped**: used together with a
weighted loss it corrects the imbalance twice and tilts the model toward the rare
classes. The image splits are already capped and close to balanced, so the loss
weights alone are enough.

**One-vs-rest ensembling was considered and rejected.** It cannot fix a
test-set-size problem, and it deepens the imbalance: glass is 194 of 5,664 rows
in the 5-way task, but 194 against 5,470 as a binary task. It also costs 5×
training, and five independent sigmoids do not sum to 1, which breaks Eq. 6.3
and the confidence shown to the citizen. A 3-seed ensemble of the *same*
architecture is a legitimate late addition if time allows.

## The flow — both halves

The citizen half already exists in the backend and was missing from earlier
descriptions of this project, not from the code.

```
                    ┌─ CITIZEN SCANS ──────────┐
                    │  photo (+GPS, optional)  │
                    └────────────┬─────────────┘
                                 v
                    detector → crops → 5-class classifier
                                 │
          ┌──────────────────────┴───────────────────────┐
          v                                              v
   A. KNOW (citizen, <2 s)                 B. ACT (municipality)
   item CRS → recycle / reuse /            snap to point ≤50 m, dedupe
   donate / compost / dispose                     │
   co2SavedByRecycling, hazards            LSTM forecast 24–72 h
   EcoPoints, WasteDiary                          │
          │                                 urgency U (§6.5)
          v                                       │
   Listing → interest → assign →           dashboard heatmap
   queue → QR check-in → complete                 │
   (DonationCenter, aiMatching)            CVRP-TW (OR-Tools + OSRM)
                                                  │
                                           driver confirms pickup
                                                  │
                                           load CRS → MRF / compost /
                                           reuse / RDF / landfill
```

One classification, two consumers. Branch A is per **item**; branch B is per
**point**. Eq. 6.3 is applied at item granularity on the left and load
granularity on the right.

**The connection that is missing.** `WasteAnalysis.js` says
`tfLabel: "Original MobileNet label"` and `// images processed client-side`. The
citizen scan today runs generic ImageNet MobileNet in the browser — it
recognises "water bottle", not the five classes. Everything downstream exists
(`reuseIdeas`, `upcycleIdeas`, `recyclingGuidance`, `donationPossible`,
`donationCategory`, `recyclingRecommendations`, `hazards`,
`impact.carbonSaved`, plus `Listing`, `DonationCenter`, `RecyclingCenter`,
`EcoPoints`, `WasteDiary`, `aiMatching`). Pointing `POST /wasteAnalysis` at the
FastAPI service is the single change that makes the citizen app and the thesis
one system. Its `material` enum still carries the old 11 values and needs
reconciling with the five.

## Order of work to 28 October

| # | Item | Report | State |
|---|---|---|---|
| 1 | Five-class dataset, deduped, balanced splits | Table 6.1 | **done** |
| 2 | Image classifier + image-only baseline, 5 classes | §8.2 | **ready, run on Colab** |
| 3 | Multimodal, same splits | §6.4, Eq 6.1 | **ready, run on Colab** |
| 4 | Scan → model wiring | Table 7.2 | not started |
| 5 | Detector retrain on TACO + MDWD | Fig 7.9 | not started |
| 6 | LSTM forecaster + urgency | §6.5 | not started |
| 7 | CVRP-TW routing, OR-Tools + OSRM | §6.6, Eq 6.2 | not started |
| 8 | Ablation: baseline vs multimodal | §8.5, Table 8.4 | blocked on 2–3 |

Items 2 and 3 together **are** the ablation — baseline versus multimodal on the
same test set is the slide the review turns on.

Then, in order: flow (18–21 Oct), UI on the demo path only (22–25 Oct),
security audit (26–27 Oct). The backend already has `helmet`,
`express-rate-limit`, `csurf`, `express-validator`, `bcrypt` and
`jsonwebtoken`, so security is a gap-fill, not a build: JWT expiry and refresh,
rate limits on auth and upload, upload MIME and size validation, secrets out of
the repo, CORS tightened.

## Training — Colab, ready as of 2026-10-11

No NVIDIA GPU on this machine — `torch 2.13.0+cpu`. Training happens on a Colab
T4.

1. Upload `ml/colab_bundle.zip` (235 MB) to the top level of Google Drive.
2. Open `ml/colab_train.ipynb` in Colab, **Runtime → T4 GPU**, run top to bottom.
   Four runs: classifier (§4–5), image-only baseline and full multimodal (§5b),
   detector (§6).
3. Download `lifeloop-artifacts.zip` from Drive, extract over `ml/artifacts/`.

The bundle is built by `scripts/make_colab_bundle.py` and holds **only images the
splits name** (9,450 of them, ≤320 px), not all of `data/raw`. Verified: 17,025
split rows, 0 missing in the zip, every path relative.

**The ablation.** `train_multimodal.py --image-only` zeroes the spatial and
context inputs in training and evaluation; nothing else changes. The gap to the
full run is the contribution of location and time.

**The multimodal test set is not cross-domain.** `observations.csv` is built from
`data/raw`, so its test rows include studio photographs. Quote it for the
baseline-versus-multimodal gap, never for absolute accuracy. The cross-domain
number comes from the image classifier on `data/splits`.

**Bugs found and fixed while preparing this run**
- 588 observation rows pointed at images the dedupe had quarantined; the
  multimodal loader would have died on the first. `dedupe_raw.py` now records
  `data/quarantine/mapping.csv` and repoints `observations.csv` to the surviving
  copy. 0 missing now.
- `evaluate.py` fitted the per-class abstention thresholds on the **test** set,
  so the reported accuracy-on-kept was tuned to the data it was measured on. Now
  fitted on validation, like the temperature.
- The multimodal trainer had no class weights; organic is 57% of rows.

## What the team collects

Wood and NotWaste photographs are **no longer needed**.

The held-out test set is currently an Australian landfill and nothing else —
`holdout pool: 0 local`. That is the gap your own camera fills, and it is about
provenance, not volume.

1. **100 photographs per class, 500 total, shot in Bhimavaram.** Discarded, in
   place, dirty, GPS on. Organic: santha market (P0106), fish market (P0019),
   temple gates. Plastic: roadside, drains, bus stand. Paper: shop fronts.
   Metal: scrap dealers. Glass: roadside. At most 3 shots of one heap, from
   different angles — more becomes near-duplicates that leak across splits.
   Vary morning and evening, wet and dry. Frame the waste, not the street.

   100 per class gives roughly ±7 points on a per-class accuracy — enough for an
   honest second table ("and on 500 photographs from the town itself, X%"), too
   coarse to carry the ablation. The big field test stays the primary measure.

2. **Field-verify 20–30 collection points.** Walk to points in
   `ml/data/points.csv`, confirm a bin or dumping site is there, correct the
   coordinates, set `field_verified` to `true`. Turns "191 points derived from
   OpenStreetMap" into a method instead of an assumption.

**D-Mart product photographs**: clean packaging on a shelf is not waste. If
ingested at all they are `studio`, train-only, and described in the dataset
table as "packaging photographed at retail, used in training to teach material
appearance, never in test". Putting them in the held-out set would lift the
score several points and silently break the cross-domain claim. Counting them as
waste observations is not defensible.

## Caveats that must reach the report

- The 191 collection points are **candidates** derived from OpenStreetMap, which
  maps no waste bins in Bhimavaram at all. Real coordinates of real places; that
  a bin stands at each is unverified until the team walks them.
- Wards W01–W39 are **k-means clusters**, not municipal boundaries. The count is
  Bhimavaram's real 39; the shapes are not the ward map. OSM has no ward
  polygons — four Overpass queries confirmed it.
- The observation records are **generated** against a daily intensity surface.
  The photographs and the points are real; which point and hour each observation
  lands on is not.
- Every rate in `generate_observations.py` is a plausible assumption, not a
  measurement. They are collected at the top of that file to be replaced when
  real figures exist.
- The image dataset is **almost entirely public**. The defence is the
  cross-domain split, not the size: trained on curated studio photographs,
  measured on a working landfill.

## Housekeeping

- `ml/data/downloads/` is gitignored — it reached 2.5 GB and was staged for
  commit. Provenance survives in `ml/data/public_metadata.jsonl`, which is not
  ignored. Deleted as redundant: `garbage_v2/standardized_256` and
  `standardized_384` (rescaled copies of `original`, never ingested) and
  `realwaste.zip` (already extracted). All re-fetchable.
- **A Kaggle API token was pasted into a chat transcript on 2026-10-11 and must
  be revoked.** Kaggle → Settings → API → expire the token, then save a fresh
  `kaggle.json` to `%USERPROFILE%\.kaggle\kaggle.json` rather than pasting it
  anywhere.
