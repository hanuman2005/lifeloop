"""Map a downloaded public dataset into our class folders.

    python scripts/ingest_public.py --source trashnet --path ~/Downloads/dataset-resized
    python scripts/ingest_public.py --source garbage12 --path ~/Downloads/garbage
    python scripts/ingest_public.py --source taco --path ~/Downloads/TACO/data

Public data supplies volume; the locally collected photographs supply realism. Both
are needed, and they are tagged differently in the manifest so the thesis can report
how the model performs on each.

Files are copied, never moved — the download stays intact so a mapping mistake can be
corrected by re-running rather than re-downloading.

**On TrashNet specifically:** every image is a single item on a plain white background.
Models reach 90%+ on it and then collapse on real photographs. It is useful for volume
and useless as a measure of anything. `--source trashnet` tags every file
`source=trashnet` so it can be excluded from the test split later.
"""

import argparse
import json
import shutil
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

# Folder name in the download -> our class. None means "discard": a category we
# cannot map honestly is dropped rather than forced into an approximate class.
MAPPINGS = {
    # TrashNet — 6 categories, plain white backgrounds
    "trashnet": {
        "plastic": "Plastic",
        "glass": "Glass",
        "metal": "Metal",
        "paper": "Paper",
        "cardboard": "Paper",
        "trash": None,  # a mixed bag by definition; forcing it would teach noise
    },
    # Kaggle "Garbage Classification" — 12 categories
    "garbage12": {
        "plastic": "Plastic",
        "white-glass": "Glass",
        "green-glass": "Glass",
        "brown-glass": "Glass",
        "metal": "Metal",
        "paper": "Paper",
        "cardboard": "Paper",
        "biological": "Organic",
        "clothes": "Textile",
        "shoes": "Textile",
        "battery": "Hazardous",
        "trash": None,
    },
    # TACO — litter in the wild. Its supercategory names vary by release, so this
    # covers the common ones; unmapped folders are reported, not guessed at.
    "taco": {
        "Bottle": "Plastic",
        "Bottle cap": "Plastic",
        "Plastic bag & wrapper": "Plastic",
        "Plastic container": "Plastic",
        "Plastic utensils": "Plastic",
        "Straw": "Plastic",
        "Lid": "Plastic",
        "Other plastic": "Plastic",
        "Styrofoam piece": "Plastic",
        "Can": "Metal",
        "Aluminium foil": "Metal",
        "Metal bottle cap": "Metal",
        "Scrap metal": "Metal",
        "Broken glass": "Glass",
        "Glass jar": "Glass",
        "Glass bottle": "Glass",
        "Paper": "Paper",
        "Carton": "Paper",
        "Paper bag": "Paper",
        "Cardboard": "Paper",
        "Food waste": "Organic",
        "Battery": "Hazardous",
        "Blister pack": "Hazardous",  # pharmaceutical residue overrides the foil-plastic
        "Squeezable tube": "Plastic",
        "Plastic glooves": "Plastic",  # TACO's spelling
        "Pop tab": "Metal",
        "Shoe": "Textile",  # the policy groups footwear with wearables
        "Cigarette": None,  # too small to classify from a phone photo
        "Cup": None,  # paper and plastic cups share the category; the label is unknowable
        "Rope & strings": None,  # nylon or jute, indistinguishable in a crop
        "Unlabeled litter": None,
    },
    # Open Images V7 — not a waste dataset at all. It is the only free source for the
    # two classes no waste dataset covers: consumer electronics, and photographs of
    # things that are not rubbish. Its objects are in use rather than discarded, so a
    # keyboard here is a working keyboard on a desk. The material label stays honest —
    # a keyboard is Electronic whether or not it has been thrown away — but the
    # "discarded" look is missing, which is why these stay out of the held-out sets.
    # See crop_openimages.py.
    "openimages": {
        "Computer keyboard": "Electronic",
        "Computer mouse": "Electronic",
        "Mobile phone": "Electronic",
        "Laptop": "Electronic",
        "Printer": "Electronic",
        "Television": "Electronic",
        "Remote control": "Electronic",
        "Headphones": "Electronic",
        "Camera": "Electronic",
        # NotWaste is not a material: it is everyday things that are not discardable
        # items, so the model can decline instead of calling a wall Plastic.
        # ── Everyday and college objects ────────────────────────────────
        # Open Images is not a waste dataset. Its objects are in use — a shirt on a
        # person, a laptop on a desk — so it teaches the model what materials look
        # like, not what discarded things look like. That is still the gap worth
        # closing first: the classifier had never seen a printed document, and
        # called one Plastic.
        #
        # Only classes whose material is determinable from a photograph are mapped.
        # Teaching the model that a plastic chair is Wood would make it worse at
        # both, and the honest answer for a genuinely ambiguous object is the
        # `uncertain` flag the classifier already produces.

        # Paper. "Book" moved here from NotWaste: it contradicted the policy's core
        # rule, which is to label by what a thing is made of. A book is paper whether
        # or not it has been discarded.
        "Book": "Paper",
        "Envelope": "Paper",
        "Ring binder": "Paper",
        "Poster": "Paper",

        # Textiles. All fabric or leather regardless of use.
        "Backpack": "Textile",
        "Handbag": "Textile",
        "Suitcase": "Textile",
        "Boot": "Textile",
        "Sandal": "Textile",
        "Sock": "Textile",
        "Shirt": "Textile",
        "Jacket": "Textile",
        "Trousers": "Textile",
        "Hat": "Textile",
        "Scarf": "Textile",
        "Glove": "Textile",
        "Towel": "Textile",
        "Pillow": "Textile",

        # Electronics.
        "Computer keyboard": "Electronic",
        "Computer mouse": "Electronic",
        "Mobile phone": "Electronic",
        "Laptop": "Electronic",
        "Tablet computer": "Electronic",
        "Printer": "Electronic",
        "Television": "Electronic",
        "Remote control": "Electronic",
        "Headphones": "Electronic",
        "Camera": "Electronic",
        "Calculator": "Electronic",
        "Telephone": "Electronic",
        "Microwave oven": "Electronic",
        "Ipod": "Electronic",

        # Metal. Cutlery and hand tools are steel; a tin can is a tin can.
        "Tin can": "Metal",
        "Spoon": "Metal",
        "Fork": "Metal",
        "Knife": "Metal",
        "Frying pan": "Metal",
        "Kettle": "Metal",
        "Wrench": "Metal",
        "Scissors": "Metal",

        # Organic. Food only — Plant and Flower are living things, not waste.
        "Banana": "Organic",
        "Apple": "Organic",
        "Orange": "Organic",
        "Tomato": "Organic",
        "Potato": "Organic",
        "Bread": "Organic",
        "Vegetable": "Organic",
        "Fruit": "Organic",

        # Glass and plastic, only where the material is unambiguous.
        "Wine glass": "Glass",
        "Mirror": "Glass",
        "Plastic bag": "Plastic",
        "Toothbrush": "Plastic",

        # NotWaste — everyday things that are not discardable items, so the model
        # can decline instead of naming a material.
        "Houseplant": "NotWaste",
        "Tree": "NotWaste",
        "Chair": "NotWaste",
        "Door": "NotWaste",
        "Table": "NotWaste",
        "Flower": "NotWaste",
        "Plant": "NotWaste",

        # Deliberately absent, because a photograph cannot settle the material:
        #   Bottle, Cup, Bowl, Container, Jug  - plastic or glass
        #   Box, Carton                        - cardboard or plastic
        #   Pen, Ruler, Toy                    - plastic, wood or metal
        #   Vase                               - glass or ceramic
        #   Light bulb                         - LED is Electronic, CFL is Hazardous
        #   Paper towel, Toilet paper          - Paper unused, Organic once soiled
        #   Stool, Bench, Desk, Shelf, Ladder  - wood, metal or plastic; this is
        #                                        why Wood still has no data and
        #                                        needs photographs taken by hand
        # Deliberately absent: "Light bulb". LED is Electronic and CFL is Hazardous,
        # and Open Images does not distinguish them, so the label is unknowable.
    },
}


# prepare_dataset.py keeps these sources out of validation and test by name. If the
# two lists drift apart, a public dataset silently becomes eligible for the held-out
# set and the reported score stops describing real photographs.
# Subset rather than equality: not every public source arrives through folder
# mapping. scrape_images.py writes straight into the class folders and tags its own
# provenance, so it has no MAPPINGS entry. What must hold is that anything this
# script can ingest is a source prepare_dataset.py recognises — otherwise a public
# dataset silently becomes eligible for validation and test, and the reported score
# stops describing real photographs.
unknown_sources = set(MAPPINGS) - config.PUBLIC_SOURCES
assert not unknown_sources, (
    f"MAPPINGS has sources config.PUBLIC_SOURCES does not know: {sorted(unknown_sources)}"
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, choices=sorted(MAPPINGS))
    parser.add_argument("--path", required=True, type=Path, help="the extracted download")
    parser.add_argument("--dest", type=Path, default=config.RAW_DIR)
    parser.add_argument("--limit-per-class", type=int, default=None,
                        help="cap per class, to stop one public set from dominating")
    parser.add_argument("--limit", action="append", metavar="Class=N", default=[],
                        help="per-class cap, repeatable: --limit Plastic=100 --limit Glass=40. "
                             "Overrides --limit-per-class for that class. The budget in "
                             "COLLECTION-PLAN.md differs by class, so one number cannot express it")
    parser.add_argument("--only", action="append", metavar="FOLDER", default=[],
                        help="read only these folders of the download, repeatable. "
                             "Needed when several of them feed one class: --limit "
                             "Textile=60 alone would take all 60 from `clothes` and "
                             "none from `shoes`, because folders are read in order")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.path.exists():
        print(f"❌ {args.path} does not exist")
        return 1

    limits = {}
    for item in args.limit:
        class_name, _, value = item.partition("=")
        if class_name not in config.CLASSES or not value.isdigit():
            print(f"❌ --limit {item!r} must be Class=N, e.g. Plastic=100")
            return 1
        limits[class_name] = int(value)

    def cap_for(class_name: str):
        return limits.get(class_name, args.limit_per_class)

    mapping = MAPPINGS[args.source]
    copied = Counter()
    already = Counter()
    skipped = Counter()
    unmapped = []
    metadata_rows = []

    only = set(args.only)
    if only:
        unknown = only - set(mapping)
        if unknown:
            print(f"❌ --only names folder(s) with no mapping: {sorted(unknown)}")
            return 1

    for folder in sorted(p for p in args.path.rglob("*") if p.is_dir()):
        key = folder.name
        if only and key not in only:
            continue
        if key not in mapping:
            images = [f for f in folder.iterdir()
                      if f.is_file() and f.suffix.lower() in config.IMAGE_EXTENSIONS]
            if images:
                unmapped.append((key, len(images)))
            continue

        target_class = mapping[key]
        if target_class is None:
            n = sum(1 for f in folder.iterdir()
                    if f.is_file() and f.suffix.lower() in config.IMAGE_EXTENSIONS)
            skipped[key] += n
            continue

        dest_dir = args.dest / target_class
        if not args.dry_run:
            dest_dir.mkdir(parents=True, exist_ok=True)

        for image in sorted(folder.iterdir()):
            if not image.is_file() or image.suffix.lower() not in config.IMAGE_EXTENSIONS:
                continue
            cap = cap_for(target_class)
            # `is not None`, not truthiness: --limit Glass=0 means "take none from this
            # source", which is how one source is confined to the classes it is good at.
            if cap is not None and copied[target_class] >= cap:
                break

            # Prefix with the source so provenance survives in the filename, and so a
            # public file can never collide with a locally collected one.
            new_name = f"{args.source}_{key.replace(' ', '-')}_{image.name}"

            # Re-running with a larger cap is the normal way to top a class up, so an
            # image already here counts towards the cap and is not copied again. Without
            # this, the second run rewrites every file and appends a duplicate
            # provenance row for each.
            if (dest_dir / new_name).exists():
                copied[target_class] += 1
                already[target_class] += 1
                continue

            if not args.dry_run:
                shutil.copy2(image, dest_dir / new_name)

            copied[target_class] += 1
            metadata_rows.append(
                {
                    "filename": new_name,
                    # Public images are single-shot, so each is its own group.
                    "object_id": f"{args.source}-{new_name}",
                    "source": args.source,
                }
            )

    print(f"\n{'(dry run) ' if args.dry_run else ''}from {args.source}:")
    for cls in config.MATERIAL_CLASSES:
        if copied[cls]:
            print(f"  {cls:<12} {copied[cls]:>6}")
    print(f"  {'TOTAL':<12} {sum(copied.values()):>6}")

    if already:
        print(f"\n{sum(already.values())} already present from an earlier run "
              "(counted towards the cap, not copied again)")

    if skipped:
        print("\ndeliberately skipped (no honest mapping):")
        for key, n in skipped.items():
            print(f"  {key:<24} {n:>6}")

    if unmapped:
        print("\n⚠️  folders with images but no mapping — add them to MAPPINGS or ignore:")
        for key, n in unmapped[:15]:
            print(f"  {key:<24} {n:>6}")

    if not args.dry_run and metadata_rows:
        # Appended as JSONL so several ingests accumulate; merge_metadata folds these
        # into data/metadata.csv alongside the team's hand-recorded rows.
        out = config.DATA_DIR / "public_metadata.jsonl"
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "a", encoding="utf-8") as handle:
            for row in metadata_rows:
                handle.write(json.dumps(row) + "\n")
        print(f"\n💾 provenance appended to {out}")
        print("   next: python scripts/prepare_dataset.py")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
