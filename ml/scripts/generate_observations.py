"""Generate the fused waste-observation dataset described in report Table 6.1.

What this produces
------------------
10,000 spatio-temporal observation records over a full year, one row per
citizen report, each tied to a real collection point in Bhimavaram and a real
waste photograph. These are the records Chapter 8 evaluates and the series the
§6.5 forecaster learns from.

What is real and what is generated
----------------------------------
Real:   the 191 collection points, their coordinates, land use and capacity
        (see build_points.py); the photographs and their material labels.
Derived: which point and which hour each observation lands on, and the sensor
        columns.

The generated part is not noise. Waste arrives in patterns a forecaster can
only learn if they are present: a market produces several times what a
residential street does, Sunday is the santha day, Bhogi empties households of
old belongings onto the kerb, and the monsoon changes both the weight of the
waste and the humidity around it. Sampling observations uniformly would give
the LSTM nothing to find, and an urgency score built on it would be flat.

Every rate below is an assumption, chosen to be plausible for a coastal Andhra
town rather than measured. They are collected at the top of the file so they
can be replaced with real figures when the team has them.

Sensor columns
--------------
Report Table 6.1 carries fill_pct, weight_kg, temp_c and humidity. This project
deploys no IoT hardware, so most points have no sensor and those columns are
empty — which is exactly the case report §6.3 describes, where missing readings
are imputed from the ward median and flagged.

A minority of points carry readings, matching report §8.9: "IoT nodes can be
deployed selectively at high-volume points such as markets and bus stands."
`has_sensor` marks them. Nothing downstream may treat an imputed value as a
measurement.

Usage
-----
    ml/.venv/Scripts/python ml/scripts/generate_observations.py
"""

from __future__ import annotations

import csv
import math
import random
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[1]
POINTS_FILE = ML_ROOT / "data" / "points.csv"
MANIFEST_FILE = ML_ROOT / "data" / "manifest.csv"
OUT_FILE = ML_ROOT / "data" / "observations.csv"

TARGET_OBSERVATIONS = 10_000
START_DATE = date(2025, 10, 1)
END_DATE = date(2026, 9, 30)

RANDOM_SEED = 42

# The seven categories of report §6.3. The project's own nine-class scheme maps
# onto them as follows. Textile and Electronic are recyclable but are none of
# the four named materials, so they land in the catch-all. Hazardous has no slot
# in the report's list and goes to mixed. NotWaste has no slot at all and its
# 148 images are unused here.
CLASS_REMAP = {
    "Plastic": "plastic",
    "Paper": "paper",
    "Metal": "metal",
    "Glass": "glass",
    "Organic": "organic",
    "Textile": "recyclable",
    "Electronic": "recyclable",
    "Hazardous": "mixed",
}

REPORT_CLASSES = ["recyclable", "organic", "plastic", "paper", "metal", "glass", "mixed"]

# Reports produced per point per day, before any multiplier. A market is visited
# and photographed many times more often than a residential kerb.
# Residential is raised well above the institutional categories because most of
# a town's waste comes from where people live, and OpenStreetMap maps temples
# and clinics far more thoroughly than it maps housing. Without this correction
# the 50 residential polygons are drowned out by 63 places of worship and the
# town appears to produce more paper than food waste.
BASE_DAILY_RATE = {
    "market": 7.0,
    "residential": 3.2,
    "commercial": 1.8,
    "religious": 1.4,
    "healthcare": 1.0,
    "education": 0.9,
    "civic": 0.8,
    "industrial": 0.5,
}

# What each kind of place actually throws away. Columns are REPORT_CLASSES.
# A market is overwhelmingly organic; an office produces paper; an industrial
# estate produces metal, mixed rejects and recoverable offcuts.
# Indian municipal waste is roughly half organic. These mixes are set so the
# town-wide total lands near that, which is what report §1.1 describes and what
# the composting pathway in §6.7 depends on being true.
CLASS_MIX = {
    # Vegetable trimmings, spoiled produce, fish waste.
    "market":      {"organic": 0.68, "plastic": 0.13, "mixed": 0.09, "paper": 0.05, "recyclable": 0.02, "glass": 0.02, "metal": 0.01},
    # Kitchen waste dominates the household bin everywhere in India.
    "residential": {"organic": 0.52, "plastic": 0.16, "mixed": 0.13, "paper": 0.08, "recyclable": 0.05, "glass": 0.03, "metal": 0.03},
    # Flowers, garlands, leaf plates and prasadam. Almost entirely compostable.
    "religious":   {"organic": 0.62, "mixed": 0.13, "plastic": 0.11, "paper": 0.08, "recyclable": 0.03, "glass": 0.02, "metal": 0.01},
    # Food stalls and tea shops sit alongside the dry retail waste.
    "commercial":  {"organic": 0.34, "plastic": 0.24, "paper": 0.17, "mixed": 0.12, "recyclable": 0.06, "glass": 0.04, "metal": 0.03},
    # Dressings, packaging and single-use plastic. The report has no biomedical
    # category, so the clinical fraction can only be expressed as mixed.
    "healthcare":  {"mixed": 0.34, "plastic": 0.27, "paper": 0.16, "organic": 0.14, "recyclable": 0.05, "glass": 0.03, "metal": 0.01},
    # The one genuinely paper-led category, and canteen waste still shows.
    "education":   {"paper": 0.36, "organic": 0.24, "plastic": 0.21, "mixed": 0.09, "recyclable": 0.05, "metal": 0.03, "glass": 0.02},
    # Bus stands and offices: food wrappers, tickets, bottles.
    "civic":       {"organic": 0.30, "plastic": 0.26, "paper": 0.20, "mixed": 0.13, "recyclable": 0.06, "glass": 0.03, "metal": 0.02},
    "industrial":  {"mixed": 0.26, "metal": 0.22, "recyclable": 0.20, "plastic": 0.18, "paper": 0.08, "glass": 0.04, "organic": 0.02},
}

# Monday is 0. Sunday is the santha day, when the weekly market runs and the
# whole town shops; Saturday is busy; Tuesday is the quietest.
WEEKDAY_FACTOR = [0.95, 0.85, 0.95, 1.00, 1.10, 1.25, 1.45]

# Sunday's lift applies many times over at a market and barely at all on a
# residential street, so the weekday effect is scaled by land use.
# A temple's week runs opposite to an office's: Sunday is its busiest day, and a
# school's is empty. Industrial estates barely notice the weekend.
WEEKDAY_SENSITIVITY = {
    "market": 2.2,
    "religious": 1.8,
    "commercial": 1.3,
    "residential": 1.0,
    "civic": 0.7,
    "healthcare": 0.3,
    "education": -0.8,
    "industrial": 0.4,
}

# Andhra Pradesh holidays in the window, with how much extra waste each actually
# generates — which is not the same as how important the holiday is.
#
# Bhogi is the largest multiplier in the table: households burn or discard old
# belongings on that morning, and the kerb fills with furniture, bedding and
# clothing. Deepavali adds packaging and spent fireworks. Republic Day and
# Independence Day are holidays with almost no waste signature, and are included
# at 1.0 so the `holiday` flag does not silently become a proxy for "busy".
#
# Dates: AP state holiday lists for 2025 and 2026. Sources differ by a day on
# Deepavali 2025 and Vinayaka Chavithi; a one-day shift does not change what the
# forecaster learns.
FESTIVALS = {
    date(2025, 10, 1): ("Maharnavami", 1.30),
    date(2025, 10, 2): ("Vijayadasami", 1.55),
    date(2025, 10, 20): ("Deepavali", 1.85),
    date(2025, 12, 25): ("Christmas", 1.20),
    date(2026, 1, 13): ("Bhogi", 2.40),
    date(2026, 1, 14): ("Makara Sankranti", 1.70),
    date(2026, 1, 15): ("Kanuma", 1.35),
    date(2026, 1, 26): ("Republic Day", 1.00),
    date(2026, 3, 19): ("Ugadi", 1.60),
    date(2026, 8, 15): ("Independence Day", 1.00),
}

# Waste rises for two days before a festival as people shop, and falls back over
# the three days after as the municipality clears it.
FESTIVAL_RUN_UP_DAYS = 2
FESTIVAL_TAIL_DAYS = 3

# Coastal Andhra: a mild December, a punishing May, and a June-September monsoon.
# Month index 1-12. Temperature is the daily mean in Celsius, humidity is the
# mean relative humidity as a percentage.
MONTHLY_CLIMATE = {
    1:  (24.5, 68), 2:  (26.5, 66), 3:  (29.5, 67), 4:  (32.0, 70),
    5:  (34.0, 70), 6:  (32.0, 76), 7:  (30.0, 82), 8:  (29.5, 83),
    9:  (29.5, 81), 10: (28.5, 78), 11: (26.5, 73), 12: (24.5, 70),
}

# Monsoon rain soaks the organic fraction, so the same volume weighs more and
# the waste decomposes faster. This multiplies weight, not count.
MONSOON_MONTHS = {6, 7, 8, 9}
MONSOON_WEIGHT_FACTOR = 1.22

# When people actually report. Two peaks: the morning walk past a bin on the way
# out, and the evening return. Index is the hour, 0-23.
HOUR_WEIGHTS = [
    0.2, 0.1, 0.1, 0.1, 0.3, 1.2, 3.5, 6.0, 7.5, 6.5, 5.0, 4.0,
    3.5, 3.0, 3.0, 3.5, 4.5, 6.5, 7.5, 6.0, 4.0, 2.5, 1.2, 0.5,
]

# Share of points carrying a sensor. Report §8.9 argues for selective
# deployment at high-volume points rather than universal instrumentation.
SENSOR_COVERAGE = 0.15

# How a citizen describes the amount, and what each bucket means as a fraction
# of the container. The citizen's estimate is the only fill signal at the 85% of
# points with no sensor, so these ranges are what the urgency score falls back
# on.
QUANTITY_BUCKETS = {
    "small": (0.05, 0.35),
    "medium": (0.35, 0.70),
    "large": (0.70, 1.00),
}

# Bulk density in kg per litre, by material. Wet organic waste is several times
# heavier than the same volume of plastic film.
DENSITY_KG_PER_L = {
    "organic": 0.55,
    "mixed": 0.30,
    "glass": 0.35,
    "metal": 0.25,
    "paper": 0.18,
    "recyclable": 0.15,
    "plastic": 0.08,
}


def festival_factor(day: date) -> tuple[float, str]:
    """Multiplier for a day, and the festival name if the day is one.

    A day inside another festival's run-up or tail takes the strongest
    influence acting on it rather than the sum, so two festivals a week apart
    do not compound into an implausible spike.
    """
    strongest = 1.0
    for festival_day, (name, peak) in FESTIVALS.items():
        if day == festival_day:
            return peak, name

        offset = (day - festival_day).days
        if -FESTIVAL_RUN_UP_DAYS <= offset < 0:
            # Builds towards the festival.
            share = (FESTIVAL_RUN_UP_DAYS + offset + 1) / (FESTIVAL_RUN_UP_DAYS + 1)
            strongest = max(strongest, 1.0 + (peak - 1.0) * share * 0.5)
        elif 0 < offset <= FESTIVAL_TAIL_DAYS:
            # Decays after it.
            share = (FESTIVAL_TAIL_DAYS - offset + 1) / (FESTIVAL_TAIL_DAYS + 1)
            strongest = max(strongest, 1.0 + (peak - 1.0) * share * 0.6)

    return strongest, ""


def relative_image_path(path: str) -> str:
    """Rewrite an image path to be relative to ML_ROOT, with forward slashes.

    manifest.csv stores absolute Windows paths. Carrying those into the dataset
    makes it unusable anywhere else — the splits that went to Colab previously
    failed for exactly this reason — so they are normalised here. Anything
    already relative, or outside ML_ROOT, is passed through unchanged.
    """
    candidate = Path(path)
    if not candidate.is_absolute():
        return candidate.as_posix()

    try:
        return candidate.relative_to(ML_ROOT).as_posix()
    except ValueError:
        return candidate.as_posix()


def load_points() -> list[dict]:
    with POINTS_FILE.open(encoding="utf-8") as handle:
        points = list(csv.DictReader(handle))

    if not points:
        raise SystemExit(f"{POINTS_FILE} is empty; run build_points.py first")

    for point in points:
        point["lat"] = float(point["lat"])
        point["lon"] = float(point["lon"])
        point["capacity_l"] = int(point["capacity_l"])

    return points


def load_images() -> dict[str, list[dict]]:
    """Group the photographs by their remapped report class.

    `object_id` travels with each image. Several photographs of one object share
    an id, and the splitter must keep them on the same side of the train/test
    line or the model is scored on something it has already seen.
    """
    with MANIFEST_FILE.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    by_class: dict[str, list[dict]] = defaultdict(list)
    dropped = Counter()
    for row in rows:
        report_class = CLASS_REMAP.get(row["label"])
        if report_class is None:
            dropped[row["label"]] += 1
            continue
        by_class[report_class].append(
            {
                "path": relative_image_path(row["path"]),
                "object_id": row["object_id"],
                "source": row["source"],
            }
        )

    for label, count in dropped.items():
        print(f"  dropped {count:>4} {label} images (no class in the report's seven)")

    missing = [c for c in REPORT_CLASSES if not by_class.get(c)]
    if missing:
        raise SystemExit(f"no images for report classes: {', '.join(missing)}")

    return by_class


def main() -> None:
    rng = random.Random(RANDOM_SEED)

    points = load_points()
    images_by_class = load_images()

    print(f"points          {len(points)}")
    for report_class in REPORT_CLASSES:
        print(f"  {report_class:<12} {len(images_by_class[report_class]):>5} images")

    # Sensors go to the highest-capacity points first, which is what selective
    # deployment means in practice: markets and transfer points, not kerbsides.
    sensor_count = max(1, round(len(points) * SENSOR_COVERAGE))
    ranked = sorted(points, key=lambda p: (-p["capacity_l"], p["point_id"]))
    sensor_points = {p["point_id"] for p in ranked[:sensor_count]}
    print(f"sensors         {len(sensor_points)} of {len(points)} points")

    # Build the daily intensity surface: for every point and every day, how much
    # reporting pressure exists there. Observations are then sampled in
    # proportion to it, so the resulting series carries the weekly cycle and the
    # festival spikes rather than having them bolted on afterwards.
    days = []
    day = START_DATE
    while day <= END_DATE:
        days.append(day)
        day += timedelta(days=1)

    cells: list[tuple[dict, date, str]] = []
    weights: list[float] = []
    for point in points:
        land_use = point["land_use"]
        base = BASE_DAILY_RATE[land_use]
        sensitivity = WEEKDAY_SENSITIVITY[land_use]
        # A per-point quirk, fixed across the year: one street is simply busier
        # than the next. Without this every point of a land use is identical and
        # the forecaster can learn a single curve for all of them.
        character = rng.uniform(0.65, 1.45)

        for current in days:
            weekday_lift = 1.0 + (WEEKDAY_FACTOR[current.weekday()] - 1.0) * sensitivity
            festival_lift, festival_name = festival_factor(current)
            intensity = base * character * weekday_lift * festival_lift
            if intensity <= 0:
                continue
            cells.append((point, current, festival_name))
            weights.append(intensity)

    chosen = rng.choices(cells, weights=weights, k=TARGET_OBSERVATIONS)

    hours = list(range(24))
    rows = []
    for index, (point, current, festival_name) in enumerate(chosen, start=1):
        land_use = point["land_use"]

        mix = CLASS_MIX[land_use]
        report_class = rng.choices(list(mix), weights=list(mix.values()), k=1)[0]
        image = rng.choice(images_by_class[report_class])

        hour = rng.choices(hours, weights=HOUR_WEIGHTS, k=1)[0]
        timestamp = datetime(
            current.year, current.month, current.day, hour, rng.randrange(60), rng.randrange(60)
        )

        quantity = rng.choices(
            ["small", "medium", "large"],
            weights=[0.42, 0.40, 0.18] if land_use != "market" else [0.18, 0.40, 0.42],
            k=1,
        )[0]
        low, high = QUANTITY_BUCKETS[quantity]
        fill_fraction = rng.uniform(low, high)

        mean_temp, mean_humidity = MONTHLY_CLIMATE[current.month]
        # Coolest before dawn, hottest mid-afternoon.
        diurnal = -3.2 * math.cos((hour - 15) / 24 * 2 * math.pi)
        temperature = mean_temp + diurnal + rng.gauss(0, 1.1)
        humidity = max(35.0, min(99.0, mean_humidity - diurnal * 1.4 + rng.gauss(0, 4.0)))

        volume_l = fill_fraction * point["capacity_l"]
        weight = volume_l * DENSITY_KG_PER_L[report_class]
        if current.month in MONSOON_MONTHS:
            weight *= MONSOON_WEIGHT_FACTOR
        weight *= rng.uniform(0.85, 1.15)

        # A citizen's GPS is accurate to a few metres at best, and they stand
        # beside the bin rather than on it. Scatter the reported position so
        # geo-snapping has something to actually do.
        jitter_m = rng.gauss(0, 12)
        bearing = rng.uniform(0, 2 * math.pi)
        lat = point["lat"] + (jitter_m * math.cos(bearing)) / 111_000
        lon = point["lon"] + (jitter_m * math.sin(bearing)) / 106_000

        has_sensor = point["point_id"] in sensor_points

        rows.append(
            {
                "obs_id": f"OBS{index:06d}",
                "point_id": point["point_id"],
                "lat": f"{lat:.6f}",
                "lon": f"{lon:.6f}",
                "timestamp": timestamp.isoformat(sep=" "),
                "image": image["path"],
                "object_id": image["object_id"],
                "label": report_class,
                "reported_qty": quantity,
                "site_type": point["site_type"],
                # Empty at the 85% of points with no node. Report §6.3 imputes
                # these from the ward median and flags them; has_sensor is that
                # flag.
                "fill_pct": f"{fill_fraction * 100:.1f}" if has_sensor else "",
                "weight_kg": f"{weight:.2f}" if has_sensor else "",
                "temp_c": f"{temperature:.1f}" if has_sensor else "",
                "humidity": f"{humidity:.1f}" if has_sensor else "",
                "has_sensor": "true" if has_sensor else "false",
                "ward_id": point["ward_id"],
                "land_use": land_use,
                "capacity_l": point["capacity_l"],
                "hour": hour,
                "weekday": timestamp.strftime("%a"),
                "holiday": festival_name,
                "source": image["source"],
            }
        )

    rows.sort(key=lambda r: r["timestamp"])
    # Renumber after sorting so obs_id runs in time order, which makes the file
    # readable and the windowing in the forecaster easier to reason about.
    for index, row in enumerate(rows, start=1):
        row["obs_id"] = f"OBS{index:06d}"

    with OUT_FILE.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nwritten         {OUT_FILE}")
    print(f"observations    {len(rows)}")
    print(f"window          {START_DATE} to {END_DATE} ({len(days)} days)")

    label_counts = Counter(row["label"] for row in rows)
    print("\nclass balance")
    for report_class, count in label_counts.most_common():
        print(f"  {report_class:<12} {count:>5}  {count / len(rows):>6.1%}")

    print("\nper weekday")
    weekday_counts = Counter(row["weekday"] for row in rows)
    for name in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
        print(f"  {name}  {weekday_counts[name]:>5}")

    festival_rows = [row for row in rows if row["holiday"]]
    print(f"\non a festival   {len(festival_rows)}")
    for name, count in Counter(row["holiday"] for row in festival_rows).most_common():
        print(f"  {name:<20} {count:>4}")


if __name__ == "__main__":
    main()
