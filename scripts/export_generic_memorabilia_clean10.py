"""Export the top 10 unflagged generic memorabilia drafts for posting."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[1]
LISTINGS_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "listings.json"
OUTPUT_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "ebay-upload-clean-10.csv"
PUBLIC_HOST = "pub-2bccab9e377e4ad8a7f475705f0aedb0.r2.dev"
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


def load_drafts() -> list[dict]:
    with LISTINGS_FILE.open("r", encoding="utf-8") as source:
        drafts = json.load(source)
    if len(drafts) != 29:
        raise ValueError(f"Expected 29 canonical drafts, found {len(drafts)}")
    return drafts


def validate_listing(item: dict) -> None:
    listing = item.get("listing", {})
    required = ("status", "category_id", "title", "description", "condition", "pricing", "shipping", "returns", "picture_urls", "approval", "review")
    missing = [field for field in required if field not in listing]
    if missing:
        raise ValueError(f"{item.get('item_id', 'unknown')}: missing fields {missing}")
    price = listing["pricing"].get("recommended_price")
    if not isinstance(price, (int, float)) or price <= 0:
        raise ValueError(f"{item['item_id']}: price must be greater than zero")
    if listing["status"] != "draft" or listing["approval"].get("approved") is not False:
        raise ValueError(f"{item['item_id']}: draft safeguard is not intact")
    if listing["shipping"] != {"mode": "flat", "amount": 9.75}:
        raise ValueError(f"{item['item_id']}: shipping assumption changed")
    if not listing["picture_urls"]:
        raise ValueError(f"{item['item_id']}: no media references")
    for url in listing["picture_urls"]:
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != PUBLIC_HOST or not url.lower().endswith(".webp"):
            raise ValueError(f"{item['item_id']}: invalid public WebP URL")


def write_csv(items: list[dict]) -> None:
    with OUTPUT_FILE.open("w", newline="", encoding="utf-8-sig") as output:
        writer = csv.DictWriter(output, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for item in items:
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
    drafts = load_drafts()
    for item in drafts:
        validate_listing(item)
    candidates = [item for item in drafts if item["listing"]["review"]["flagged"] is False]
    candidates.sort(key=lambda item: item["listing"]["pricing"]["recommended_price"], reverse=True)
    selected = candidates[:10]
    if len(selected) != 10 or any(item["listing"]["review"]["flagged"] for item in selected):
        raise ValueError("CLEAN-10 selection failed review-flag exclusion")
    write_csv(selected)
    print(f"Exported {len(selected)} clean drafts to {OUTPUT_FILE}")
    for item in selected:
        listing = item["listing"]
        print(f"{item['item_id']}\t{listing['pricing']['recommended_price']:.2f}\t{len(listing['picture_urls'])}")


if __name__ == "__main__":
    main()
