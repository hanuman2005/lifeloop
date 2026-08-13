# Labelling Policy

Rules for assigning a class to a photograph. Decided before collection began, and
fixed. If two people label the same item differently the model learns contradictions,
so disagreements are resolved by this document rather than by argument.

Anything not covered goes in `data/raw/Doubtful/` and is ruled on before the next
training run. Never guess.

---

## Classes

```
Plastic · Glass · Metal · Paper · Organic · Electronic · Textile · Wood · Hazardous
```

Plus `NotWaste/` — photographs of things that are not discardable items (walls, floors,
hands, plants). These are not a predicted class; they exist so the model learns to
abstain rather than confidently classify a blank wall as Plastic.

---

## Core rule

**Label by what the item is predominantly made of, not by what it contained.**

A plastic bottle that held milk is Plastic. A steel tin with a paper label is Metal.

---

## Ambiguous cases

Composite items are the hard part. Where an item is genuinely two materials, the rule
is dominant mass, except where a hazard overrides.

| Item | Class | Reason |
|---|---|---|
| Chips / kurkure packet | **Plastic** | Multilayer plastic-foil laminate; behaves as plastic, not recyclable in practice |
| Tetra Pak (milk, juice) | **Paper** | Paper dominates by mass; flagged as composite in the advice text |
| Medicine blister strip | **Hazardous** | Pharmaceutical residue; overrides the plastic-foil composition |
| Battery of any kind | **Hazardous** | Overrides Electronic |
| CFL bulb, tube light | **Hazardous** | Mercury content; overrides Glass and Electronic |
| LED bulb | **Electronic** | No mercury |
| Used tissue, paper plate with food | **Organic** | Contamination makes paper recycling impossible |
| Chappals, shoes | **Textile** | Grouped with wearables |
| Coconut shell and husk | **Organic** | Compostable |
| Toothpaste tube | **Plastic** | Dominant material |
| Paint tin, empty and dried | **Hazardous** | Residue; overrides Metal |
| Steel tin with a paper label | **Metal** | Dominant mass |
| Thermocol / polystyrene | **Plastic** | Expanded polystyrene is a plastic |
| Agarbatti sticks, matchboxes | **Wood** | |
| Wet cardboard | **Paper** | Recorded as `condition=wet` in metadata |

**Hazard overrides everything.** If an item is hazardous, it is Hazardous regardless of
what it is made of.

---

## Photograph rules

Enforced at collection; violations are removed during preparation.

- **One item per photograph.** Never two different materials in one frame.
- The item fills 50–80% of the frame.
- Focused. Blurry photographs are deleted, not labelled.
- **Maximum 3 shots of one physical object**, and each must differ in background,
  lighting, or angle — not merely a nudge.
- Original photographs only. No downloaded images, screenshots, or forwarded pictures
  (recompression artifacts do not match camera output).
- No faces, people, house numbers, name boards, or vehicle number plates.

### Required variation

Roughly half of all photographs should show dirty, crushed, wet, faded, or damaged
items. A dataset of clean upright bottles produces a model that fails on real waste.

| Dimension | Cover all of |
|---|---|
| Background | floor, table, ground, grass, road, hand, inside a bin, cloth |
| Lighting | bright sun, shade, indoor tube light, evening, night with flash |
| Angle | top-down, 45°, side |
| Distance | close-up, arm's length |
| Condition | clean, dirty, wet, crushed, torn, faded, rusted |

---

## Safety

Do not pick up or handle broken glass, syringes, needles, sanitary waste, or any
medical waste. Photograph it where it lies, from a safe distance, and leave it. Wear
gloves for anything wet or sharp. If it looks like hospital waste, skip it — no
photograph is worth an injury.

---

## Filenames and metadata

```
Class_Initials_Number.jpg        e.g.  Plastic_HM_0042.jpg
```

One folder per class under `data/raw/`. Each collector uses their own initials so
numbering cannot collide.

`data/metadata.csv` — one row per photograph:

| Column | Notes |
|---|---|
| `filename` | must match exactly |
| `object_id` | **the important one** — same value for every shot of one physical object |
| `condition` | clean, dirty, wet, crushed, torn, faded, rusted |
| `background` | floor, table, ground, grass, road, hand, bin, cloth |
| `lighting` | sun, shade, indoor, evening, flash |
| `collector` | initials |
| `area` | home, hostel, market, street, college, temple |

### Why `object_id` matters

The train/test split is grouped by `object_id`, so every shot of one object stays in one
split. Without it, three shots of a bottle land in training and the fourth in test, and
the reported accuracy measures memorisation rather than generalisation.

That failure is invisible — it produces a number that looks *better* than the truth.
`scripts/prepare_dataset.py` refuses to emit a split that leaks, but it can only group
what the metadata declares.

---

## Target counts

| Class | Target |
|---|---|
| Plastic | 350 |
| Paper | 250 |
| Organic | 250 |
| Glass | 200 |
| Metal | 200 |
| Electronic | 200 |
| Textile | 200 |
| Wood | 150 |
| Hazardous | 150 |
| NotWaste | 100 |

**Total ≈ 2,050.** Below 150 in any class, that class cannot be evaluated meaningfully
and `prepare_dataset.py` will warn. Hazardous is the class most at risk — track it
separately and chase it early.
