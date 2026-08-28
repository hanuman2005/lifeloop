# LifeLoop — Platform Guide

Everything a new team member needs to understand what this is, how it is put
together, and why each piece is built the way it is.

Read this first. [PROJECT-PLAN.md](./PROJECT-PLAN.md) is the scope of record,
[DEMO.md](./DEMO.md) is the runbook, [ml/README.md](./ml/README.md) is the model
detail. This document is the map.

**Last updated:** 2026-08-19

---

## 1. What the product does

Urban waste in India fails for behavioural and economic reasons rather than
technical ones. Households have no incentive to segregate, municipalities spend
most of their budget moving waste rather than recycling it, and the informal
collectors who do the actual recycling have no economic identity.

LifeLoop closes that loop entirely in software:

1. **Classify** what someone is about to throw away, and separate a mixed pile
   into materials so a municipality knows what is recyclable.
2. **Incentivise** the correct disposal with a points economy.
3. **Collect** efficiently, by routing from citizen bin reports rather than fixed
   circuits.
4. **Formalise** the collectors, with tasks and a verifiable work record.
5. **Reuse** items before they ever become waste.

**The claimed novelty:** participatory sensing instead of IoT hardware. Citizens
replace fill-level sensors, so the system scales at zero marginal cost per bin.

---

## 2. The five modules

| # | Module | State |
|---|---|---|
| M1 | **AI Waste Scanner** — segregate a photo into materials | Built. Detector + classifier |
| M2 | **Crowd-Sensing Bin Network** — reports → ward map → routes | Built |
| M3 | **The Exchange** — items find a second owner | Built |
| M4 | **Collector Formalization** — tasks, verification, work ledger | Built |
| M5 | **EPR Certificate Ledger** | Descoped. Its hash-chain technique is used in M4 |

---

## 3. Repository layout

```
backend/     Node.js + Express + MongoDB + Socket.IO API
web/         React PWA — the client everyone uses
ml/          The models: data tooling, training, evaluation, serving
LifeLoop/    Expo React Native app — superseded by web/, kept for reference
```

Three processes run in development. The web client talks only to the backend; the
backend talks to the model service.

```
browser ──HTTP/WebSocket──▶ backend (:5000) ──HTTP──▶ model service (:8000)
                                  │
                                  ▼
                            MongoDB Atlas
```

---

## 4. The model layer (`ml/`)

This is the part most people ask about, so it goes first.

### 4.1 Two models, not one

A municipality photographs a **mixed pile**. A classifier returns exactly one
label per image, so a bin holding plastic, paper and a battery comes back as
"Plastic, 87%" and sounds confident doing so. That is not a weaker answer, it is
the wrong kind of answer.

So the pipeline has two stages:

```
photo
  → DETECTOR     finds each discardable item, returns boxes     yolov8n
  → crop each box (padded 12%)
  → CLASSIFIER   what each crop is made of                      MobileNetV3-Small
  → aggregate    per-item list + composition summary
```

**Why the detector is class-agnostic.** It is trained on one class, "waste item".
TACO has 60 categories across 4,784 boxes — roughly 80 per category, nowhere near
enough to learn what a thing is *made of*. But "is this a discardable object" is a
single question with 4,784 examples, which is plenty. The material question is
answered by the classifier, which has its own larger dataset. Asking one model to
do both would make it worse at both.

### 4.2 The classifier

**MobileNetV3-Small**, ImageNet-pretrained, fine-tuned in two phases.

| | |
|---|---|
| Classes | 9 — Plastic, Glass, Metal, Paper, Organic, Electronic, Textile, Hazardous, NotWaste |
| Training data | 3,170 images (Kaggle garbage 1,890, Open Images 582, TrashNet 299, TACO crops 399) |
| Test accuracy | **0.848** |
| Test macro-F1 | **0.835** |
| Calibration error | 0.073 → **0.018** after temperature scaling (T = 0.781) |
| Export | ONNX 6.1 MB, 4.7 ms per image, parity verified (agreement 1.000) |

Per-class F1 on the test set, best to worst: Organic 0.938, Textile 0.897,
Hazardous 0.889, Electronic 0.870, Paper 0.855, Glass 0.852, Plastic 0.820,
Metal 0.781, **NotWaste 0.611**.

**NotWaste is the weakest class and the one that matters most.** Its recall is
0.524, so half of the photographs containing no discardable item still get given a
material. That class exists precisely so the model can decline, and right now it
declines about half as often as it should. It has 149 images, the second-smallest
count after Electronic.

The largest material confusion is Plastic predicted as Glass, 8 of 83. Transparent
plastic and glass are genuinely hard to separate from a photograph.

**Why two training phases.** Phase A trains only the new classification head with
the backbone frozen: the head starts as random noise, and letting its large early
gradients flow into pretrained features would damage them. Phase B unfreezes
everything at a ten-times-smaller learning rate — fine-tuning at phase A's rate
destroys the ImageNet features the whole approach depends on.

**Why macro-F1 and not accuracy.** The classes are imbalanced. A model that never
predicts Hazardous can still post respectable accuracy while failing at the one
class with real consequences. Macro-F1 weights every class equally and exposes
that.

**Two behaviours that matter more than the score:**

- **Temperature scaling.** Neural networks are systematically overconfident. One
  scalar, fitted on validation, rescales the confidence without changing which
  class wins. The app shows that number to users, so it has to mean something.
- **Abstention.** Below a per-class calibrated threshold the service reports
  `uncertain` and the UI asks the user to check. A model that declines 8% of
  images and is right 92% of the time beats one that is right 85% and never
  hesitates.

**`NotWaste` is a real class, deliberately.** Relying on a low score to catch "the
user photographed a wall" does not work: a network asked to choose among eight
materials answers confidently even when none apply. Giving it a ninth option to
choose instead is both more accurate and easier to defend.

### 4.3 The detector

**yolov8n**, class-agnostic, trained on TACO.

| | |
|---|---|
| Data | 670 images, 468 / 100 / 102 — TACO plus 170 annotated Indian household-trash photographs |
| mAP50 | **0.746** (test) · 0.652 (val) |
| mAP50-95 | 0.479 |
| Precision / Recall | 0.841 / 0.627 |
| Serving threshold | **0.15**, calibrated — see below |

**The threshold is measured, not chosen, and this mattered.** It was originally
hardcoded to 0.25, a round number. The fully-trained detector scored a *better*
mAP50 than a partially-trained one yet found *fewer* items in practice, because
mAP is computed across every confidence level — it measures how well boxes are
**ranked**, not how confident the model is in absolute terms. Training longer
improved the ranking and lowered the scores, so the fixed cutoff silently
discarded most detections.

`scripts/calibrate_detector.py` now measures the precision/recall curve on the
test split and picks the threshold that maximises **recall** subject to a
precision floor:

| conf | precision | recall |
|---|---|---|
| 0.10 | 0.473 | 0.683 |
| **0.15** | **0.584** | **0.662** |
| 0.25 | 0.685 | 0.627 |
| 0.50 | 0.807 | 0.472 |

Recall is favoured because a missed item is waste that goes unsorted, whereas a
false box costs one classifier call which the `NotWaste` class then discards. Those
costs are not symmetric, so a symmetric measure like F1 would be the wrong thing
to maximise. 0.15 was chosen over 0.10 because the extra 2 points of recall would
have come at more than half the boxes being false — visible clutter over the
photograph, and nobody can audit a segregation they do not believe.

### 4.4 Why MobileNetV3 and not YOLO

This question comes up constantly, and it conflates two different models.
`yolov8n` is a **detector**; `yolov8n-cls` is a **classifier**. Only the second is
a rival to MobileNetV3, and it was measured on identical splits:

| model | accuracy | macro-F1 | params | latency | licence |
|---|---|---|---|---|---|
| mobilenet_v3_small | 0.832 | 0.835 | 1.53M | 12.4 ms | BSD |
| yolov8n_cls | 0.814 | **0.836** | 1.45M | 12.3 ms | AGPL-3.0 |

A macro-F1 gap of 0.001 on 113 test images is noise. As classifiers they are
equivalent in accuracy, size and speed, so the tiebreaker is licensing:
torchvision is BSD, Ultralytics is AGPL-3.0. The detector is where YOLO genuinely
earns its place, and that is what it is used for.

### 4.5 Data integrity

Three rules the pipeline enforces rather than trusts:

- **Group-aware splitting.** Every photograph of the same physical object shares an
  `object_id` and lands in the same split. Random splitting leaks near-duplicates
  into the test set and produces a score that looks *better* than the truth, which
  is why `prepare_dataset.py` refuses to emit a leaking split rather than warning
  about one.
- **Public data is train-only.** TrashNet and friends are studio photographs of
  single items on plain backgrounds. A test set containing them measures a
  different problem from the one the app solves.
- **Calibration is fitted on validation, applied to test.** Fitting it on test
  would be tuning against the held-out set.

### 4.6 Serving

FastAPI, model held in memory.

| Endpoint | Purpose |
|---|---|
| `GET /health` | classes, whether a detector is loaded, the calibrated threshold |
| `POST /classify` | one item — material, calibrated confidence, `uncertain`, `no_item` |
| `POST /analyze-scene` | mixed pile — per-item list plus composition summary |

Startup asserts that the checkpoint's preprocessing spec matches
`wasteml/config.py`. A mismatch between training and serving preprocessing is the
most common cause of "excellent in the notebook, useless in the app", and it
otherwise fails silently.

With no detector loaded, `/analyze-scene` degrades to classifying the whole frame,
so the endpoint is always callable and the caller reads `mode` to tell which
happened.

---

## 5. The backend (`backend/`)

Node.js + Express + Mongoose + Socket.IO. **26 route groups, 19 models.**

### 5.1 Security posture

| Measure | Note |
|---|---|
| helmet | standard defensive headers |
| compression | gzip |
| CORS allowlist | strict. Unknown browser origins get 403, not a blanket allow |
| Rate limiting | global ceiling, tighter on auth, tighter still on scans |
| JWT auth | bearer token, 401 clears the client session |
| morgan | `combined` in production, `dev` locally |

CORS deliberately permits requests with **no** Origin header. CORS is a browser
mechanism; React Native and curl send no Origin, and those requests are still
gated by auth.

### 5.2 M1 — the scan endpoints

`POST /api/ai/analyze-image` and `POST /api/ai/analyze-scene`.

Both sit behind auth and a per-user hourly limiter. Three things happen here that
are not obvious:

- **Image-hash caching.** SHA-256 of the base64; a repeat scan costs no inference.
  The same hash also serves M2's duplicate detection.
- **In-flight deduplication.** Two identical photos submitted at once share one
  inference.
- **Strict coercion.** The model's output is validated before it reaches anything
  else — an unknown material is rejected rather than passed through.

`MATERIAL_RULES` supplies the recycling guidance, `isRecyclable` and urgency per
material. The classifier only ever returns a material and a confidence; everything
a user reads is derived from that. **This is why a 1.5M-parameter model can replace
a large vision-language model here** — most of what an LLM produced was never used.

Gemini remains wired as a fallback for when the model service is unreachable. It
deliberately does **not** fire when our own model returns low confidence, because
substituting a hosted API for a weak prediction would hide the weakness and
invalidate the accuracy evaluation. Every response carries an `engine` field.
`GEMINI_API_KEY` is blank by default, which disables it entirely.

### 5.3 M2 — crowd-sensing

`BinReport` with a 2dsphere index. `POST /api/bins/report`, plus `nearby`,
`wards`, `actionable`, `route`, `my-reports`, `resolve`.

**Anti-gaming (`services/binTrust.js`)** — four rules, kept together so they are
testable as a set:

1. **Image-hash dedup** — the same photograph resubmitted.
2. **Geofence** — coordinates outside the service area, configurable by env rather
   than hardcoded to one ward.
3. **Same-place cooldown** — repeated reports of one spot minutes apart.
4. **Reporter reputation** — weights rather than blocks.

Two design decisions worth understanding:

- **Rejected reports are stored, not discarded** (`accepted: false`). "How do you
  know the anti-gaming works" needs a number, and deleting the evidence removes it.
- **Reputation weights rather than bans.** A new reporter is not a bad reporter,
  and one rejection should reduce influence, not remove it. The map aggregates by
  summed weight, so an unreliable account fades instead of vanishing — which also
  makes the system harder to probe for a ban threshold.

**Ward aggregation** groups by a ~1.1 km grid key, because municipal ward polygons
for Bhimavaram are not open data. A regular grid supports the same aggregation and
routing while being reproducible, and swapping in real polygons later changes one
function. Wards are scored by **weighted pressure**, not raw counts, so a single
unreliable account cannot colour a ward red.

`actionable` excludes reports older than the window: a bin reported full three days
ago says nothing about today, and routing a truck to it wastes the trip the module
exists to save.

### 5.4 M3 — the Exchange

The longest-standing module. Listings, interest queue, donor assignment, chat,
scheduling, QR handover, impact, ratings.

Lifecycle: **post → interest → assign → agree a time → QR handover → rate.**

The QR code is what records the exchange, so neither side has to be taken on
trust. Codes are signed and expire, so an earlier screenshot will not verify.

### 5.5 M4 — collector formalization

`CollectionTask` and `WorkLedgerEntry`.

Tasks are generated from unresolved bin reports and Exchange donations, then
claimed by proximity. Task claiming uses a status guard inside the update query, so
two collectors cannot claim the same task — whoever updates first flips it off
`open` and the second finds nothing to update.

**Completion is not verification.** A task sits at `completed` until the citizen
who raised it confirms, and a collector cannot verify their own work. Without an
independent confirmation the ledger would only record that someone *claimed* to
have done something, which is exactly the unverifiable paper trail the module
replaces.

**The work ledger is hash-chained per collector.** Each entry's hash covers its
contents plus the previous hash, so editing any earlier entry invalidates every
entry after it. The chain is re-verified on every read, so tampering is discovered
the next time anyone looks rather than whenever someone remembers to audit. Mongoose
hooks block updates and deletes.

This is the same technique the descoped M5 EPR ledger specified. Applying it here
recovers most of that idea at a fraction of the cost, and gives the tamper-evidence
argument somewhere real to live rather than existing only on paper.

### 5.6 Route optimisation

`services/routeOptimizer.js` — K-means clustering to group stops, then a
nearest-neighbour plus 2-opt TSP solver per cluster.

`scripts/routeSimulation.js` produces the measured result: **26.5% mean distance
reduction** at realistic fill rates (20–50%), against a synopsis target of 25–40%.

**The baseline is what makes it credible.** The existing
`calculateUnoptimizedDistance` compares against a depot→bin→depot round trip for
every bin — no municipality collects that way, and beating it yields an 80–90%
saving that collapses under the first viva question. The real baseline is a **fixed
circuit** visiting every bin regardless of fill, ordered with the *same*
nearest-neighbour and 2-opt heuristics the optimised arm uses. Any saving therefore
comes from skipping bins that did not need emptying, not from handing the baseline a
poor route.

**The study also reports where the approach fails.** Above roughly 60% fill the
fixed circuit wins, reaching −20% at full occupancy. Crowd-sensing pays off
precisely when bins are not uniformly full, which is the real-world case. Part of
that crossover is an assumption rather than a finding — the optimised arm splits
into capacity-limited routes that each return to the depot, while the baseline is
one tour — and that is stated in the limitations.

---

## 6. The frontend (`web/`)

**Vite + React 18 + Tailwind + shadcn/ui**, TanStack Query for server state,
Socket.IO for realtime, Leaflet for maps, Recharts for charts.

Feature-sliced: `app/` composition root, `shared/` primitives, `features/<name>/`
everything else.

### 6.1 Screens — 20 routes

| Area | Screens |
|---|---|
| Public | Landing, Login, Register, Forgot password, Reset password |
| Scanner | Scan (one item / mixed pile), History with composition breakdown |
| Exchange | Browse, Detail, Create, My items, Interested users + assignment |
| Bins | Report (two taps + geotag), Ward map |
| Coordination | Chat, Pickups, Handover (QR), Ratings |
| Disposal | Where to take it — centres filtered by material |
| Collector | Nearby tasks, photo verification, work record with live chain check |
| Admin | Platform overview, users, reports, flagged content |
| Municipal | Ward pressure, route planning |

Navigation is role-aware: collectors see **Collect**, admins see **Admin** and
**Municipal**.

### 6.2 Decisions worth knowing

**The camera uses a file input with `capture`, not `getUserMedia`.** On a phone
that opens the native camera, which handles focus, exposure and orientation far
better than anything we would build, and it degrades to a file picker on desktop
with no extra code.

**QR scanning decodes a photograph, not a live video stream.** Browsers only
permit `getUserMedia` on HTTPS or localhost, and this app is opened over plain
HTTP on a LAN address during testing and demos, where a live preview simply fails.
A captured photo plus jsQR works everywhere, with manual entry as a fallback.

**Chat sends over the socket, not REST.** The server broadcasts to the chat room
from its socket handler, so an HTTP post would persist the message without
delivering it live. History still loads over REST.

**Geolocation is requested on mount, not at submit.** A GPS fix takes seconds, and
asking only once the user has chosen a status wastes that time while they stand
over the bin.

**Images are downscaled before upload.** The model sees 224×224 regardless, so
sending a 12 MP photo over mobile data costs seconds for nothing.

**Route-level code splitting.** Leaflet, Recharts and jsQR are each used on one
screen, so loading them upfront makes first paint slower for everyone to benefit
nobody. Initial bundle 1,229 kB → **543 kB** (gzip 171 kB).

**The mobile bar carries the five most-used screens**, not the first five declared
— beyond five, targets stop being reachable one-handed.

### 6.3 The honesty rule

The UI never presents a guess as a result. This runs through every screen:

- A failed scan surfaces as failed. It previously returned a hardcoded placeholder
  and showed a success toast with confetti.
- An `uncertain` prediction gets different styling, no confetti, and no "AI
  confirmed" claim.
- `no_item` asks for a better photo rather than naming a material.
- The pile summary states that the recyclable share is counted **by item, not by
  volume** — a box in a 2D photograph does not measure how much of a bin something
  fills.

---

## 7. Data model

19 Mongoose models. The ones that matter:

| Model | Purpose |
|---|---|
| `User` | accounts; `userType` is donor / recipient / both / collector / admin |
| `Listing` | an item offered, with a queue of interested users |
| `BinReport` | M2 citizen report, geospatial, with trust fields |
| `CollectionTask` | M4 assigned work, polymorphic source |
| `WorkLedgerEntry` | M4 append-only hash-chained work record |
| `EcoPoints` | the points economy and per-user stats |
| `WasteAnalysis` | saved scans — the waste-composition record |
| `Transaction` | QR handover verification |
| `Chat` / `Message` | conversations |
| `Schedule` | pickup arrangements |

Geospatial queries use `2dsphere` indexes on `location` throughout, in GeoJSON
`[longitude, latitude]` order.

---

## 8. Running it

Three processes. MongoDB (Atlas or local) must be reachable.

```bash
# 1. model service
cd ml && uvicorn serve.app:app --host 127.0.0.1 --port 8000

# 2. backend
cd backend && npm run dev          # :5000

# 3. web client
cd web && npm run dev              # :5173
```

Seed the database so every screen has data:

```bash
cd backend && node scripts/seedDemo.js
```

That creates five accounts covering every role, listings, bin reports and points
histories. **A single account cannot exercise the donation loop** — a donor cannot
express interest in their own listing — which is why the seed creates several.

To open from a phone, set `VITE_API_URL` to the machine's LAN IP rather than
`localhost`, and add that origin to `ALLOWED_ORIGINS` in `backend/.env`.

---

## 9. Reproducing the results

```bash
# Route efficiency
cd backend && node scripts/routeSimulation.js --bins 100 --trials 30

# Classifier
cd ml
python scripts/check_dataset.py           # audit against the labelling policy
python scripts/prepare_dataset.py         # group-disjoint splits
python scripts/train.py                   # two-phase transfer learning
python scripts/evaluate.py                # metrics, calibration, model card
python scripts/export.py                  # ONNX bundle, parity checked

# Detector
python scripts/prepare_detection.py --limit 500
python scripts/train_detector.py --epochs 30 --imgsz 512
python scripts/calibrate_detector.py      # derives the serving threshold

# Architecture comparison
python scripts/compare_backbones.py
```

Everything is seeded, so figures regenerate exactly. Detector training resumes
from `last.pt` with `--resume` if interrupted, and `--eval-only` recovers just the
measurement if evaluation fails on its own.

---

## 10. What is not done

Stated here rather than discovered later.

| Gap | Detail |
|---|---|
| **No locally collected photographs** | All 3,170 classifier images are public, so `prepare_dataset.py` had to be run with `--allow-public-holdout`. Every score above is therefore an **upper bound measured on studio and stock photographs**, not a measurement on real waste. The central claim — that Indian waste does not look like TrashNet — remains **asserted, not measured** |
| **No end-to-end score** | mAP50 and macro-F1 are each measured alone. Nothing measures *photograph of a mixed pile in, correct material breakdown out*, which is what the product claims to do |
| **`Wood` has no training data** | No public dataset covers wood waste honestly. Open Images furniture is `NotWaste` by our own policy, and labelling a working chair as Wood would teach the model something false |
| **Detector recall 0.627** | 37% of items are missed, and a missed item is unsorted waste. Recall, not precision, is the binding limit |
| **NotWaste recall 0.524** | Half of non-waste photographs are given a material instead of being declined |
| **M5 EPR ledger** | Descoped; specified in the plan, technique demonstrated in M4 |
| **Thesis / SRS** | Not written |
| **No database auth in local dev** | `mongod.cfg` has security commented out. Fine locally, not fine deployed |

---

## 11. Conventions

- **Never present a guess as a result.** If the system does not know, it says so.
- **Thresholds are measured, not chosen.** Both the classifier's abstention cutoffs
  and the detector's confidence threshold are fitted from data. A round number in
  place of a measurement has already cost us once.
- **Prefer stating a limitation to hiding it.** Every measured result in this
  project ships with the conditions under which it fails.
- **Verify against the running system**, not against expectations. Several bugs in
  this codebase — a deleted endpoint, a 404ing URL, a case-sensitive import, a
  wrong CORS port — were invisible until something was actually run.
