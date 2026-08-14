# Dataset Collection Plan

How to get from an empty `data/raw/` to the 2,050 photographs
[LABELLING-POLICY.md](./LABELLING-POLICY.md) asks for.

The policy says *what* a correct photograph is. This says *where the photographs come
from, who takes them, and in what order* — and it settles the one question the policy
leaves open: whether public datasets may be used at all.

---

## The rule about downloaded images, settled

The policy says:

> Original photographs only. No downloaded images, screenshots, or forwarded pictures.

`scripts/ingest_public.py` copies images out of TrashNet and TACO. Both cannot be
unconditionally true, so the resolution is:

**Public datasets may be used for training. They may never appear in validation or
test.**

That is not a compromise, it is the technically correct arrangement:

- Extra volume in training helps a 2.5M-parameter network learn what plastic looks
  like, whatever the background.
- A test set containing TrashNet reports accuracy on studio photographs of single
  items on white paper. The app receives a crushed bottle on a wet road at dusk. The
  number would be real, and about a different problem.
- Validation is where the temperature scaling and the abstention thresholds are
  fitted, and the app prints that confidence to users. Fitted on studio photographs,
  it is wrong about the photographs users send.

`prepare_dataset.py` enforces this: public images go to train, and the held-out sets
are local-only. `--allow-public-holdout` overrides it, and prints a warning saying the
resulting score is not a measurement.

So: **every reported number in the thesis is measured on photographs the team shot.**
That satisfies the intent of the policy rule, and the rule text is amended accordingly
below rather than quietly ignored.

> Original photographs only for anything that is measured. Public-dataset images are
> permitted in the training split, tagged `source=<dataset>`, and never in validation
> or test.

---

## Budget

2,200 photographs: 1,390 local, 810 public.

| Class | Total | Shoot | Public | Public sources |
|---|---:|---:|---:|---|
| Plastic | 350 | 210 | 140 | TrashNet, TACO |
| Paper | 250 | 150 | 100 | TrashNet, TACO |
| Organic | 250 | 170 | 80 | garbage12 (biological) |
| Glass | 200 | 120 | 80 | TrashNet, TACO |
| Metal | 200 | 120 | 80 | TrashNet, TACO |
| Electronic | 260 | 140 | 120 | Open Images (9 device classes) |
| Textile | 200 | 140 | 60 | garbage12 (clothes + shoes) |
| Wood | 150 | **150** | 0 | no public class exists |
| Hazardous | 150 | **120** | 30 | garbage12 (battery) only |
| NotWaste | 190 | 70 | 120 | Open Images (plants, furniture, doors, trees) |
| **Total** | **2,200** | **1,390** | **810** | |

**1,390 local photographs is about 695 physical objects** at the policy's average of
two shots each. That is the number to plan around — objects, not photographs. Split
across four collectors it is roughly 175 objects each, which is three to four weeks of
noticing rubbish rather than a marathon.

### Why no class is filled from public data alone

Public images are confined to the training split, so a class with no local photographs
has nothing in validation or test: no precision, no recall, no F1, an empty row in the
confusion matrix. It would be trained and unmeasured, which is worse than absent —
absent is at least visible.

At a 15% test share, ~130 local images in a class yields ~20 test images, which is the
floor for a number worth quoting. That is why Electronic keeps 140 local photographs
even though Open Images could supply hundreds more, and why Wood and Hazardous — where
public data offers nothing usable — stay entirely local.

Watch the smallest held-out sets: Glass and Metal at 120 local images give a test split
of about 18 images each. That is enough to detect a broken class, not enough to quote a
precise per-class F1. NotWaste at 70 local is thinner still, which is tolerable only
because its job is measured by the abstention curve rather than per-class F1. If time
allows, spend it on Glass, Metal and Hazardous first.

---

## Where to find each class

Areas match the `area` column: `home · hostel · market · street · college · temple`.

**Plastic — 210.** Easiest class, so it is also where padding creeps in. Water and
soft-drink bottles, shampoo and oil bottles, buckets and mugs, chips and kurkure
packets, carry bags, food-delivery containers, toothpaste tubes, pens, broken
stationery, thermocol packaging, disposable cutlery. *Get the crushed and faded ones —
a bottle that has been under a truck is what the model actually needs.*

**Paper — 150.** Newspaper, notebooks, exam paper, cardboard cartons (Amazon,
Flipkart), egg trays, paper bags, envelopes, Tetra Pak milk and juice cartons, book
covers, wet cardboard after rain (`condition=wet`). College and hostel bins are full of
this a week after exams.

**Organic — 170.** Vegetable peel, fruit skins and rinds, eggshells, tea leaves and
used tea bags, leftover food, garden leaves, flowers from temple offerings, coconut
shell and husk, used tissues, paper plates with food on them. Kitchens after cooking,
markets at closing time, temples in the evening.

**Glass — 120.** Bottles (soft drink, beer, medicine, perfume, sauce), jars, drinking
glasses, jam jars, broken pieces. **Photograph broken glass where it lies. Do not pick
it up.** Kirana shops and market backyards have crates of empties.

**Metal — 120.** Cans and tins, steel utensils, cutlery, nails and screws, wire, bottle
caps, aluminium foil, keys, old locks, bicycle parts, cooking-gas regulators. Rusted
items are worth more than clean ones — hunt for `condition=rusted`.

**Electronic — 200, all local.** The class that needs planning, because nobody throws
these away weekly. Old phones and chargers, cables, earphones, keyboards, mice, remote
controls, calculators, LED bulbs (LED is Electronic; CFL and tube light are
**Hazardous**), routers, circuit boards, pen drives, headphones, adapters. Ask the
college computer lab and the electronics department for their scrap drawer, then ask
the campus repair shop — one afternoon in either yields more than a month of hostel
scavenging. Photograph one item at a time even from a pile.

**Textile — 140.** Old clothes, torn shirts, socks, chappals and shoes (Textile by
policy), bags, curtains, bedsheets, cleaning rags, caps, towels. Hostel rooms at the
end of a term, and any tailor's offcut bin.

**Wood — 150, all local.** Broken furniture pieces, planks, sticks and twigs, agarbatti
sticks, matchboxes and matchsticks, wooden spoons, ice-cream sticks, pencil shavings,
packing crates, plywood offcuts, sawdust piles. Carpenter's shops and construction
sites; ask before photographing on private property.

**Hazardous — 120 local + 30 public. Chase this first.** It is the class most likely to
be short on the last day, and the least likely to turn up by accident. Batteries of
every kind (AA, button, phone, laptop), medicine blister strips and expired tablets,
CFL and tube lights, paint tins, pesticide and phenyl bottles, nail-polish remover,
mosquito coils and repellents, thermometers, spray cans, motor-oil containers, e-waste
with batteries in it.

> **Safety.** Do not open, crush or heat a battery. Do not touch broken CFL or tube
> lights — mercury. Photograph syringes, needles, sanitary waste and anything that
> looks medical **from a distance, without touching**, and leave them. Gloves for
> anything wet or sharp. Skip anything that looks like hospital waste entirely.

Where to look: the college first-aid room and lab stores, the campus generator or
maintenance room, any electrical or hardware shop's discard bin, and a pharmacy — most
will let you photograph expired stock if you explain what it is for. Ask; do not raid
bins.

**NotWaste — 100, all local.** The class that teaches the model to abstain. Empty
floors, walls, tables, doors, the sky, grass, trees and potted plants, hands (**no
faces**), books being read, a phone on a desk, a full plate of food, chairs, road
surfaces. Roughly the images produced by someone opening the camera and pointing it at
nothing in particular — because that is exactly what happens in the app.

---

## Which public dataset supplies what

| Dataset | Contributes | Cost |
|---|---|---|
| **TrashNet** (~2,500 images) | Plastic, Glass, Metal, Paper, cardboard | Every image is one item on plain white. Volume only; models score 90%+ on it and collapse on real photographs |
| **Kaggle Garbage Classification, 12 classes** (~15,500) | Plastic, Glass ×3 colours, Metal, Paper, cardboard, biological → Organic, clothes + shoes → Textile, battery → Hazardous | The broadest class coverage available; still mostly clean product-style shots |
| **TACO** (~1,500 images, 4,784 annotations) | Plastic, Metal, Glass, Paper, Organic, Battery | Real litter in real places — the closest public data to actual input. Detection-format: several objects per image, so crops must be taken per annotation, and images with mixed materials in one crop are unusable under the one-item rule |
| **Open Images V7** (validation split) | Electronic (9 device classes), NotWaste (plants, furniture, doors, trees, books) | Not a waste dataset at all — objects in use, not discarded. The only free source for the two classes no waste dataset covers. Also detection-format, so it needs cropping |

Already wired up in `scripts/ingest_public.py`, including the categories it
deliberately refuses to map: TrashNet `trash` and TACO `Unlabeled litter` are mixed
bags by definition, and forcing them into a class teaches noise. TACO `Cigarette` is
too small to classify from a phone photograph.

Three mappings deserve a second look before you trust them:

- **`battery → Hazardous`** is the only public route into Hazardous, and it is correct
  under the policy (battery overrides Electronic). But it makes the public part of
  Hazardous *entirely batteries*, so the local 120 must carry blister strips, CFLs,
  paint tins and pesticide bottles by themselves.
- **`cardboard → Paper`** is right by dominant mass, but the two look different enough
  that Paper ends up with two visual modes. Fine; just do not be surprised by the
  confusion matrix.
- **`shoes → Textile`** follows the policy's chappals rule. A leather shoe is not
  textile in any material sense — the class is "wearables", and the model card should
  say so.

### The 570, source by source

Which source supplies which class is not a free choice. TrashNet has only four
materials. TACO has 8 `Food waste` annotations and 2 `Battery` in 1,500 photographs, so
it cannot supply Organic or Hazardous whatever the plan says. garbage12 is the only
public route into Organic, Textile and Hazardous, and it is also the weakest visually,
so it is confined to exactly those three.

| Class | TrashNet | garbage12 | TACO | Open Images | Total |
|---|---:|---:|---:|---:|---:|
| Plastic | 100 | — | 40 | — | 140 |
| Paper | 70 | — | 30 | — | 100 |
| Glass | 74 | — | 6 | — | 80 |
| Metal | 55 | — | 25 | — | 80 |
| Organic | — | 80 | — | — | 80 |
| Textile | — | 60 (30 clothes + 30 shoes) | — | — | 60 |
| Hazardous | — | 30 | — | — | 30 |
| Electronic | — | — | — | 120 | 120 |
| NotWaste | — | — | — | 120 | 120 |
| **Total** | **299** | **170** | **101** | **240** | **810** |

Glass is the one that did not come out as planned: TACO's glass is `Broken glass`,
mostly shards too small to survive the crop filters, so it yielded 6 of the 25 asked
for and TrashNet covers the difference. Glass is therefore the most studio-biased class
in the public half — worth knowing when the confusion matrix is read.

```bash
# 1. TrashNet — 43 MB, direct download, no account
curl -L -o trashnet.zip https://github.com/garythung/trashnet/raw/master/data/dataset-resized.zip
python -c "import zipfile; zipfile.ZipFile('trashnet.zip').extractall('trashnet')"
python scripts/ingest_public.py --source trashnet --path trashnet/dataset-resized \
    --limit Plastic=100 --limit Paper=70 --limit Glass=74 --limit Metal=55

# 2. garbage12 — 251 MB. The Kaggle original needs an account; this is the same
#    12 folders mirrored on Hugging Face, which needs none.
curl -L -o garbage12.zip https://huggingface.co/datasets/UdaraChamidu/Garbage-Classification-with-12-classes/resolve/main/garbage_classification.zip
python -c "import zipfile; zipfile.ZipFile('garbage12.zip').extractall('garbage12')"
G=garbage12/garbage_classification
python scripts/ingest_public.py --source garbage12 --path $G --only biological --limit Organic=80
python scripts/ingest_public.py --source garbage12 --path $G --only clothes    --limit Textile=30
python scripts/ingest_public.py --source garbage12 --path $G --only shoes      --limit Textile=30
python scripts/ingest_public.py --source garbage12 --path $G --only battery    --limit Hazardous=30

# 3. TACO — annotations are 10 MB; the photographs come from Flickr on demand
curl -L -o annotations.json https://raw.githubusercontent.com/pedropro/TACO/master/data/annotations.json
python scripts/crop_taco.py --annotations annotations.json --out taco_crops \
    --limit Plastic=40 --limit Paper=30 --limit Glass=25 --limit Metal=25
python scripts/ingest_public.py --source taco --path taco_crops

# 4. Open Images — Electronic and NotWaste, the two classes no waste dataset has.
#    Annotations are 25 MB; the photographs come from a public S3 bucket on demand.
curl -L -o validation-bbox.csv \
    https://storage.googleapis.com/openimages/v5/validation-annotations-bbox.csv
python scripts/crop_openimages.py --annotations validation-bbox.csv --out oi_crops \
    --limit Electronic=120 --limit NotWaste=120 --max-per-category 20
python scripts/ingest_public.py --source openimages --path oi_crops
```

Three flags carry the weight:

- **`--limit Class=N`** sets the cap per class, because the budget above differs by
  class and `--limit-per-class` is one number. `Class=0` means *take none of this class
  from this source* — that is how garbage12 is kept out of Plastic, Paper, Glass and
  Metal, where TrashNet and TACO are better.
- **`--only FOLDER`** restricts which folders of the download are read. Without it,
  `--limit Textile=60` takes all 60 from `clothes` (5,325 images, read first) and none
  from `shoes` — and the policy's chappals rule means shoes are exactly what Textile
  needs.
- **`--dry-run`** first, always.

Re-running with a larger cap is the normal way to top a class up: images already
present count towards the cap and are not copied again.

Never run without caps. garbage12's 15,500 images bury the 1,480 the team shot, the
loss is dominated by studio photographs, and the model learns white backgrounds.

### TACO needs cropping first

TACO is a detection dataset: one photograph holds several objects of several materials,
so dropping it whole into a class folder would label every one of them the same.
`scripts/crop_taco.py` cuts each annotation into its own image, pads it to fill about
70% of the frame, and writes it into a folder named after TACO's supercategory — which
is what `ingest_public.py --source taco` already maps.

It refuses crops that would break the policy: objects under 120 px or under 1.5% of the
photograph (unreadable once scaled to 224), and any crop where a second annotated
object covers more than 12% of the padded frame (that is two items in one photograph).
On the run above, 1,405 annotations were unmappable by category, 196 too small, and 4
had another object in frame.

Fetching is on demand, so ~100 photographs are downloaded rather than all 1,500. Some
of TACO's Flickr links have rotted; the script reports what it could not fetch and
carries on.

### Open Images is not a waste dataset

It is the only free source for Electronic and NotWaste, and it comes with a caveat that
belongs in the model card: **its objects are in use, not discarded.** A keyboard here is
a working keyboard on a desk; a television is a television in a living room. The
material label stays honest — a keyboard is Electronic whether or not it has been
thrown away — but the dirt, damage and floor-level framing of real e-waste are absent.

That is exactly the gap the 140 local Electronic photographs fill, and why they are
worth taking even though Open Images could supply hundreds more.

`NotWaste` is the easier half: that class only needs things that are not discardable
items, and a houseplant in a living room is precisely that. What Open Images does *not*
have is bare walls, empty floors and hands — nobody photographs those on purpose, and
they are exactly what a user does by accident. Hence 70 local photographs there too.

`scripts/crop_openimages.py` works like `crop_taco.py`, with two extra filters: Open
Images marks drawings and paintings `IsDepiction=1`, and heaps of objects `IsGroupOf=1`.
Both are excluded. `--max-per-category` caps each device class, because the validation
split holds 147 `Camera` boxes and 9 `Remote control` boxes and Electronic would
otherwise be mostly cameras.

`Light bulb` is deliberately unmapped: LED is Electronic and CFL is Hazardous under the
policy, and Open Images does not distinguish them, so the label would be a guess.

---

## Folder structure

```
ml/data/
  raw/
    Plastic/        Plastic_HM_0001.jpg …          ← local, from new_batch.py
                    trashnet_plastic_img_12.jpg …  ← public, from ingest_public.py
    Glass/  Metal/  Paper/  Organic/
    Electronic/  Textile/  Wood/  Hazardous/
    NotWaste/
    Doubtful/       ← items the policy does not cover; ruled on before training
  metadata.csv           one row per local photograph  (in git)
  metadata.template.csv  the header, to start from     (in git)
  public_metadata.jsonl  provenance, appended by ingest_public.py
  manifest.csv           generated
  splits/{train,val,test}.csv   generated
```

`data/raw/` and the generated files are gitignored — photographs do not belong in git.
`metadata.csv` is not: it is small, it is the part that is expensive to recreate, and
it is what the thesis describes.

`Doubtful/` is not a class. `prepare_dataset.py` ignores any folder outside `CLASSES`,
and `check_dataset.py` warns while it is non-empty. Nothing waits there past a training
run — decide, move it, record the decision in the policy's ambiguous-case table.

---

## metadata.csv

Start from the template:

```bash
cp data/metadata.template.csv data/metadata.csv
```

```csv
filename,object_id,condition,background,lighting,collector,area,source
Plastic_HM_0001.jpg,HM-Plastic-001,crushed,road,sun,HM,street,local
Plastic_HM_0002.jpg,HM-Plastic-001,crushed,grass,shade,HM,street,local
Plastic_HM_0003.jpg,HM-Plastic-002,clean,table,indoor,HM,home,local
Hazardous_HM_0001.jpg,HM-Hazardous-001,faded,hand,indoor,HM,college,local
```

The first two rows are the same bottle, twice, from different backgrounds and light —
one `object_id`, two rows. That is the entire mechanism protecting the test score.

Permitted values are fixed in `wasteml/config.py` and enforced by `check_dataset.py`:

| Column | Values |
|---|---|
| `condition` | clean, dirty, wet, crushed, torn, faded, rusted |
| `background` | floor, table, ground, grass, road, hand, bin, cloth |
| `lighting` | sun, shade, indoor, evening, flash |
| `area` | home, hostel, market, street, college, temple |
| `collector` | the collector's initials, 2–4 letters |
| `source` | `local`, or the public dataset's name |

Free text here would be metadata nobody can group by — `wet`, `Wet` and `damp` become
three conditions and the coverage report becomes fiction.

---

## Importing a batch

Shoot into one folder per session, then hand it to `new_batch.py`. It generates the
filenames, allocates the `object_id`s, copies the files, and writes the metadata rows.

```bash
# One object, three shots, then the next object — group-size 3
python scripts/new_batch.py --class Plastic --collector HM --inbox ~/phone/2026-08-13 \
    --group-size 3 --condition crushed --background road --lighting sun --area street \
    --dry-run

# Looks right? Drop --dry-run.
python scripts/new_batch.py --class Plastic --collector HM --inbox ~/phone/2026-08-13 \
    --group-size 3 --condition crushed --background road --lighting sun --area street
```

- Numbering is per class **and** per collector, read from what is already on disk, so
  two people importing at once cannot collide and an interrupted import cannot
  desynchronise.
- `--group-size N` makes every N consecutive files (sorted by name, so by capture time)
  one object. **Shoot one object completely, then move to the next** — interleaving
  breaks the grouping silently.
- Files are copied, never moved. Keep the phone's copy until `check_dataset.py` passes.
- Where the metadata differs per photograph, put it in a sidecar CSV with a
  `source_filename` column and pass `--sidecar`; it overrides the flags per file.

Batch by *condition and place*, not by convenience — one invocation per session per
place per condition keeps the flags honest. A batch flagged `clean/table/indoor` that
actually contains half a market's worth of wet peel is worse than no metadata, because
the coverage report will say the dataset is varied when it is not.

---

## Checking

```bash
python scripts/check_dataset.py
python scripts/check_dataset.py --strict   # before training: warnings fail too
```

Errors — each corrupts a label or the split, and training on them wastes the run:

- a filename that does not match `Class_Initials_Number`
- `Plastic_HM_0042.jpg` sitting in `Glass/`
- a photograph with no metadata row, or a blank `object_id`
- a metadata row whose photograph has been deleted
- one `object_id` used in two classes
- the same image bytes stored twice
- a condition/background/lighting/area outside the vocabulary
- an object appearing in two splits

Warnings — real, but a judgement call:

- more than three shots of one object
- a class below 150, or below its target
- fewer than 40% damaged or dirty items in a class
- fewer than three backgrounds or three lightings in a class
- `Doubtful/` not empty

Only byte-identical duplicates are detected. Two photographs of one bottle a second
apart are near-identical but not identical — that is what `object_id` and the
three-shot cap exist for, and why `check_dataset.py` cannot replace either.

Then:

```bash
python scripts/prepare_dataset.py
```

which refuses to emit a leaking split, and keeps public images out of val and test.

---

## Order of work

The sequencing matters more than the schedule. Each stage answers a question that
changes what the next one does.

**1 — Calibrate, ~50 photographs.** Every collector shoots five objects, imports them,
and runs `check_dataset.py`. Then all of them label the same ten difficult items
independently — a Tetra Pak, a blister strip, a chappal, a paper plate with food on it,
a CFL bulb, an LED bulb, a steel tin with a paper label, a dried paint tin, a chips
packet, a coconut shell. Every disagreement is a line the policy needs, added before
anyone shoots in volume. Ten minutes here saves a relabelling pass over 700 objects.

**2 — Hazardous and Electronic, ~320 photographs.** The two classes that need
permission from someone: the lab, the maintenance room, the pharmacy, the repair shop.
Asking takes days of waiting, so start the waiting immediately. These are also the two
that quietly come up short, and finding that out in week one is recoverable.

**3 — Everything else, ~1,000 photographs.** Plastic, Paper, Organic, Glass, Metal,
Textile, Wood, NotWaste. Split by area rather than by class — one person takes the
market, one the hostel, one the college, one the street — because the same person
shooting all the Plastic produces 350 photographs with one person's framing habit in
every one of them.

**4 — Fill the gaps.** Run `check_dataset.py` and shoot exactly what the coverage
report asks for: the class below 40% damaged, the class shot only indoors, the one
short of its target. Do not shoot generally at this stage; shoot the report.

**5 — Ingest public data.** Last, with `--limit-per-class` set from the budget table
and after the local set is close to complete. Doing this first is the mistake to avoid:
the counts look healthy, the pressure comes off, and the local set never gets finished.

**6 — Freeze.** `check_dataset.py --strict`, then `prepare_dataset.py`, then train.
After the first real training run, adding photographs changes the split, so the
comparison between two models stops being a comparison. Add data before the freeze or
in a deliberate second round with the seed unchanged — never quietly in between.

---

## Habits that decide whether this works

**Photograph rubbish at the moment you see it.** A collection trip yields tidy items
photographed on the same three surfaces. Real waste is encountered, not sought.

**Half of everything should be damaged, dirty, wet, crushed, faded or rusted.** This is
the single requirement most likely to be quietly dropped, because clean items are
easier to photograph and look better on a screen. A model trained on tidy objects is
confidently wrong about every photograph the app will ever receive.

**One item per frame, no exceptions.** A bottle and a wrapper together is not a Plastic
photograph, it is two objects and an unanswerable question about which one the label
refers to.

**Three shots of one object, each genuinely different.** A different background, a
different light, or a different angle — not the same photograph taken again.

**When unsure, `Doubtful/`.** Never guess. A guess becomes a permanent contradiction
in the training set, and it is invisible afterwards.

**No faces, no people, no house numbers, no name boards, no number plates.**
