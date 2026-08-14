"""Audit data/raw and data/metadata.csv against the labelling policy.

    python scripts/check_dataset.py
    python scripts/check_dataset.py --strict     # warnings also fail

Run this after every import and before every training run. It is cheap, and every
problem it finds is one that is either invisible later or expensive to undo once a
model has been trained and written up.

What it checks, and why each one matters:

| Check | Consequence if unchecked |
|---|---|
| Filename pattern and folder agreement | `Plastic_HM_0042.jpg` sitting in `Glass/` is a mislabelled image nobody notices |
| Metadata row per photograph | Missing rows silently forfeit `object_id` grouping |
| Orphan metadata rows | A row whose photograph was deleted quietly inflates progress counts |
| Missing or blank `object_id` | Near-duplicate shots straddle train and test; the score overstates reality |
| One `object_id`, two classes | The same object labelled two ways teaches the network a contradiction |
| Shots per object over the cap | Padding a class with near-duplicates that add no information |
| Byte-identical images | The same photograph counted twice, in two splits |
| Vocabulary of condition/background/lighting/area | "wet", "Wet" and "damp" become three values nothing can group by |
| Per-class counts against target | The imbalance is found now, not on the last day |
| Share of damaged/dirty items | A dataset of tidy objects gives a model that fails on real waste |
| Background and lighting coverage | A class shot only indoors on a table learns the table |
| Split leakage | The reported accuracy measures memorisation |

Only exact byte-level duplicates are detected. Two photographs of the same object
taken a second apart are near-identical but not byte-identical; that is what
`object_id` and the shot cap are for.
"""

import argparse
import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

FILENAME_RE = re.compile(config.FILENAME_PATTERN)


class Report:
    """Collected findings, printed once at the end grouped by check.

    Printing as we go interleaves eleven checks into unreadable noise; a dataset
    with one systematic mistake produces hundreds of lines of it.
    """

    def __init__(self, max_examples: int = 8):
        self.errors = defaultdict(list)
        self.warnings = defaultdict(list)
        self.max_examples = max_examples

    def error(self, check: str, detail: str) -> None:
        self.errors[check].append(detail)

    def warn(self, check: str, detail: str) -> None:
        self.warnings[check].append(detail)

    def _dump(self, icon: str, groups: dict) -> None:
        for check, details in groups.items():
            print(f"\n{icon} {check}  ({len(details)})")
            for detail in details[: self.max_examples]:
                print(f"     {detail}")
            if len(details) > self.max_examples:
                print(f"     … and {len(details) - self.max_examples} more")

    def render(self) -> None:
        self._dump("❌", self.errors)
        self._dump("⚠️ ", self.warnings)

    @property
    def error_count(self) -> int:
        return sum(len(v) for v in self.errors.values())

    @property
    def warning_count(self) -> int:
        return sum(len(v) for v in self.warnings.values())


def load_metadata(path: Path, report: Report, local_images: int) -> dict:
    """metadata.csv keyed by filename, with duplicate rows reported.

    Before the team has shot anything, the only images present come from public
    datasets, which carry their own provenance — so a missing file is expected then
    and an error afterwards.
    """
    if not path.exists():
        if local_images:
            report.error("metadata.csv missing",
                         f"{path} not found — every local photograph is ungrouped")
        else:
            print(f"📖 {path.name} not yet created — no local photographs to record")
        return {}

    rows = {}
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        missing_columns = [c for c in ("filename", "object_id")
                           if c not in (reader.fieldnames or [])]
        if missing_columns:
            report.error("metadata.csv columns",
                         f"required column(s) absent: {', '.join(missing_columns)}")
            return {}

        for line_number, row in enumerate(reader, start=2):
            filename = (row.get("filename") or "").strip()
            if not filename:
                report.error("metadata row without a filename", f"line {line_number}")
                continue
            if filename in rows:
                report.error("duplicate metadata row",
                             f"{filename} appears twice (line {line_number})")
                continue
            rows[filename] = {k: (v or "").strip() for k, v in row.items()}
    return rows


def load_public_filenames(path: Path) -> set:
    """Names ingested from public datasets, which follow a different convention."""
    if not path.exists():
        return set()
    names = set()
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                names.add(json.loads(line).get("filename", ""))
            except json.JSONDecodeError:
                continue
    return names - {""}


def scan_images(raw_dir: Path) -> dict:
    """{class name: [paths]} for real classes, plus the Doubtful queue."""
    found = {}
    for class_dir in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        images = [p for p in sorted(class_dir.rglob("*"))
                  if p.is_file() and p.suffix.lower() in config.IMAGE_EXTENSIONS]
        found[class_dir.name] = images
    return found


def check_filenames(by_class: dict, public: set, metadata: dict, report: Report) -> None:
    for class_name, images in by_class.items():
        if class_name not in config.CLASSES:
            continue
        for path in images:
            source = metadata.get(path.name, {}).get("source", "local")
            if path.name in public or source in config.PUBLIC_SOURCES:
                continue  # public files carry their source prefix by design

            match = FILENAME_RE.match(path.stem)
            if not match:
                report.error("filename does not match Class_Initials_Number",
                             f"{class_name}/{path.name}")
            elif match["cls"] != class_name:
                report.error("filename class disagrees with its folder",
                             f"{class_name}/{path.name} says {match['cls']}")


def check_metadata_coverage(by_class: dict, public: set, metadata: dict,
                            report: Report) -> None:
    on_disk = {p.name for images in by_class.values() for p in images}

    for class_name, images in by_class.items():
        if class_name not in config.CLASSES:
            continue
        for path in images:
            if path.name in public:
                continue
            row = metadata.get(path.name)
            if row is None:
                report.error("photograph with no metadata row",
                             f"{class_name}/{path.name}")
            elif not row.get("object_id"):
                report.error("blank object_id", f"{class_name}/{path.name}")

    for filename in metadata:
        if filename not in on_disk:
            report.error("metadata row with no photograph", filename)


def check_vocabulary(metadata: dict, report: Report) -> None:
    fields = {
        "condition": config.CONDITIONS,
        "background": config.BACKGROUNDS,
        "lighting": config.LIGHTINGS,
        "area": config.AREAS,
    }
    for filename, row in metadata.items():
        for field, allowed in fields.items():
            value = row.get(field, "")
            if not value:
                report.warn(f"{field} not recorded", filename)
            elif value not in allowed:
                report.error(f"unrecognised {field}",
                             f"{filename}: {value!r} (allowed: {', '.join(allowed)})")


def check_objects(by_class: dict, metadata: dict, report: Report) -> None:
    """object_id must identify exactly one physical object, in exactly one class."""
    classes_of = defaultdict(set)
    shots_of = Counter()

    for class_name, images in by_class.items():
        if class_name not in config.CLASSES:
            continue
        for path in images:
            object_id = metadata.get(path.name, {}).get("object_id")
            if not object_id:
                continue
            classes_of[object_id].add(class_name)
            shots_of[object_id] += 1

    for object_id, classes in classes_of.items():
        if len(classes) > 1:
            report.error("one object_id used in two classes",
                         f"{object_id}: {', '.join(sorted(classes))}")

    for object_id, shots in shots_of.items():
        if shots > config.MAX_SHOTS_PER_OBJECT:
            report.warn(f"more than {config.MAX_SHOTS_PER_OBJECT} shots of one object",
                        f"{object_id}: {shots} shots")


def check_duplicate_bytes(by_class: dict, report: Report) -> None:
    digests = defaultdict(list)
    for class_name, images in by_class.items():
        for path in images:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            digests[digest].append(f"{class_name}/{path.name}")

    for paths in digests.values():
        if len(paths) > 1:
            report.error("identical image stored more than once", " = ".join(paths))


def check_counts(by_class: dict, report: Report) -> None:
    print("\n📊 per-class counts")
    print(f"  {'class':<12} {'have':>6} {'target':>7} {'progress':>9}")

    total = 0
    for class_name in config.CLASSES:
        have = len(by_class.get(class_name, []))
        target = config.TARGET_COUNTS.get(class_name, config.MIN_IMAGES_PER_CLASS)
        total += have
        share = have / target * 100 if target else 0
        flag = ""
        if have < config.MIN_IMAGES_PER_CLASS:
            flag = f"  ← below {config.MIN_IMAGES_PER_CLASS}"
            report.warn("class too small to evaluate",
                        f"{class_name}: {have} of {config.MIN_IMAGES_PER_CLASS} minimum")
        elif have < target:
            report.warn("class below target", f"{class_name}: {have} of {target}")
        print(f"  {class_name:<12} {have:>6} {target:>7} {share:>8.0f}%{flag}")

    goal = sum(config.TARGET_COUNTS.values())
    print(f"  {'TOTAL':<12} {total:>6} {goal:>7} {total / goal * 100:>8.0f}%")

    extra = [name for name in by_class
             if name not in config.CLASSES and name != config.DOUBTFUL_DIR]
    for name in extra:
        report.warn("folder that is not a class",
                    f"{name}/ ({len(by_class[name])} images) — prepare_dataset ignores it")

    doubtful = len(by_class.get(config.DOUBTFUL_DIR, []))
    if doubtful:
        report.warn("Doubtful queue not empty",
                    f"{doubtful} image(s) awaiting a ruling in "
                    f"{config.DOUBTFUL_DIR}/ — decide before the next training run")


def check_variation(by_class: dict, metadata: dict, report: Report) -> None:
    """The policy's variation requirements, which are the point of the metadata."""
    print("\n🎲 variation")

    overall = Counter()
    for class_name in config.CLASSES:
        images = by_class.get(class_name, [])
        rows = [metadata[p.name] for p in images if p.name in metadata]
        if not rows:
            continue

        conditions = Counter(row.get("condition", "") for row in rows)
        damaged = sum(conditions[c] for c in config.DAMAGED_CONDITIONS)
        overall.update(conditions)

        backgrounds = {row.get("background", "") for row in rows} - {""}
        lightings = {row.get("lighting", "") for row in rows} - {""}

        share = damaged / len(rows)
        print(f"  {class_name:<12} damaged {share:>4.0%}   "
              f"backgrounds {len(backgrounds)}/{len(config.BACKGROUNDS)}   "
              f"lighting {len(lightings)}/{len(config.LIGHTINGS)}")

        if share < config.MIN_DAMAGED_SHARE:
            report.warn("too few damaged or dirty items",
                        f"{class_name}: {share:.0%}, policy asks for "
                        f"{config.MIN_DAMAGED_SHARE:.0%}")
        if len(backgrounds) < 3:
            report.warn("narrow background coverage",
                        f"{class_name}: only {sorted(backgrounds) or 'none'}")
        if len(lightings) < 3:
            report.warn("narrow lighting coverage",
                        f"{class_name}: only {sorted(lightings) or 'none'}")

    recorded = sum(overall.values())
    if recorded:
        damaged = sum(overall[c] for c in config.DAMAGED_CONDITIONS)
        print(f"  {'ALL':<12} damaged {damaged / recorded:>4.0%} "
              f"of {recorded} photographs with a recorded condition")


def check_split_leakage(splits_dir: Path, report: Report) -> None:
    """Re-check the emitted splits, independently of the code that wrote them."""
    files = {name: splits_dir / f"{name}.csv" for name in ("train", "val", "test")}
    if not all(p.exists() for p in files.values()):
        print("\n🔒 splits not built yet — run prepare_dataset.py to check leakage")
        return

    groups = {}
    for name, path in files.items():
        with open(path, newline="", encoding="utf-8") as handle:
            groups[name] = {row.get("object_id", "") for row in csv.DictReader(handle)}

    clean = True
    for left, right in (("train", "val"), ("train", "test"), ("val", "test")):
        overlap = (groups[left] & groups[right]) - {""}
        if overlap:
            clean = False
            for object_id in sorted(overlap):
                report.error("object appears in two splits",
                             f"{object_id}: {left} and {right}")

    print(f"\n🔒 splits: {'no object crosses a split' if clean else 'LEAKING'}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--raw-dir", type=Path, default=config.RAW_DIR)
    parser.add_argument("--metadata", type=Path, default=config.METADATA_PATH)
    parser.add_argument("--splits-dir", type=Path, default=config.SPLITS_DIR)
    parser.add_argument("--strict", action="store_true",
                        help="exit non-zero on warnings as well as errors")
    parser.add_argument("--skip-hashing", action="store_true",
                        help="skip the byte-duplicate scan on very large datasets")
    args = parser.parse_args()

    if not args.raw_dir.exists():
        print(f"❌ {args.raw_dir} does not exist")
        return 1

    report = Report()
    public = load_public_filenames(config.PUBLIC_METADATA_PATH)
    by_class = scan_images(args.raw_dir)

    total = sum(len(v) for v in by_class.values())
    local_images = sum(1 for images in by_class.values()
                       for p in images if p.name not in public)
    metadata = load_metadata(args.metadata, report, local_images)
    print(f"📖 {total} photographs, {len(metadata)} metadata rows, "
          f"{len(public)} from public datasets")
    if not total:
        print("❌ nothing to check")
        return 1

    check_filenames(by_class, public, metadata, report)
    check_metadata_coverage(by_class, public, metadata, report)
    check_vocabulary(metadata, report)
    check_objects(by_class, metadata, report)
    if not args.skip_hashing:
        check_duplicate_bytes(by_class, report)
    check_counts(by_class, report)
    check_variation(by_class, metadata, report)
    check_split_leakage(args.splits_dir, report)

    report.render()

    print(f"\n{report.error_count} error(s), {report.warning_count} warning(s)")
    if report.error_count:
        print("❌ fix the errors before training. Every one of them corrupts either a "
              "label or the split.")
        return 1
    if report.warning_count and args.strict:
        print("❌ --strict: warnings treated as failures")
        return 1
    print("✅ dataset is consistent with the labelling policy")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
