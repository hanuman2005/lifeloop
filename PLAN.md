# LifeLoop — plan of record

Decided 2026-10-06. The guide's report (`project doc kalyan sir 193.pdf`) is the
specification and is **not being changed**. The work is to build what it
describes.

## Standing decisions

**No IoT hardware.** Citizens with phones are the sensing layer. The report's
node stays in the document as a designed component; the implementation deploys
the participatory tier only, and the stated reason is cost. Say "the IoT tier is
specified in the design and was not deployed", never that it is missing.
Consequence: nothing produces a measured `fill_pct`. Fill comes from the
citizen's small/medium/large, weighted by the trust score.

**Seven classes, per report §6.3**: recyclable, organic, plastic, paper, metal,
glass, mixed. The project's own nine-class scheme maps on as: Textile and
Electronic to `recyclable`, Hazardous to `mixed`. NotWaste has no slot and its
148 images are unused.

**The report's results are not reproducible.** 97.84% accuracy, 10,000
observations, the ablation table and the 21 passing tests describe experiments
nobody ran. Chapter 8 gets rewritten around real measured numbers. Never quote
97.84% or 10,000 images as this project's results.

**Stack: option C, hybrid.** Keep Node/Express/MongoDB for the app. The Python
service (`ml/serve/app.py`, already FastAPI) grows to hold the models, the
forecaster and the routing. Report Figure 7.1 describes exactly this — an
intelligence layer separate from the service layer. Table 5.4 gets amended;
the backend is not rewritten.

## Major items, in dependency order

| # | Item | Report | State |
|---|---|---|---|
| 1 | Spatio-temporal observation dataset | Table 6.1 | **done** |
| 2 | Multimodal classifier | §6.4, Eq 6.1 | code done, needs Colab run |
| 3 | LSTM forecaster + urgency score | §6.5 | not started |
| 4 | CVRP-TW routing, OR-Tools + OSRM | §6.6, Eq 6.2, Alg 6.1 | not started |
| 5 | Ablation study | §8.5, Table 8.4 | blocked on 1–4 |

### 1 — done
`ml/data/points.csv` (191 Bhimavaram collection points from OpenStreetMap, 39
k-means wards), `ml/data/observations.csv` (10,000 records over 2025-10-01 to
2026-09-30), `ml/data/obs_splits/` (70/15/15, split on `object_id`).
Scripts: `build_points.py`, `generate_observations.py`, `split_observations.py`.

### 2 — awaiting a Colab run
`ml/wasteml/multimodal.py`, `ml/wasteml/obsdata.py`,
`ml/scripts/train_multimodal.py`. No NVIDIA GPU on this machine, so training
happens on a T4. Upload `ml/colab_bundle.zip`, run section 5b of
`ml/colab_train.ipynb`. See `ml/COLAB.md`.

### 3 — next to build
Two-layer LSTM, 14-day window per point, forecast 24–72 h. Then
`U = 100 × clip(w₁f + w₂(ĉ/C) + w₃(Δt/Δt_max) + w₄κ(class), 0, 1)`.
Reads `observations.csv`; does not depend on item 2 finishing.

### 4
OR-Tools path-cheapest-arc plus guided local search, OSRM distance and time
matrices, disjunction penalties for the priority term, 25 s solve limit.
Replaces the crude `backend/artifacts/route-simulation.md`.

### 5
Four configurations: without participatory sensing, without AI prediction,
without dynamic optimisation, complete.

## Minor items

| # | Item | Report | Effort |
|---|---|---|---|
| 1 | CRS + allocation rules | §6.7, Eq 6.3, Table 6.3 | 3–4 d |
| 2 | Recovery-unit portal, `/recovery/loads` | Table 7.2 | 3 d |
| 3 | Dashboard heatmap + urgency markers | Fig 7.10, Code 7.7 | 3 d |
| 4 | REST endpoints renamed to match | Table 7.2 | 2 d |
| 5 | OTP login | FR1 | 2 d |
| 6 | Offline report queueing | FR2 | 2 d |
| 7 | Face and number-plate blurring | NFR Privacy | 2 d |
| 8 | Telugu + English | NFR Usability | 3 d |
| 9 | Test suites matching Tables 7.3 / 7.4 | §7.6 | 3 d |
| 10 | Docker Compose | Code 7.8 | 2 d |
| 11 | MLflow model registry | Table 5.4 | 1 d |

## What the team collects

Wood and NotWaste photographs are **no longer needed** — neither class exists in
the report's seven.

1. **Field-verify 20–30 collection points.** Half a day, free, highest value.
   Walk to points in `ml/data/points.csv`, confirm a bin or dumping site is
   there, correct the coordinates, set `field_verified` to `true`. Turns "191
   points derived from OpenStreetMap" into a method instead of an assumption.

2. **250–300 genuine mixed-waste photographs.** The `mixed` class is currently
   353 Hazardous images — batteries and paint tins — but the report means a
   contaminated, unsortable pile. Shoot food-soaked cardboard, bags where wet
   and dry have merged, wet piles outside tea stalls.

3. **400–600 organic photographs.** 383 images currently carry 46% of the
   dataset, so each appears 12 times. The santha market (P0106) and the fish
   market (P0019) will give hundreds in one morning.

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
