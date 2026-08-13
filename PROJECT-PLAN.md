# LifeLoop — Project Plan

**Student:** Hanumantha Rao Madineni · B.Tech CSE, SRKR Engineering College
**Basis document:** `LifeLoop-Final-Year-Project.md` (synopsis / guide-approved scope)
**Working mode:** Solo build · ~16 weeks (one semester) · small team assisting with data collection
**Last updated:** 2026-08-10

This file is the working plan of record. The synopsis describes the intended system; this
file describes what will actually be built, in what order, and every place the
implementation deliberately departs from the synopsis. Anything in this file that
contradicts the synopsis is a scope decision, made knowingly, and is listed in
section 6 so it can be defended rather than discovered.

---

## 1. What the system is

LifeLoop is a software-only circular economy platform for urban waste. Five modules
close a single loop: classify what a citizen is about to throw away, incentivise the
correct disposal, collect it efficiently, formalise the labour that does the collecting,
and issue verifiable proof that recycling happened.

| # | Module | Purpose |
|---|---|---|
| M1 | AI Waste Scanner | Photo of an item → category, material, disposal instruction, points |
| M2 | Crowd-Sensing Bin Network | Citizens report public bin fill state; produces a live ward map without IoT hardware |
| M3 | The Exchange | Items find a second owner before becoming waste |
| M4 | Collector Formalization | Ragpickers get digital identity, proximity tasks, and a work ledger |
| M5 | EPR Certificate Ledger | **Descoped — see 6.5.** Designed and documented, not built. |
| — | Points Economy | Cross-cutting incentive layer tying the modules together |

**M1 is the centrepiece.** The classifier is trained from scratch on a locally collected
dataset rather than delegated to a hosted vision API. See section 5a.

---

## 2. Starting position

The repository is not a blank slate. Before planning, the existing code was audited
against the synopsis. Result:

| Module | State at plan start |
|---|---|
| M1 AI Waste Scanner | Mobile UI complete (~2400 lines). Backend endpoint **deleted** — `routes/ai.js` is an empty router, `aiController.js` exports `{}`. Every scan silently falls back to a hardcoded result. |
| M2 Crowd-Sensing | Not present. |
| M3 The Exchange | **Built and deep.** Listings, interest queue, donor assignment, chat, pickup scheduling, QR handover verification, impact calculation, ratings, eco points. This is roughly 70% of the codebase. |
| M4 Collector Formalization | Not present. |
| M5 EPR Ledger | Not present. |
| Points Economy | Partial. `EcoPoints` model and `/api/eco` routes exist; the scanner's award call targets a wrong URL and 404s. |

### Codebase shape

- `backend/` — Node.js + Express + MongoDB (Mongoose) + Socket.IO. ~17,400 lines.
  26 routers, 17 models, 21 controllers.
- `LifeLoop/` — Expo / React Native 0.81 (SDK 54) mobile app. ~38,000 lines.
  33 screens, 7 admin screens, 26 components, 6 contexts.

### Defects found in the audit

These are fixed in Phase 0, not carried forward.

1. **The core AI feature is dead.** `WasteAnalyzer.js` posts to `/api/ai/analyze-image`,
   which no longer exists. The `catch` block returns a hardcoded
   `{label: "Unknown Item", material: "Plastic", confidence: 60}` and then shows the user
   a success toast with a confetti animation. A failure is presented as a result.
2. **Eco points never awarded from a scan.** `WasteAnalyzer.js` calls `${API}/eco/award`
   where `API` has already had `/api` stripped. The route is mounted at `/api/eco/award`.
3. **Dead code with missing dependencies.** `materialCompositionAnalyzer.js` (609 lines)
   imports `@tensorflow-models/coco-ssd`, which is in neither `package.json` nor the
   lockfile. No screen imports the file.
4. **Chatbot half-removed.** The controller and route still exist and are mounted, still
   reference `GEMINI_API_KEY` (absent from both `.env.example` files), and still describe
   the platform under its old name.
5. **Broken installs.** Backend will not boot (`Cannot find module 'ws'`). Mobile
   `node_modules` is absent entirely.
6. **Stale README.** References a `frontend/` directory that does not exist, a
   `docker-compose up` workflow whose files were deleted, and four documentation files
   that were deleted.
7. **Hardcoded LAN IP.** `172.250.36.214` appears in `app.json` and in the server CORS
   allowlist. Breaks whenever the network changes.
8. **Permissive CORS.** The origin callback's `else` branch calls `callback(null, true)`,
   allowing every origin. `helmet`, `csurf`, `express-rate-limit` and `compression` are
   installed but never applied.
9. **Leftovers.** `backend/workers/` holds a Python Celery entrypoint and `__pycache__`
   files for modules that were deleted.

---

## 3. What is removed, and why

The rule applied: remove what the synopsis does not ask for. Keep and re-label what it
does. **M3 The Exchange is not removed** — the synopsis asks for it, and it is the most
finished module in the project.

| Removed | Reason |
|---|---|
| Gemini chatbot (controller, route, component, context) | Not in synopsis. Competes for the Gemini quota M1 needs. |
| SMS / Twilio service, controller, route | Not in synopsis. Recurring cost. Schedule reminders fall back to email. |
| OTP verification (controller, route, `VerifyAccount` screen) | Not in synopsis. Depends on the SMS service. |
| `DigitalTwin` screen + `/impact/digital-twin` endpoint | Not in synopsis, no backing data model. |
| `materialCompositionAnalyzer.js` | Dead code, uninstalled dependencies. |
| `aiController.js` stub, `backend/workers/` | Corpses of previously removed services. |
| Stale README stack section | Documents a structure that no longer exists. |

Roughly 4,000–5,000 lines removed. Not 55,000.

## 4. What is kept and re-labelled

| Existing code | Becomes |
|---|---|
| Listings, interest queue, assignment, chat, schedules, QR handover, impact, eco points | **M3 The Exchange** — complete |
| `services/routeOptimizer.js` (K-means clustering + TSP solver) | **M2/M4 route engine**, with its input re-pointed from pickup requests to reported-full bins |
| `controllers/mapController.js` (MongoDB `$near` geospatial queries) | **M2 ward map backend** |
| Admin suite (7 screens) | **Municipal Dashboard** |

---

## 5. Schedule

Sixteen weeks, solo. Two items were trimmed to make the dual-database decision
(section 6.4) affordable: the municipal dashboard extends the existing admin screens
rather than becoming a separate web application, and M4 ships core functionality only.

### Phase 0 — Cleanup, repair, and the scan contract · Weeks 1–2 · **complete**

- Deleted everything in section 3 and unwired every reference to it.
- Reinstalled dependencies for both applications; untracked 8,375 `node_modules`
  files that were committed despite being gitignored.
- Built `POST /api/ai/analyze-image` — auth, per-user rate limit, request validation,
  image-hash caching, in-flight deduplication, and strict coercion of the classifier's
  output. Initially backed by Gemini Vision; the backing implementation is swapped for
  the custom model in phase 1 **behind an unchanged HTTP contract**.
- Fixed the `/eco/award` URL so scan points reach the database.
- Removed the silent fallback that presented a hardcoded placeholder as a real result.
- Repaired a pre-existing boot crash: `routes/config.js` bound two Celery-era handlers
  that no longer existed.

### Phase 1 — M1 custom model · Weeks 3–7

Runs in two parallel tracks. Data collection is delegated to the team; the pipeline,
training, and serving work is solo.

**Track A — dataset (weeks 3–4).** ~1,950 photographs across nine classes, collected
locally, following the shot list and labelling policy in `ml/LABELLING-POLICY.md`.
Combined with TrashNet, TACO, and Kaggle garbage-classification data for volume.

**Track B — pipeline (weeks 3–5).** Manifest construction, group-aware stratified
splitting, augmentation, two-phase transfer learning on MobileNetV3-Small, per-class
evaluation, temperature calibration, abstention thresholds, ONNX/TFLite export.

**Track C — serving (weeks 6–7).** FastAPI inference service beside the Node backend;
`aiController` calls it instead of Gemini. Same endpoint, same response shape.

**Exit criteria:** photograph an item, receive a classification from a model trained on
local data, see the points land in MongoDB — with a per-class precision/recall table and
a confusion matrix for the thesis.

### Phase 2 — M2 Crowd-Sensing · Weeks 8–10

- `BinReport` model; two-tap report screen (photo + automatic geotag → Full / OK / Overflowing).
- Report clustering into wards via MongoDB geospatial queries; live map.
- Reporter reputation weighting.
- Anti-gaming implemented here rather than deferred: rate limits, image-hash duplicate
  detection, geofence validation. Synopsis section 11 commits to these and the viva
  will ask about them.

**Exit criteria:** citizens can report bins; a live ward map renders from those reports.

### Phase 3 — Route optimization + simulation study · Week 11

- Re-point the existing K-means + TSP optimizer from pickup requests to reported-full bins.
- Run the study: fixed-route baseline versus optimized route, over real Bhimavaram ward
  geometry. Synopsis section 5 targets a 25–40% distance reduction.

Alongside the classifier evaluation, this is the project's second measured result rather
than a feature. It is entirely simulation-based and needs no pilot.

**Exit criteria:** a baseline-versus-optimized comparison with a defensible number.

### Phase 4 — M4 Collector Formalization · Weeks 12–14

- `collector` role and registration.
- Proximity-based task assignment drawn from Exchange donations.
- Before/after photo verification plus citizen confirmation.
- Append-only work ledger in MongoDB; monthly PDF work certificate.

Out of scope for this phase: payments, UPI deep-links, reputation tiers.

### Phase 5 — Municipal Dashboard · Week 15

Extend the existing admin screens: live waste map, generated collection routes,
ward-level waste-composition analytics derived from scan data.

### Phase 6 — Thesis, demo, buffer · Week 16

Synopsis sections 2–6 map directly onto standard SRS chapters. The buffer is real and
should not be spent early.

---

## 5a. The M1 classifier

The synopsis (section 5, module 1) proposes Gemini Vision for v1 with a fine-tuned
on-device model as a stretch goal. That stretch goal is pulled forward: the classifier
is trained here, on a locally collected dataset, and no hosted vision API is used.

### Task framing

Nine-class single-label **image classification**, not object detection. The product
photographs one item filling the frame, so bounding boxes buy nothing and would cost
roughly five times the annotation effort.

```
Plastic · Glass · Metal · Paper · Organic · Electronic · Textile · Wood · Hazardous
```

`Hazardous` is added to satisfy synopsis objective O1, which names it explicitly. The
existing eight came from `controllers/configController.js`.

### Why the model only needs to output two fields

`CATEGORY_ADVICE` in `LifeLoop/src/screens/WasteAnalyzer.js` already supplies recycling
guidance, impact figures, and action probabilities per material. The classifier supplies
`material` and `confidence`; everything else is a table lookup or a rule. This is what
makes replacing a large language model with a 2.5M-parameter classifier tractable.

### Architecture

MobileNetV3-Small, ImageNet-pretrained, fine-tuned in two phases (frozen backbone →
low-learning-rate full fine-tune). Chosen for size (~9 MB, ~2.5M parameters) and clean
TFLite export. ResNet-18 and EfficientNet-B0 are trained as comparison baselines so the
architecture choice is evidenced rather than asserted.

### Data

| Source | Approximate volume | Role |
|---|---|---|
| Locally collected (Bhimavaram) | ~1,950 | Realism, domain match, novelty claim |
| TrashNet | ~2,500 | Volume. Plain-background bias — never used alone for testing |
| TACO | ~1,500 | In-the-wild litter |
| Kaggle garbage-classification | ~15,000 | Volume |

The locally collected set is the project's claimed data contribution and the evidence for
the synopsis section 11 argument that Indian waste differs from TrashNet.

### Integrity measures

- **Group-aware splitting.** All photographs of the same physical object share an
  `object_id` and land in the same split. Random splitting would leak near-duplicates
  into the test set and inflate the reported accuracy.
- **Locked test set.** Held out and not consulted during iteration.
- **Macro-F1 and per-class precision/recall**, not plain accuracy — the class
  distribution is heavily imbalanced.
- **Temperature scaling.** Raw softmax is overconfident; the app displays the confidence
  figure to users, so it is calibrated on the validation split before it is shown.
- **Abstention thresholds.** Below a per-class cutoff the service returns "uncertain"
  and the app asks the user to choose. This continues the phase 0 principle that the
  system must never present a guess as a result.

### Serving

A FastAPI service holds the model in memory; `aiController` calls it over localhost. The
HTTP contract established in phase 0 is unchanged, so the Node backend, the mobile app,
the caching layer and the rate limiter are all indifferent to which implementation is
behind it. On-device TFLite inference remains the stretch goal it is in the synopsis.

---

## 6. Deliberate departures from the synopsis

Each of these is a scope decision. They belong in the thesis as stated limitations, not
hidden behind optimistic phrasing.

### 6.1 React Native (Expo), not a React PWA

Synopsis section 6 specifies a React PWA. A working React Native application already
exists. Rewriting it as a PWA is roughly six weeks of work that adds no capability the
project is evaluated on. Expo can additionally emit a web build if a browser target
becomes necessary.

### 6.2 Simulation and a labelled test set, not a 30–50 user pilot

Synopsis section 7 phase 7 assumes a live pilot with 30–50 users in one colony, and
section 8 lists behavioural metrics derived from it. Solo, inside sixteen weeks, that
cannot happen — recruitment, weeks of live collection, and before/after behavioural
surveys are months of non-coding work.

Substituted: the route-optimization simulation study (phase 3) and a hand-labelled
accuracy evaluation (phase 1). Both produce real, citable numbers.

This limitation is stated plainly in the thesis. A fabricated pilot is the one thing
that would genuinely sink the viva.

### 6.3 Custom TSP solver, not self-hosted OSRM

Synopsis section 6 specifies OSRM. A working K-means + TSP implementation already exists
in `services/routeOptimizer.js`. Self-hosting OSRM is roughly a week that the schedule
does not have, for a marginal accuracy gain in the simulation.

### 6.4 No hosted vision API

Synopsis module 1 proposes Gemini Vision for v1. Instead the classifier is trained here
(section 5a). This is a deliberate increase in difficulty, taken for its learning value
and because it converts the project's central claim — that Indian waste is not TrashNet
— from an assertion into a measured result on a dataset the project itself collected.

The cost is approximately four weeks, and it is what funds section 6.5.

### 6.5 M5 EPR ledger and PostgreSQL descoped

The synopsis specifies a hash-chained certificate ledger in PostgreSQL alongside MongoDB.
Both are dropped from the build to fund the custom classifier. Sixteen weeks solo does
not hold two hard, unfamiliar subsystems.

M5 is still designed and documented — schema, hash-chain construction, tamper-evidence
argument, and the reasoning for an ACID store — as a thesis chapter and as future work.
It is not implemented, and the thesis says so plainly.

The project therefore delivers four of five modules, with the fifth specified.

---

## 7. Evaluation

From synopsis section 8, adjusted for what is actually obtainable.

| Metric | Method | Target |
|---|---|---|
| Classifier accuracy | Per-class precision/recall and macro-F1 on a locked, group-disjoint test set | ≥85% top-1 |
| Classifier calibration | Expected calibration error before and after temperature scaling | Measured, reported |
| Abstention behaviour | Coverage/accuracy tradeoff across confidence thresholds | Measured, reported |
| Architecture choice | MobileNetV3-Small vs ResNet-18 vs EfficientNet-B0, accuracy against latency and size | Evidenced |
| Route efficiency | Optimized versus fixed-route baseline, in simulation | 25–40% distance reduction |
| Anti-gaming efficacy | Duplicate/spoofed reports rejected, on a synthetic adversarial set | Measured |

Behavioural and inclusion metrics from synopsis section 8 are **not obtainable** without
a live pilot, and are documented as future work.

---

## 8. Technologies exercised

PyTorch and transfer learning · dataset construction, labelling policy, and group-aware
splitting · model calibration and selective prediction · ONNX/TFLite export and
quantisation · FastAPI model serving · MongoDB geospatial indexing (`$2dsphere`,
`$near`) · K-means clustering · TSP heuristics · Socket.IO real-time transport.

---

## 9. Principal risks

| Risk | Mitigation |
|---|---|
| Data collection under-delivers, leaving too few images per class | Public datasets carry volume; weekly count checkpoint against the per-class quota; `Hazardous` is the class at real risk and is tracked separately |
| Model trains well but fails on real photographs (domain gap) | Test set drawn only from locally collected photos, never TrashNet |
| Reported accuracy is inflated by near-duplicate leakage | `object_id` grouping enforced in the split script, not left to discipline |
| No local GPU; Colab session limits | Train on Colab T4; checkpoint every epoch to Drive |
| Preprocessing differs between training and serving | Single `preprocess.json` consumed by both, asserted at service start |
| M1 overruns week 7 and eats M2 | Hard checkpoint at end of week 5: if no model beats 75% macro-F1, fall back to a hosted API for v1 and keep the custom model as the documented stretch goal |
| Scope creep back toward the full synopsis | This document is the scope of record; changes to it are explicit, not implicit |
