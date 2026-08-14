# Shooting List

The 1,390 photographs the team takes. Public datasets cover another 810 — see
[COLLECTION-PLAN.md](./COLLECTION-PLAN.md).

Counts are **objects**, at 2 photographs each. Tick items off as you go.

Rules that apply to every line: one item per frame · item fills 50–80% · max 3 shots of
one object, each with a different background, light or angle · **about half of
everything dirty, crushed, wet, faded or rusted** · no faces, name boards or number
plates.

---

## Plastic — 105 objects (210 photos)

- [ ] 20 water and soft-drink bottles
- [ ] 15 chips / kurkure / biscuit packets
- [ ] 12 shampoo, oil, detergent bottles
- [ ] 10 carry bags
- [ ] 8 food-delivery containers
- [ ] 8 buckets, mugs, tubs
- [ ] 8 pens and broken stationery
- [ ] 8 disposable cutlery and straws
- [ ] 6 thermocol pieces
- [ ] 5 toothpaste tubes
- [ ] 5 caps and lids

## Paper — 75 objects (150 photos)

- [ ] 12 notebooks, exam paper, loose sheets
- [ ] 12 cardboard cartons (Amazon, Flipkart)
- [ ] 10 Tetra Pak milk and juice cartons
- [ ] 10 newspaper
- [ ] 8 paper bags
- [ ] 6 envelopes and letters
- [ ] 6 magazines and book covers
- [ ] 6 wet cardboard (after rain)
- [ ] 5 egg trays

## Organic — 85 objects (170 photos)

- [ ] 15 vegetable peel
- [ ] 12 fruit skins and rinds
- [ ] 12 leftover food
- [ ] 8 tea leaves and used tea bags
- [ ] 8 garden leaves
- [ ] 8 temple flowers
- [ ] 8 coconut shell and husk
- [ ] 6 eggshells
- [ ] 4 used tissues
- [ ] 4 paper plates with food on them

## Glass — 60 objects (120 photos)

- [ ] 15 soft-drink and beer bottles
- [ ] 10 sauce and pickle jars
- [ ] 8 medicine bottles
- [ ] 8 drinking glasses
- [ ] 7 broken pieces — **photograph where they lie, do not pick up**
- [ ] 6 perfume and cosmetic bottles
- [ ] 6 jam jars

## Metal — 60 objects (120 photos)

- [ ] 15 cans and tins
- [ ] 10 steel utensils
- [ ] 8 nails, screws, wire
- [ ] 6 cutlery
- [ ] 6 aluminium foil
- [ ] 5 bottle caps
- [ ] 5 keys and old locks
- [ ] 5 bicycle or machine parts

Rusted ones are worth more than clean ones.

## Electronic — 70 objects (140 photos)

**Ask the college computer lab, the electronics department and the campus repair shop.
One afternoon there beats a month of hostel scavenging.**

- [ ] 10 chargers and adapters
- [ ] 8 cables and wires
- [ ] 7 earphones and headphones
- [ ] 7 keyboards and mice
- [ ] 7 LED bulbs — *LED is Electronic; CFL and tube light are Hazardous*
- [ ] 7 circuit boards
- [ ] 6 old phones
- [ ] 6 remote controls
- [ ] 4 routers and set-top boxes
- [ ] 4 pen drives and memory cards
- [ ] 4 calculators

Open Images supplies another 120 photographs of these devices, but they are working
devices on desks. **Yours are the broken, dusty, cable-tangled ones** — that contrast is
the whole reason to shoot them.

## Textile — 70 objects (140 photos)

- [ ] 20 old and torn clothes
- [ ] 15 chappals and shoes — *footwear is Textile by policy*
- [ ] 8 bags
- [ ] 8 curtains and bedsheets
- [ ] 8 cleaning rags
- [ ] 6 socks
- [ ] 5 caps and towels

## Wood — 75 objects (150 photos)

- [ ] 12 broken furniture pieces
- [ ] 12 sticks and twigs
- [ ] 10 planks and plywood offcuts
- [ ] 8 agarbatti sticks
- [ ] 8 matchboxes and matchsticks
- [ ] 8 ice-cream sticks
- [ ] 6 wooden spoons and ladles
- [ ] 6 packing crates
- [ ] 5 pencil shavings

## Hazardous — 60 objects (120 photos)

**Start this first. It is the class most likely to be short on the last day.**

- [ ] 12 AA / AAA batteries
- [ ] 12 medicine blister strips
- [ ] 8 CFL bulbs and tube lights — **do not touch, mercury**
- [ ] 6 button cells
- [ ] 6 phone and laptop batteries
- [ ] 6 expired tablets and syrup bottles
- [ ] 4 paint tins
- [ ] 4 pesticide and phenyl bottles
- [ ] 2 nail polish and remover

> Do not open, crush or heat a battery. Photograph syringes, needles, sanitary waste
> and anything medical **from a distance, without touching**, and leave them. Gloves
> for anything wet or sharp. Skip anything that looks like hospital waste.

## NotWaste — 35 objects (70 photos)

Things that are not rubbish, so the model learns to say "I don't know" instead of
guessing when someone points the camera at a wall.

- [ ] 6 sky, trees, grass
- [ ] 5 hands — **no faces**
- [ ] 4 empty floor
- [ ] 4 walls
- [ ] 4 tables and desks
- [ ] 4 potted plants
- [ ] 4 a book or phone lying on a desk
- [ ] 4 chairs and doors

Open Images covers the plants, furniture, doors and trees. **Bare walls, empty floors
and hands it does not** — nobody photographs a blank wall on purpose, which is exactly
what your users will do by accident.

---

## Spread the variation

Do not shoot one class in one place on one day. Across the whole set, cover:

| | |
|---|---|
| Background | floor, table, ground, grass, road, hand, inside a bin, cloth |
| Lighting | bright sun, shade, indoor tube light, evening, night with flash |
| Angle | top-down, 45°, side |
| Distance | close-up, arm's length |
| Condition | clean, dirty, wet, crushed, torn, faded, rusted |

## After each session

```bash
python scripts/new_batch.py --class Plastic --collector HM --inbox ~/phone/today \
    --group-size 2 --condition dirty --background road --lighting sun --area street
python scripts/check_dataset.py
```

One command per class per place per condition. `check_dataset.py` tells you what is
still missing — shoot that, not whatever is nearest.

Unsure what class something is? `data/raw/Doubtful/`. Never guess.
