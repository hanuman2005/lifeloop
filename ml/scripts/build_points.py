"""Build the collection-point registry for Bhimavaram from OpenStreetMap data.

Report Table 6.1 gives every observation a `point_id`, a `ward_id` and a
`land_use`, which means the platform needs a registry of collection points
before a single observation can exist. This script produces it.

Where the points come from
--------------------------
OpenStreetMap has no waste bins mapped in Bhimavaram — a query for
`amenity=waste_basket`, `waste_disposal` and `recycling` over the whole town
returns nothing. What it does have is 341 named places: temples, schools,
hospitals, markets, bus stands, shops and fuel stations, plus residential and
industrial land-use polygons.

Those are where municipal collection points actually sit in an Indian town, so
the registry is derived from them rather than invented. Each surviving place
becomes one candidate collection point. The coordinates are real; the claim
that a bin stands there is not verified, and the report should say so.

Points closer than MIN_SEPARATION_M to one already kept are dropped, because a
restaurant and the shop beside it share a bin in practice. 341 places collapse
to 191 points this way.

Wards
-----
Bhimavaram's municipal ward boundaries are not in OpenStreetMap; four separate
Overpass queries for `boundary=administrative` at admin levels 8, 9 and 10
returned nothing usable. Rather than invent boundaries, this script clusters the
points into WARD_COUNT spatial groups with k-means and labels them W01..W39.

That is enough for what the report asks of `ward_id` — grouping points for
median imputation and for ward-level reporting — but it is not the municipal
ward map, and nothing downstream should claim it is.

Usage
-----
    ml/.venv/Scripts/python ml/scripts/build_points.py
"""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

from sklearn.cluster import KMeans

ML_ROOT = Path(__file__).resolve().parents[1]
OSM_FILE = ML_ROOT / "data" / "osm" / "bhimavaram_osm.json"
OUT_FILE = ML_ROOT / "data" / "points.csv"

# Two places nearer than this share a collection point in practice.
MIN_SEPARATION_M = 100

# Bhimavaram municipality has 39 wards. The count is right even though the
# boundaries here are clustered rather than official.
WARD_COUNT = 39
RANDOM_STATE = 42

# Metres per degree at Bhimavaram's latitude (16.54 N). Good to about 0.1% over
# a 15 km town, which is far below the precision this registry claims.
M_PER_DEG_LAT = 111_000
M_PER_DEG_LON = 106_000

# site_type uses the five values named in report Table 6.1; land_use is the
# category the urgency model and the median imputation group on.
#
# The mapping reads the OSM tag that is actually present. A marketplace is the
# only true "market"; residential polygons get "roadside" because household
# waste in these wards is left at the kerb rather than in a municipal bin; and
# industrial land gets "vacant plot", which is where its waste accumulates.
# "Institutional" is too coarse for an Indian town and produces the wrong waste
# mix. A temple's bin is flowers, leaf plates and prasadam — among the most
# organic-heavy points anywhere in the ward. A school's is paper. A hospital's
# is dressings, packaging and sharps, which the report's seven categories can
# only express as mixed. Lumping all three together made paper rival organic
# across the whole town, which is not what Indian municipal waste looks like.
AMENITY_MAP = {
    "marketplace": ("market", "market"),
    "school": ("bin", "education"),
    "college": ("bin", "education"),
    "university": ("bin", "education"),
    "hospital": ("bin", "healthcare"),
    "clinic": ("bin", "healthcare"),
    "place_of_worship": ("bin", "religious"),
    "bus_station": ("bin", "civic"),
    "townhall": ("bin", "civic"),
    "police": ("bin", "civic"),
    "restaurant": ("bin", "commercial"),
    "cafe": ("bin", "commercial"),
    "fuel": ("bin", "commercial"),
}

# Names that mean "market" here, whatever the OSM tag says. "santha" is a weekly
# market in Telugu; "rythu bazaar" is the state-run farmers' market; "mandi" is
# the wholesale yard.
MARKET_NAME_WORDS = ("market", "santha", "bazaar", "bazar", "rythu", "mandi")

# A supermarket is a retail shop that happens to contain the word. Its waste is
# packaging, not the wet organic load of a produce market, so it must not be
# swept up by the name check above.
NOT_MARKET_NAME_WORDS = ("supermarket", "super market", "hypermarket")

LANDUSE_MAP = {
    "residential": ("roadside", "residential"),
    "commercial": ("bin", "commercial"),
    "retail": ("bin", "commercial"),
    "industrial": ("vacant plot", "industrial"),
}

# Standard Indian municipal container sizes, in litres, chosen by how much waste
# the land use generates. These are the `C_i` of the urgency score in report
# §6.5, so they have to be plausible rather than uniform.
CAPACITY_BY_LAND_USE = {
    "market": 1100,
    "industrial": 1100,
    "commercial": 660,
    # A temple on a festival day fills a container faster than any shop.
    "religious": 660,
    "healthcare": 660,
    "education": 240,
    "civic": 240,
    "residential": 240,
}


def metres_between(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    """Planar distance in metres. Exact enough across a town this size."""
    return math.hypot((lat_a - lat_b) * M_PER_DEG_LAT, (lon_a - lon_b) * M_PER_DEG_LON)


def classify(tags: dict) -> tuple[str, str] | None:
    """Return (site_type, land_use) for an OSM element, or None to skip it.

    Order matters: a shop inside a residential polygon is commercial, so the
    specific tags are read before the land-use ones.
    """
    # OSM tags only one place in Bhimavaram as `amenity=marketplace`, which is
    # wrong for a town of this size and would leave the generation model with a
    # single weekly peak. The fish market is tagged `shop`, and markets here are
    # commonly named "santha" (Telugu weekly market) or "rythu bazaar" (farmers'
    # market) without ever carrying the marketplace tag. Reading the name
    # recovers them. Checked before the tags for exactly that reason.
    name = tags.get("name", "").casefold()
    looks_like_market = any(word in name for word in MARKET_NAME_WORDS) and not any(
        word in name for word in NOT_MARKET_NAME_WORDS
    )
    if looks_like_market:
        return "market", "market"

    amenity = tags.get("amenity")
    if amenity in AMENITY_MAP:
        return AMENITY_MAP[amenity]

    if tags.get("shop"):
        return "bin", "commercial"

    if tags.get("highway") == "bus_stop":
        return "bin", "commercial"

    landuse = tags.get("landuse")
    if landuse in LANDUSE_MAP:
        return LANDUSE_MAP[landuse]

    return None


def coordinates_of(element: dict) -> tuple[float, float] | None:
    """Nodes carry lat/lon directly; ways and relations carry a computed centre."""
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]

    centre = element.get("center")
    if centre:
        return centre["lat"], centre["lon"]

    return None


def main() -> None:
    raw = json.loads(OSM_FILE.read_text(encoding="utf-8"))

    candidates = []
    for element in raw["elements"]:
        tags = element.get("tags", {})
        position = coordinates_of(element)
        if position is None:
            continue

        classified = classify(tags)
        if classified is None:
            continue

        site_type, land_use = classified
        lat, lon = position
        candidates.append(
            {
                "lat": lat,
                "lon": lon,
                "name": tags.get("name", "").strip(),
                "site_type": site_type,
                "land_use": land_use,
                "osm_type": element["type"],
                "osm_id": element["id"],
            }
        )

    # Markets win every tie, then named places. A market is the single highest
    # waste generator in the town and the source of the weekly peak the
    # forecaster has to learn, so losing one to a neighbouring shop would quietly
    # flatten the whole generation model. Sorting it first means it is placed
    # before anything can displace it.
    #
    # After markets, a named place beats an unnamed one: the point that survives
    # should be one a collector can be told to drive to.
    candidates.sort(key=lambda c: (c["land_use"] != "market", c["name"] == "", c["name"]))

    kept: list[dict] = []
    for candidate in candidates:
        too_close = any(
            metres_between(candidate["lat"], candidate["lon"], k["lat"], k["lon"])
            < MIN_SEPARATION_M
            for k in kept
        )
        if not too_close:
            kept.append(candidate)

    if len(kept) < WARD_COUNT:
        raise SystemExit(
            f"only {len(kept)} points survived deduplication, fewer than the "
            f"{WARD_COUNT} wards they must be clustered into"
        )

    # Cluster on metres, not degrees: a degree of longitude is shorter than a
    # degree of latitude here, and k-means would stretch the wards east-west.
    positions = [
        [point["lat"] * M_PER_DEG_LAT, point["lon"] * M_PER_DEG_LON] for point in kept
    ]
    labels = KMeans(n_clusters=WARD_COUNT, random_state=RANDOM_STATE, n_init=10).fit_predict(
        positions
    )

    # Number wards from the south-west corner so W01 is always the same ward
    # between runs. k-means labels are arbitrary and would otherwise shuffle.
    order = sorted(
        range(WARD_COUNT),
        key=lambda label: min(
            (kept[i]["lat"], kept[i]["lon"])
            for i, assigned in enumerate(labels)
            if assigned == label
        ),
    )
    ward_number = {label: index + 1 for index, label in enumerate(order)}

    # Sort by ward so point_id runs in geographic order, which makes the CSV
    # readable and keeps nearby points near each other in the file.
    for point, label in zip(kept, labels):
        point["ward_id"] = f"W{ward_number[label]:02d}"
    kept.sort(key=lambda p: (p["ward_id"], p["lat"], p["lon"]))

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUT_FILE.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "point_id",
                "name",
                "lat",
                "lon",
                "site_type",
                "land_use",
                "capacity_l",
                "ward_id",
                "osm_type",
                "osm_id",
                "field_verified",
            ]
        )
        for index, point in enumerate(kept, start=1):
            writer.writerow(
                [
                    f"P{index:04d}",
                    point["name"],
                    f"{point['lat']:.6f}",
                    f"{point['lon']:.6f}",
                    point["site_type"],
                    point["land_use"],
                    CAPACITY_BY_LAND_USE[point["land_use"]],
                    point["ward_id"],
                    point["osm_type"],
                    point["osm_id"],
                    # Set to true by hand for every point the team confirms on
                    # foot. The report can then state how many of the derived
                    # points were verified, which is the difference between a
                    # method and an assumption.
                    "false",
                ]
            )

    named = sum(1 for point in kept if point["name"])
    print(f"candidates      {len(candidates)}")
    print(f"kept            {len(kept)}  ({named} named)")
    print(f"wards           {WARD_COUNT}")
    print(f"written         {OUT_FILE}")

    by_land_use: dict[str, int] = {}
    for point in kept:
        by_land_use[point["land_use"]] = by_land_use.get(point["land_use"], 0) + 1
    for land_use, count in sorted(by_land_use.items(), key=lambda item: -item[1]):
        print(f"  {land_use:<14} {count}")


if __name__ == "__main__":
    main()
