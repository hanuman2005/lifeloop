"""Split the observation dataset into train, validation and test subsets.

Report §6.3 asks for 70:15:15, stratified so every class keeps its proportion in
each subset, "ensuring that near-duplicate reports of the same event did not
appear in different subsets".

Why rows cannot be split at random
----------------------------------
2,378 photographs carry 10,000 observations, so the average image appears in
four of them. Splitting rows would put the same photograph in both train and
test under different obs_ids, and the test score would measure memorisation.

The split is therefore over `object_id`, not over rows. Every observation using
a given object lands in the same subset. Several photographs of one physical
object share an object_id already, so that grouping is inherited too.

What this costs
---------------
Grouped splitting cannot hit 70:15:15 exactly, because objects carry different
numbers of observations and must move as a unit. The greedy pass below assigns
each class's objects to whichever subset is furthest below its quota, which
keeps the result within about a percentage point.

Usage
-----
    ml/.venv/Scripts/python ml/scripts/split_observations.py
"""

from __future__ import annotations

import csv
import random
from collections import Counter, defaultdict
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[1]
OBSERVATIONS_FILE = ML_ROOT / "data" / "observations.csv"
OUT_DIR = ML_ROOT / "data" / "obs_splits"

SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}
RANDOM_SEED = 42


def main() -> None:
    rng = random.Random(RANDOM_SEED)

    with OBSERVATIONS_FILE.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
        fieldnames = list(rows[0])

    # Group observations by the object they photograph, and record each
    # object's class so the split can be stratified.
    rows_by_object: dict[str, list[dict]] = defaultdict(list)
    class_of_object: dict[str, str] = {}
    for row in rows:
        rows_by_object[row["object_id"]].append(row)
        class_of_object[row["object_id"]] = row["label"]

    objects_by_class: dict[str, list[str]] = defaultdict(list)
    for object_id, label in class_of_object.items():
        objects_by_class[label].append(object_id)

    assignment: dict[str, str] = {}
    for label, object_ids in objects_by_class.items():
        # Shuffle so the assignment does not follow whatever order the images
        # were ingested in, then place the heaviest objects first. A late object
        # carrying 40 observations cannot be accommodated without overshooting;
        # placed early, the lighter ones can still correct the balance.
        rng.shuffle(object_ids)
        object_ids.sort(key=lambda oid: -len(rows_by_object[oid]))

        total = sum(len(rows_by_object[oid]) for oid in object_ids)
        quota = {name: total * ratio for name, ratio in SPLIT_RATIOS.items()}
        placed = {name: 0 for name in SPLIT_RATIOS}

        for object_id in object_ids:
            # Whichever subset is furthest below its quota, measured as a share
            # of that quota so the small subsets are not always starved.
            target = max(placed, key=lambda name: (quota[name] - placed[name]) / quota[name])
            assignment[object_id] = target
            placed[target] += len(rows_by_object[object_id])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    counts: dict[str, Counter] = {name: Counter() for name in SPLIT_RATIOS}
    totals = Counter()

    for name in SPLIT_RATIOS:
        subset = [row for row in rows if assignment[row["object_id"]] == name]
        subset.sort(key=lambda row: row["timestamp"])
        with (OUT_DIR / f"{name}.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(subset)
        totals[name] = len(subset)
        counts[name] = Counter(row["label"] for row in subset)

    grand_total = sum(totals.values())
    if grand_total != len(rows):
        raise SystemExit(f"wrote {grand_total} rows but read {len(rows)}")

    # The guarantee this script exists to provide. Verify it rather than assume.
    objects_per_split = {
        name: {row["object_id"] for row in rows if assignment[row["object_id"]] == name}
        for name in SPLIT_RATIOS
    }
    names = list(SPLIT_RATIOS)
    for i, first in enumerate(names):
        for second in names[i + 1 :]:
            shared = objects_per_split[first] & objects_per_split[second]
            if shared:
                raise SystemExit(
                    f"{len(shared)} object_id values appear in both {first} and {second}"
                )

    print(f"written         {OUT_DIR}")
    print(f"no object_id crosses a split boundary: verified\n")

    header = "class".ljust(13) + "".join(name.rjust(16) for name in names)
    print(header)
    for label in sorted({row["label"] for row in rows}):
        line = label.ljust(13)
        label_total = sum(counts[name][label] for name in names)
        for name in names:
            count = counts[name][label]
            line += f"{count:>7} {count / label_total:>7.1%}"
        print(line)

    line = "TOTAL".ljust(13)
    for name in names:
        line += f"{totals[name]:>7} {totals[name] / grand_total:>7.1%}"
    print(line)

    line = "target".ljust(13)
    for name in names:
        line += f"{'':>7} {SPLIT_RATIOS[name]:>7.1%}"
    print(line)


if __name__ == "__main__":
    main()
