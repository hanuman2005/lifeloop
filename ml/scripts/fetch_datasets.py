"""Download the public datasets that supply the five focus classes.

    python scripts/fetch_datasets.py --list
    python scripts/fetch_datasets.py --source realwaste
    python scripts/fetch_datasets.py --all

Each dataset lands in its own directory under `ml/data/downloads/<source>/` and
is never executed, imported from or built in. Downloaded archives are untrusted
input: this script only writes them, checks the magic bytes and extracts them.
Nothing in this file runs a notebook, setup.py or loader shipped inside one.

Why these datasets and not the usual ones
-----------------------------------------
The project already holds 3,170 images, most of them from TrashNet (2016) and
the 12-class Kaggle garbage set. Both are studio photography: one item, plain
background, even light. A model trained and tested on that kind of image scores
in the nineties and then fails on the first real photograph, which is precisely
the failure report §3.2 Gap 3 describes.

So the sources below are chosen on two axes. Recency, because a 2016 dataset
predates the phone cameras and the packaging that citizens photograph today.
And provenance: each is marked `studio` or `field`, and only `field` sources may
enter validation and test (see `config.FIELD_SOURCES`). That makes the
evaluation cross-domain by construction — train on curated images, measure on
real ones.

Credentials
-----------
Kaggle sources need `~/.kaggle/kaggle.json`, which is free: Kaggle → Settings →
API → Create New Token. Without it those sources are skipped with a message
rather than failing the run. Everything marked `direct` needs nothing.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

DOWNLOAD_DIR = config.DATA_DIR / "downloads"

# A browser user-agent. Several dataset hosts return 403 to the default
# urllib agent, and the failure looks like a dead link rather than a refusal.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


@dataclass(frozen=True)
class Source:
    """One public dataset, and how to get it."""

    name: str  # must match an ingest_public.py MAPPINGS key
    title: str
    year: str
    kind: str  # "studio" or "field"
    method: str  # "direct", "kaggle" or "manual"
    note: str  # what it contributes, in one line
    url: str = ""  # direct download, or the page to open for a manual source
    kaggle_ref: str = ""
    manual_steps: tuple[str, ...] = field(default_factory=tuple)

    @property
    def dest(self) -> Path:
        return DOWNLOAD_DIR / self.name


SOURCES: tuple[Source, ...] = (
    Source(
        name="realwaste",
        title="RealWaste (UCI #908)",
        year="2023",
        kind="field",
        method="direct",
        url="https://archive.ics.uci.edu/static/public/908/realwaste.zip",
        note=(
            "4,752 images photographed at the Whyte's Gully landfill, Wollongong. "
            "Cardboard 461, Food Organics 411, Glass 420, Metal 790, Paper 500, "
            "Plastic 921, Vegetation 436 — the rest do not map. This is the "
            "held-out test set: real waste, on a tipping floor, in real light."
        ),
    ),
    Source(
        name="garbage_v2",
        title="Garbage Classification v2 (sumn2u)",
        year="2024-2026",
        kind="studio",
        method="kaggle",
        kaggle_ref="sumn2u/garbage-classification-v2",
        url="https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2",
        note=(
            "10 classes, ~19,700 images in the `original` folder. The bulk of the "
            "training volume for plastic, paper, metal, glass and biological. "
            "Ingest only `original/` — the Standardized_256 and Standardized_384 "
            "folders are rescaled copies of the same photographs, and ingesting "
            "them would triple every count without adding one new image."
        ),
    ),
    Source(
        name="taco",
        title="TACO — Trash Annotations in Context",
        year="2020, annotations still updated",
        kind="field",
        method="manual",
        url="https://github.com/pedropro/TACO",
        note=(
            "1,500 photographs of litter where it was dropped, 4,784 annotated "
            "instances. Small, but every image is a cluttered real scene. Crops "
            "are produced by scripts/crop_taco.py, which this project already has."
        ),
        manual_steps=(
            "git clone https://github.com/pedropro/TACO",
            "cd TACO && pip install -r requirements.txt",
            "python download.py           # pulls the images from Flickr, ~1 h",
            "then: python scripts/crop_taco.py --path <TACO>/data",
        ),
    ),
    Source(
        name="mdwd",
        title="MDWD — street-level municipal solid waste",
        year="2026",
        kind="field",
        method="manual",
        url="https://universe.roboflow.com/",
        note=(
            "3,697 high-resolution street photographs, 11,461 annotated instances "
            "across five domestic categories. Detection labels, so crops are needed. "
            "The closest public set to what this project's citizens photograph."
        ),
        manual_steps=(
            "Search Roboflow Universe for 'MDWD municipal solid waste detection'",
            "Download in COCO format (a free Roboflow account gives an API key)",
            "Extract into ml/data/downloads/mdwd/",
        ),
    ),
    Source(
        name="zerowaste",
        title="ZeroWaste-f",
        year="2022",
        kind="field",
        method="manual",
        url="http://ai.bu.edu/zerowaste/",
        note=(
            "Frames from a material-recovery-facility conveyor: overlapping, "
            "crushed, partly occluded waste. The hardest realistic test of the "
            "five classes, and the one closest to report §6.4's 'mixed, partially "
            "occluded waste'."
        ),
        manual_steps=(
            "Open http://ai.bu.edu/zerowaste/ and take the ZeroWaste-f archive",
            "Extract into ml/data/downloads/zerowaste/",
        ),
    ),
)

BY_NAME = {s.name: s for s in SOURCES}


def _human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024.0
    return f"{n:.1f} GB"


def download_direct(source: Source) -> Path | None:
    """Fetch an archive over HTTPS into the source's own directory."""
    source.dest.mkdir(parents=True, exist_ok=True)
    archive = source.dest / Path(source.url).name

    if archive.exists() and archive.stat().st_size > 0:
        print(f"   already downloaded: {archive} ({_human(archive.stat().st_size)})")
        return archive

    print(f"   GET {source.url}")
    request = urllib.request.Request(source.url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            # Written to a .part file first, so an interrupted download cannot be
            # mistaken for a complete one on the next run.
            partial = archive.with_suffix(archive.suffix + ".part")
            with open(partial, "wb") as handle:
                shutil.copyfileobj(response, handle, length=1 << 20)
            partial.replace(archive)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as error:
        print(f"   ❌ download failed: {error}")
        print(f"      open {source.url} in a browser and save it to {source.dest}")
        return None

    print(f"   ✅ {archive} ({_human(archive.stat().st_size)})")
    return archive


def download_kaggle(source: Source) -> Path | None:
    """Fetch a Kaggle dataset through the official client.

    Invoked as `python -m kaggle` rather than the `kaggle` console script, so it
    runs from whichever interpreter runs this file. The console script is not on
    PATH when the package is installed inside a virtual environment, which is
    exactly where it is installed here.

    Credentials are read by the client itself, from `~/.kaggle/kaggle.json`,
    `~/.kaggle/access_token` or the environment. This script never reads, prints
    or stores the token: passing it through means it cannot be leaked by a stray
    log line here.
    """
    try:
        import kaggle  # noqa: F401
    except ImportError:
        print("   ⚠️  the kaggle package is not installed in this interpreter")
        print(f"      {sys.executable} -m pip install kaggle")
        return None
    except OSError as error:
        # The client authenticates at import time and raises if it finds no
        # credentials, which would otherwise surface as an opaque traceback.
        print(f"   ⚠️  kaggle could not authenticate: {error}")
        print("      Kaggle -> Settings -> API -> Create New Token, then save")
        print("      kaggle.json to %USERPROFILE%\\.kaggle\\kaggle.json")
        return None

    source.dest.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable, "-m", "kaggle", "datasets", "download",
        "-d", source.kaggle_ref,
        "-p", str(source.dest),
        "--unzip",
    ]
    print(f"   $ python -m kaggle datasets download -d {source.kaggle_ref} "
          f"-p {source.dest} --unzip")
    # Not captured: this is a multi-gigabyte download and the client's progress
    # bar is the only sign it is still alive.
    result = subprocess.run(command)
    if result.returncode != 0:
        print(f"   ❌ kaggle exited {result.returncode}")
        print("      most often this is a missing or expired token.")
        return None

    print(f"   ✅ extracted into {source.dest}")
    return source.dest


def extract(archive: Path) -> bool:
    """Unpack a zip beside itself, into its own directory.

    Members are checked before extraction: an archive that writes outside its
    own directory, through `..` or an absolute path, is refused rather than
    trusted. These files come from the public internet.
    """
    if not zipfile.is_zipfile(archive):
        print(f"   ❌ {archive.name} is not a zip — the download may be an error page")
        return False

    target = archive.parent / archive.stem
    if target.exists() and any(target.iterdir()):
        print(f"   already extracted: {target}")
        return True

    with zipfile.ZipFile(archive) as bundle:
        for member in bundle.namelist():
            path = Path(member)
            if path.is_absolute() or ".." in path.parts:
                print(f"   ❌ refusing to extract {member!r}: it escapes {target}")
                return False
        target.mkdir(parents=True, exist_ok=True)
        bundle.extractall(target)

    print(f"   ✅ extracted into {target}")
    return True


def show_manual(source: Source) -> None:
    print("   this one cannot be downloaded without an account or a helper repo:")
    for step in source.manual_steps:
        print(f"      {step}")


def list_sources() -> None:
    print(f"\nFive focus classes: {', '.join(config.FOCUS_CLASSES)}")
    print(f"Target: {config.FOCUS_TARGET_PER_CLASS:,} images per class "
          f"({config.FOCUS_TARGET_PER_CLASS * config.FOCUS_NUM_CLASSES:,} total)\n")

    for source in SOURCES:
        mark = "✅" if source.dest.exists() and any(source.dest.rglob("*")) else "  "
        print(f"{mark} {source.name:<12} {source.kind:<7} {source.method:<7} "
              f"{source.year:<26} {source.title}")
        for line in _wrap(source.note, 72):
            print(f"      {line}")
        print()

    print("field sources may enter validation and test; studio sources may not.")
    print(f"downloads go to {DOWNLOAD_DIR}")


def _wrap(text: str, width: int) -> list[str]:
    words, lines, current = text.split(), [], ""
    for word in words:
        if len(current) + len(word) + 1 > width:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(current)
    return lines


def fetch(source: Source) -> bool:
    print(f"\n── {source.title}  [{source.kind}, {source.year}]")

    if source.method == "manual":
        show_manual(source)
        return False
    if source.method == "kaggle":
        return download_kaggle(source) is not None
    archive = download_direct(source)
    return bool(archive) and extract(archive)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="show the sources and stop")
    parser.add_argument("--source", action="append", default=[], choices=sorted(BY_NAME),
                        help="fetch one source, repeatable")
    parser.add_argument("--all", action="store_true", help="fetch everything automatable")
    args = parser.parse_args()

    if args.list or (not args.source and not args.all):
        list_sources()
        return 0

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    wanted = [BY_NAME[n] for n in args.source] if args.source else list(SOURCES)

    done, pending = [], []
    for source in wanted:
        (done if fetch(source) else pending).append(source.name)

    print(f"\nfetched: {', '.join(done) if done else 'nothing'}")
    if pending:
        print(f"still needed by hand: {', '.join(pending)}")
    print("\nnext: python scripts/ingest_public.py --source <name> --path "
          f"{DOWNLOAD_DIR}/<name>/...")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
