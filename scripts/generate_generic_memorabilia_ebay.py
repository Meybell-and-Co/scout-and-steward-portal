"""Generate draft eBay JSON and CSV output for generic memorabilia Phase 2."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[1]
INVENTORY_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "inventory.json"
DERIVATIVES_DIR = REPO_ROOT / "processed" / "generic-memorabilia" / "derivatives"
LISTINGS_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "listings.json"
EXPORT_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "ebay-upload.csv"

CATEGORY_ID = 261328
CONDITION = "Very Good"
SHIPPING_MODE = "flat"
SHIPPING_AMOUNT = 9.75
RETURNS_ACCEPTED = False
PUBLIC_HOST = "pub-2bccab9e377e4ad8a7f475705f0aedb0.r2.dev"
TITLE_LIMIT = 80

CSV_FIELDS = [
    "SKU",
    "Category",
    "Title",
    "Description",
    "Price",
    "Condition",
    "ShippingType",
    "ShippingServiceCost",
    "ReturnsAccepted",
    "PictureURL",
]


def load_inventory() -> dict[str, Any]:
    with INVENTORY_FILE.open("r", encoding="utf-8") as source:
        inventory = json.load(source)
    if inventory.get("phase") != 2 or inventory.get("inventory_type") != "generic_memorabilia":
        raise ValueError("Expected generic memorabilia Phase 2 inventory")
    if inventory.get("object_count") != len(inventory.get("objects", [])):
        raise ValueError("Inventory object_count does not match objects")
    return inventory


def truncate_title(title: str) -> str:
    if len(title) <= TITLE_LIMIT:
        return title
    shortened = title[:TITLE_LIMIT].rsplit(" ", 1)[0].rstrip()
    return shortened or title[:TITLE_LIMIT].rstrip()


def build_title(item: dict[str, Any], details: dict[str, Any]) -> str:
    title = f"{item['object_type']} - {details['supported_identification']}"
    return truncate_title(" ".join(title.split()))


def validate_media(item: dict[str, Any]) -> list[str]:
    urls: list[str] = []
    for media in item.get("media", []):
        url = media.get("r2_url", "")
        parsed = urlparse(url)
        derivative = media.get("derivative_filename", "")
        if parsed.scheme != "https" or parsed.netloc != PUBLIC_HOST or not url.lower().endswith(".webp"):
            raise ValueError(f"{item['slug']}: invalid public WebP URL")
        if not derivative or not (DERIVATIVES_DIR / derivative).is_file():
            raise ValueError(f"{item['slug']}: missing derivative {derivative}")
        urls.append(url)
    if not urls:
        raise ValueError(f"{item['slug']}: no media references")
    return urls


def build_description(details: dict[str, Any]) -> str:
    lines = [
        details["supported_identification"],
        f"Condition observations: {details['condition_observations']}",
        "Please review all photos carefully before purchase.",
    ]
    if details.get("review_flag"):
        lines.append(f"Review caveat: {details['review_reason']}")
    return "\n\n".join(lines)


def build_listing(item: dict[str, Any]) -> dict[str, Any]:
    details = item.get("phase2") or {}
    price = details.get("baseline_bin_usd")
    if not isinstance(price, (int, float)) or price <= 0:
        raise ValueError(f"{item.get('slug', 'unknown')}: price must be greater than zero")
    picture_urls = validate_media(item)
    review_flag = bool(details.get("review_flag"))
    listing = {
        "status": "draft",
        "category_id": CATEGORY_ID,
        "title": build_title(item, details),
        "description": build_description(details),
        "condition": {"recommended": CONDITION, "approved": None},
        "pricing": {
            "recommended_price": round(float(price), 2),
            "approved_price": None,
            "price_guard": "greater_than_zero",
        },
        "shipping": {"mode": SHIPPING_MODE, "amount": SHIPPING_AMOUNT},
        "returns": {"accepted": RETURNS_ACCEPTED},
        "picture_urls": picture_urls,
        "approval": {
            "approved": False,
            "approved_by": None,
            "approved_at": None,
        },
        "review": {
            "flagged": review_flag,
            "reason": details.get("review_reason"),
            "pricing_confidence": details.get("pricing_confidence"),
            "market_evidence": details.get("market_evidence_summary"),
        },
    }
    return {"item_id": item["slug"], "inventory": item, "listing": listing}


def write_outputs(listings: list[dict[str, Any]]) -> None:
    LISTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    LISTINGS_FILE.write_text(json.dumps(listings, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    with EXPORT_FILE.open("w", newline="", encoding="utf-8-sig") as output:
        writer = csv.DictWriter(output, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for item in listings:
            listing = item["listing"]
            writer.writerow(
                {
                    "SKU": item["item_id"],
                    "Category": listing["category_id"],
                    "Title": listing["title"],
                    "Description": listing["description"],
                    "Price": f"{listing['pricing']['recommended_price']:.2f}",
                    "Condition": listing["condition"]["recommended"],
                    "ShippingType": listing["shipping"]["mode"],
                    "ShippingServiceCost": f"{listing['shipping']['amount']:.2f}",
                    "ReturnsAccepted": "ReturnsAccepted" if listing["returns"]["accepted"] else "ReturnsNotAccepted",
                    "PictureURL": "|".join(listing["picture_urls"]),
                }
            )


def main() -> None:
    inventory = load_inventory()
    listings = [build_listing(item) for item in inventory["objects"]]
    if len(listings) != 29:
        raise ValueError(f"Expected 29 listings, built {len(listings)}")
    if any(item["listing"]["pricing"]["recommended_price"] <= 0 for item in listings):
        raise ValueError("Refusing to write a zero-priced listing")
    write_outputs(listings)
    print(f"Generated {len(listings)} draft listings")
    print(f"JSON: {LISTINGS_FILE}")
    print(f"CSV: {EXPORT_FILE}")


if __name__ == "__main__":
    main()
