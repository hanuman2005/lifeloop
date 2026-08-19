"""Collect training images from web image search.

    python scripts/scrape_images.py --class Wood --limit 200
    python scripts/scrape_images.py --class Paper --limit 150
    python scripts/scrape_images.py --all --limit 120
    python scripts/scrape_images.py --commit            # move reviewed images into the dataset

Fills gaps no public waste dataset covers. `Wood` has no images at all, and `Paper`
was 70% corrugated cardboard, which is why a flat printed document was classified
as Plastic.

## Two-step by design

Scraping writes to `data/scraped/<Class>/` and stops. `--commit` is what moves
images into `data/raw/`, and you should look at the folder first.

Search results are not a dataset. A query for "plastic waste" returns stock
photography, infographics, recycling logos, watermarked previews and the
occasional cartoon. None of that is a photograph of an item, and training on it
teaches the model that plastic looks like a stock photo. The review step exists
because no automatic filter catches this reliably.

## Queries ask for the discarded state, not the object

"wooden chair" returns furniture catalogues. "broken wooden chair discarded"
returns something closer to waste. Every query list below is written that way, and
it is the single biggest lever on whether scraped data helps or hurts.

## Provenance

Images are tagged `source=scraped`, which keeps them in the training split only —
`prepare_dataset.py` excludes public sources from validation and test. Reported
accuracy therefore never depends on scraped material.

Licensing is unverified per image. Fine for coursework; state it in the thesis
rather than leaving it implied, and do not redistribute the folder.
"""

import argparse
import hashlib
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

SCRAPE_DIR = config.DATA_DIR / "scraped"

# Deliberately phrased for discarded items rather than products. Several short
# queries beat one long one: each returns a different slice of results, and the
# overlap is removed by hashing anyway.
QUERIES = {
    "Wood": [
        "broken wooden chair discarded",
        "waste wood planks pile",
        "scrap timber offcuts",
        "old wooden furniture thrown away",
        "wooden crate broken discarded",
        "sawdust wood waste",
        "wooden pallet damaged discarded",
    ],
    "Paper": [
        "crumpled printed document waste",
        "waste paper office documents pile",
        "old newspapers stacked for recycling",
        "used notebooks discarded",
        "torn paper envelopes waste",
        "shredded paper waste bin",
        "cardboard boxes flattened recycling",
    ],
    "Plastic": [
        "crushed plastic water bottle litter",
        "plastic bag waste ground",
        "plastic food container dirty discarded",
        "plastic waste pile india",
    ],
    "Glass": [
        "broken glass bottle waste",
        "glass jars for recycling dirty",
        "glass bottle litter ground",
    ],
    "Metal": [
        "crushed aluminium can litter",
        "scrap metal pile waste",
        "rusty tin can discarded",
        "metal scrap kabadiwala india",
    ],
    "Organic": [
        "vegetable peel waste kitchen",
        "food waste compost pile",
        "banana peel litter ground",
        "rotten fruit waste",
    ],
    "Electronic": [
        "e waste circuit boards pile",
        "broken mobile phone discarded",
        "old chargers cables tangled waste",
        "e waste india scrap",
    ],
    "Textile": [
        "old clothes pile discarded",
        "torn cloth rags waste",
        "worn out shoes discarded",
    ],
    "Hazardous": [
        "used batteries pile waste",
        "discarded cfl tube light broken",
        "empty paint tin discarded",
        "medicine blister pack waste",
    ],
}

# Below this the image is a thumbnail or an icon, not a photograph the model can
# learn a texture from.
MIN_SIZE = (300, 300)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def existing_hashes() -> set:
    """Hashes already in the dataset, so a re-scrape cannot add the same file twice."""
    hashes = set()
    for class_dir in config.RAW_DIR.iterdir() if config.RAW_DIR.exists() else []:
        if not class_dir.is_dir():
            continue
        for image in class_dir.iterdir():
            if image.suffix.lower() in config.IMAGE_EXTENSIONS:
                try:
                    hashes.add(sha256(image))
                except OSError:
                    pass
    return hashes


def scrape_class(class_name: str, limit: int) -> int:
    from icrawler.builtin import BingImageCrawler

    queries = QUERIES.get(class_name)
    if not queries:
        print(f"  no queries defined for {class_name}")
        return 0

    target = SCRAPE_DIR / class_name
    target.mkdir(parents=True, exist_ok=True)

    per_query = max(1, limit // len(queries))
    print(f"\n{class_name}: {len(queries)} queries x ~{per_query} images")

    for query in queries:
        # A separate crawler per query keeps the storage prefix distinct, so files
        # from one query cannot overwrite another's.
        crawler = BingImageCrawler(
            downloader_threads=4,
            storage={"root_dir": str(target)},
            log_level=40,  # ERROR only; the default is extremely chatty
        )
        prefix = "".join(c if c.isalnum() else "_" for c in query)[:40]
        try:
            crawler.crawl(
                keyword=query,
                max_num=per_query,
                min_size=MIN_SIZE,
                file_idx_offset="auto",
                filters={"type": "photo"},  # excludes clipart and line drawings
            )
            print(f"  ✓ {query}")
        except Exception as error:  # noqa: BLE001
            print(f"  ✗ {query}: {error}")
        void = prefix

    return len(
        [p for p in target.iterdir() if p.suffix.lower() in config.IMAGE_EXTENSIONS]
    )


def clean(class_name: str, known: set) -> dict:
    """Remove duplicates, unreadable files and anything too small to be useful."""
    from PIL import Image

    target = SCRAPE_DIR / class_name
    if not target.exists():
        return {}

    stats = {"kept": 0, "duplicate": 0, "too_small": 0, "unreadable": 0}
    seen = set(known)

    for image in sorted(target.iterdir()):
        if image.suffix.lower() not in config.IMAGE_EXTENSIONS:
            image.unlink(missing_ok=True)
            continue

        try:
            with Image.open(image) as opened:
                width, height = opened.size
                opened.verify()
        except Exception:  # noqa: BLE001
            image.unlink(missing_ok=True)
            stats["unreadable"] += 1
            continue

        if width < MIN_SIZE[0] or height < MIN_SIZE[1]:
            image.unlink(missing_ok=True)
            stats["too_small"] += 1
            continue

        digest = sha256(image)
        if digest in seen:
            image.unlink(missing_ok=True)
            stats["duplicate"] += 1
            continue

        seen.add(digest)
        stats["kept"] += 1

    return stats


def commit() -> int:
    """Move reviewed images into the dataset and record their provenance."""
    if not SCRAPE_DIR.exists():
        print(f"❌ {SCRAPE_DIR} does not exist. Scrape something first.")
        return 1

    import json

    moved = {}
    rows = []

    for class_dir in sorted(SCRAPE_DIR.iterdir()):
        if not class_dir.is_dir() or class_dir.name not in config.CLASSES:
            continue

        destination = config.RAW_DIR / class_dir.name
        destination.mkdir(parents=True, exist_ok=True)

        count = 0
        for image in sorted(class_dir.iterdir()):
            if image.suffix.lower() not in config.IMAGE_EXTENSIONS:
                continue
            # Prefixed so provenance survives in the filename itself, and so a
            # scraped file can never collide with a collected one.
            name = f"scraped_{class_dir.name}_{image.name}"
            shutil.move(str(image), str(destination / name))
            rows.append({
                "filename": name,
                "object_id": f"scraped-{name}",  # single-shot, own group
                "source": "scraped",
            })
            count += 1

        if count:
            moved[class_dir.name] = count

    if rows:
        out = config.DATA_DIR / "public_metadata.jsonl"
        with open(out, "a", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row) + "\n")

    print("\ncommitted:", moved or "nothing")
    print(f"  {sum(moved.values())} images, tagged source=scraped (training split only)")
    print("  next: python scripts/prepare_dataset.py && python scripts/train.py")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--class", dest="class_name", choices=sorted(QUERIES))
    parser.add_argument("--all", action="store_true", help="scrape every class")
    parser.add_argument("--limit", type=int, default=150, help="images per class")
    parser.add_argument("--commit", action="store_true",
                        help="move reviewed images from data/scraped into data/raw")
    args = parser.parse_args()

    if args.commit:
        return commit()

    if not args.class_name and not args.all:
        parser.error("pass --class NAME, --all, or --commit")

    targets = sorted(QUERIES) if args.all else [args.class_name]
    known = existing_hashes()
    print(f"📚 {len(known)} images already in the dataset (used for deduplication)")

    for class_name in targets:
        scrape_class(class_name, args.limit)
        stats = clean(class_name, known)
        print(f"  {class_name}: kept {stats.get('kept', 0)}, "
              f"dropped {stats.get('duplicate', 0)} duplicate / "
              f"{stats.get('too_small', 0)} small / {stats.get('unreadable', 0)} unreadable")

    print(f"\n📂 review {SCRAPE_DIR} before committing.")
    print("   Delete stock photos, infographics, logos and anything that is not a")
    print("   photograph of an item. Then: python scripts/scrape_images.py --commit\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
