"""Export approved CLEAN-10 drafts using the downloaded eBay category template."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[1]
LISTINGS_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "listings.json"
CLEAN10_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "ebay-upload-clean-10.csv"
OUTPUT_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "ebay-upload-clean-10-v2.csv"
DEFAULT_TEMPLATE = Path(r"C:\Users\Meybells\Downloads\incoming-assets\eBay-category-listing-template-Aug-5-2026-19-40-51.csv")
PUBLIC_HOST = "pub-2bccab9e377e4ad8a7f475705f0aedb0.r2.dev"

APPROVED_CATEGORIES = {
    "1996-atlanta-summer-games-publication": "73430",
    "mlb-all-star-game-ticket-stub-and-program": "64490",
    "toronto-blue-jays-hot-wheels-die-cast-vehicle": "50133",
    "1998-ncaa-womens-final-four-ticket-stubs": "50132",
    "2001-sports-illustrated-dale-earnhardt-memorial": "64488",
    "1990-kc-royals-yearbook": "64491",
    "2002-cmh-golf-classic-publication": "73430",
    "mlb-25-patch": "64484",
    "1998-mlb-all-star-game-nyc-patch": "64484",
    "2001-nascar-illustrated-earnhardt-memorial": "64488",
}

SPORTS = {
    "1996-atlanta-summer-games-publication": "Olympics",
    "mlb-all-star-game-ticket-stub-and-program": "Baseball",
    "toronto-blue-jays-hot-wheels-die-cast-vehicle": "Baseball",
    "1998-ncaa-womens-final-four-ticket-stubs": "Basketball",
    "2001-sports-illustrated-dale-earnhardt-memorial": "Auto Racing",
    "1990-kc-royals-yearbook": "Baseball",
    "2002-cmh-golf-classic-publication": "Golf",
    "mlb-25-patch": "Baseball",
    "1998-mlb-all-star-game-nyc-patch": "Baseball",
    "2001-nascar-illustrated-earnhardt-memorial": "Auto Racing",
}

TEAMS = {
    "toronto-blue-jays-hot-wheels-die-cast-vehicle": "Toronto Blue Jays",
    "1990-kc-royals-yearbook": "Kansas City Royals",
}

EVENTS = {
    "1996-atlanta-summer-games-publication": "1996 Atlanta Summer Games",
    "mlb-all-star-game-ticket-stub-and-program": "2008 MLB All-Star Game",
    "1998-ncaa-womens-final-four-ticket-stubs": "1998 NCAA Women's Final Four",
    "2002-cmh-golf-classic-publication": "2002 CMH Golf Classic",
}

YEARS = {
    "1996-atlanta-summer-games-publication": "1996",
    "mlb-all-star-game-ticket-stub-and-program": "2008",
    "1998-ncaa-womens-final-four-ticket-stubs": "1998",
    "2001-sports-illustrated-dale-earnhardt-memorial": "2001",
    "1990-kc-royals-yearbook": "1990",
    "2002-cmh-golf-classic-publication": "2002",
    "1998-mlb-all-star-game-nyc-patch": "1998",
    "2001-nascar-illustrated-earnhardt-memorial": "2001",
}


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def load_drafts() -> dict[str, dict]:
    drafts = json.loads(LISTINGS_FILE.read_text(encoding="utf-8"))
    return {item["item_id"]: item for item in drafts}


def validate_source(rows: list[dict[str, str]], drafts: dict[str, dict]) -> None:
    if len(rows) != 10:
        raise ValueError(f"Expected 10 CLEAN-10 source rows, found {len(rows)}")
    for row in rows:
        item_id = row["SKU"]
        item = drafts.get(item_id)
        if not item or item["listing"]["review"]["flagged"] is not False:
            raise ValueError(f"CLEAN-10 source is missing or flagged: {item_id}")
        if float(row["Price"]) <= 0 or float(row["ShippingServiceCost"]) != 9.75:
            raise ValueError(f"Invalid price/shipping source values: {item_id}")
        if not row["PictureURL"]:
            raise ValueError(f"Missing media: {item_id}")
        for url in row["PictureURL"].split("|"):
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.netloc != PUBLIC_HOST or not url.endswith(".webp"):
                raise ValueError(f"Invalid media URL: {item_id}")


def template_rows(path: Path) -> tuple[list[str], list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.reader(source))
    if len(rows) < 2 or rows[0][:3] != ["Info", "Version=1.0.0", "Template=fx_category_template_EBAY_US"]:
        raise ValueError("Unexpected eBay template metadata row")
    headers = rows[1]
    if len(headers) != 96 or headers[0].startswith("#"):
        raise ValueError("Unexpected eBay template header row")
    return rows[0], headers


def make_record(row: dict[str, str], item: dict, headers: list[str]) -> list[str]:
    item_id = row["SKU"]
    listing = item["listing"]
    values = {header: "" for header in headers}
    values[headers[0]] = "Draft"
    values["CustomLabel"] = item_id
    values["*Category"] = APPROVED_CATEGORIES[item_id]
    values["*Title"] = row["Title"]
    values["*Description"] = row["Description"]
    values["*Format"] = "FixedPrice"
    values["*Duration"] = "GTC"
    values["*StartPrice"] = row["Price"]
    values["*Quantity"] = "1"
    values["ShippingType"] = "Flat"
    values["ShippingService-1:Cost"] = row["ShippingServiceCost"]
    values["*DispatchTimeMax"] = "1"
    values["*ReturnsAcceptedOption"] = "ReturnsNotAccepted"
    values["*C:Sport"] = SPORTS[item_id]
    values["C:Team"] = TEAMS.get(item_id, "")
    values["C:Event/Tournament"] = EVENTS.get(item_id, "")
    values["C:Year Manufactured"] = YEARS.get(item_id, "")
    values["PicURL"] = row["PictureURL"]
    if values["*ConditionID"]:
        raise ValueError(f"ConditionID must remain blank: {item_id}")
    if listing["approval"]["approved"] is not False or listing["status"] != "draft":
        raise ValueError(f"Draft safeguard changed: {item_id}")
    return [values[header] for header in headers]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    args = parser.parse_args()
    source_rows = load_rows(CLEAN10_FILE)
    drafts = load_drafts()
    validate_source(source_rows, drafts)
    metadata, headers = template_rows(args.template)
    records = [make_record(row, drafts[row["SKU"]], headers) for row in source_rows]
    with OUTPUT_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(metadata)
        writer.writerow(headers)
        writer.writerows(records)
    print(f"Exported {len(records)} Draft rows to {OUTPUT_FILE}")
    print(f"Template columns: {len(headers)}; ConditionID values populated: 0")


if __name__ == "__main__":
    main()
