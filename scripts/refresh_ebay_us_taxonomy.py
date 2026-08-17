"""Refresh and flatten the current eBay US category taxonomy."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = REPO_ROOT / "processed" / "ebay-taxonomy"
DEFAULT_RESPONSE = CACHE_DIR / "raw-default-category-tree-id.json"
TREE_RESPONSE = CACHE_DIR / "raw-category-tree.json"
META_FILE = CACHE_DIR / "cache-meta.json"
FLAT_FILE = CACHE_DIR / "category-tree-flat.json"
RECOMMENDATIONS_FILE = CACHE_DIR / "clean-10-category-recommendations.md"
INVENTORY_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "listings.json"
CLEAN10_FILE = REPO_ROOT / "processed" / "generic-memorabilia" / "ebay-upload-clean-10.csv"

MARKETPLACE_ID = "EBAY_US"
API_ROOT = "https://api.ebay.com/commerce/taxonomy/v1"
PUBLIC_SCOPE = "https://api.ebay.com/oauth/api_scope"


def load_dot_vars() -> dict[str, str]:
    values: dict[str, str] = {}
    path = REPO_ROOT / ".dev.vars"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                values.setdefault(key.strip(), value.strip())
    values.update({key: value for key, value in os.environ.items() if key.startswith("EBAY_")})
    return values


def request_json(url: str, headers: dict[str, str], body: bytes | None = None) -> dict[str, Any]:
    request = urllib.request.Request(url, data=body, headers=headers, method="POST" if body else "GET")
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def get_application_token(credentials: dict[str, str]) -> str:
    client_id = credentials.get("EBAY_CLIENT_ID")
    client_secret = credentials.get("EBAY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required")
    import base64
    import urllib.parse

    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    body = urllib.parse.urlencode({"grant_type": "client_credentials", "scope": PUBLIC_SCOPE}).encode()
    payload = request_json(
        "https://api.ebay.com/identity/v1/oauth2/token",
        {"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
        body,
    )
    token = payload.get("access_token")
    if not token:
        raise RuntimeError("eBay token response did not contain access_token")
    return token


def fetch_taxonomy(token: str) -> tuple[dict[str, Any], dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json", "Content-Language": "en-US"}
    default_response = request_json(f"{API_ROOT}/get_default_category_tree_id?marketplace_id={MARKETPLACE_ID}", headers)
    tree_id = default_response.get("categoryTreeId")
    if not tree_id:
        raise RuntimeError("Default category tree response did not contain categoryTreeId")
    tree_response = request_json(f"{API_ROOT}/category_tree/{tree_id}", headers)
    return default_response, tree_response


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def flatten_tree(tree: dict[str, Any]) -> list[dict[str, Any]]:
    tree_id = tree.get("categoryTreeId")
    version = tree.get("categoryTreeVersion")
    root = tree.get("rootCategoryNode") or {}
    rows: list[dict[str, Any]] = []

    def visit(node: dict[str, Any], ancestors: list[dict[str, str]], level: int) -> None:
        category = node.get("category") or {}
        category_id = str(category.get("categoryId", ""))
        category_name = category.get("categoryName", "")
        path_names = [entry["categoryName"] for entry in ancestors] + [category_name]
        children = node.get("childCategoryTreeNodes") or []
        rows.append(
            {
                "category_id": category_id,
                "category_name": category_name,
                "ancestor_path": " > ".join(path_names),
                "parent_id": ancestors[-1]["categoryId"] if ancestors else None,
                "tree_level": node.get("categoryTreeNodeLevel", level),
                "is_leaf": bool(node.get("leafCategoryTreeNode", not children)) and not children,
                "marketplace": MARKETPLACE_ID,
                "category_tree_id": tree_id,
                "category_tree_version": version,
            }
        )
        next_ancestors = ancestors + [{"categoryId": category_id, "categoryName": category_name}]
        for child in children:
            visit(child, next_ancestors, level + 1)

    visit(root, [], 0)
    return rows


def tokens(value: str) -> set[str]:
    ignored = {"the", "and", "for", "with", "new", "game", "set", "item", "in", "of", "a", "an", "to"}
    return {token for token in re.findall(r"[a-z0-9]+", value.lower()) if len(token) > 2 and token not in ignored}


RECOMMENDATION_RULES = {
    "1996-atlanta-summer-games-publication": ("50132", "73430", "review"),
    "mlb-all-star-game-ticket-stub-and-program": ("64490", "50132", "review"),
    "toronto-blue-jays-hot-wheels-die-cast-vehicle": ("50133", None, "review"),
    "1998-ncaa-womens-final-four-ticket-stubs": ("50132", None, "high"),
    "2001-sports-illustrated-dale-earnhardt-memorial": ("64488", None, "high"),
    "1990-kc-royals-yearbook": ("64491", None, "high"),
    "2002-cmh-golf-classic-publication": ("73430", "64488", "review"),
    "mlb-25-patch": ("64484", None, "high"),
    "1998-mlb-all-star-game-nyc-patch": ("64484", None, "high"),
    "2001-nascar-illustrated-earnhardt-memorial": ("64488", None, "high"),
}


def recommend_categories(rows: list[dict[str, Any]], listings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    leaves = {row["category_id"]: row for row in rows if row["is_leaf"]}
    recommendations: list[dict[str, Any]] = []
    for item in listings:
        item_id = item["item_id"]
        category_id, alternate_id, confidence = RECOMMENDATION_RULES[item_id]
        best = leaves[category_id]
        alternate = leaves.get(alternate_id) if alternate_id else None
        recommendations.append(
            {
                "item_id": item_id,
                "proposed_category_id": best["category_id"],
                "category_path": best["ancestor_path"],
                "confidence": confidence,
                "plausible_alternate": alternate["ancestor_path"] if alternate else None,
                "alternate_category_id": alternate["category_id"] if alternate else None,
                "note": "Mark review required" if confidence == "review" else None,
            }
        )
    return recommendations


def write_recommendations(recommendations: list[dict[str, Any]], version: str) -> None:
    lines = [
        "# CLEAN-10 eBay category recommendations",
        "",
        f"Marketplace: `{MARKETPLACE_ID}` | Category tree version: `{version}`",
        "",
        "Leaf categories only. Recommendations are derived candidates; do not regenerate the Seller Hub CSV until reviewed.",
        "",
        "| item | proposed category ID | category path | confidence | plausible alternate |",
        "|---|---:|---|---|---|",
    ]
    for row in recommendations:
        alternate = row["plausible_alternate"] or "None"
        lines.append(f"| {row['item_id']} | {row['proposed_category_id']} | {row['category_path']} | {row['confidence']} | {alternate} |")
    RECOMMENDATIONS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    credentials = load_dot_vars()
    token = get_application_token(credentials)
    default_response, tree_response = fetch_taxonomy(token)
    version = tree_response.get("categoryTreeVersion")
    tree_id = tree_response.get("categoryTreeId")
    if not version or not tree_id:
        raise RuntimeError("Category tree response missing categoryTreeId or categoryTreeVersion")
    previous = json.loads(META_FILE.read_text(encoding="utf-8")) if META_FILE.exists() else {}
    changed = args.force or previous.get("category_tree_version") != version or not FLAT_FILE.exists()
    if changed:
        write_json(DEFAULT_RESPONSE, default_response)
        write_json(TREE_RESPONSE, tree_response)
        rows = flatten_tree(tree_response)
        write_json(FLAT_FILE, {"marketplace": MARKETPLACE_ID, "category_tree_id": tree_id, "category_tree_version": version, "categories": rows})
        write_json(META_FILE, {"marketplace": MARKETPLACE_ID, "category_tree_id": tree_id, "category_tree_version": version, "refreshed_at": datetime.now(timezone.utc).isoformat(), "category_count": len(rows), "leaf_count": sum(row["is_leaf"] for row in rows)})
        print(f"Refreshed taxonomy version {version}: {len(rows)} categories")
    else:
        rows = json.loads(FLAT_FILE.read_text(encoding="utf-8"))["categories"]
        print(f"Taxonomy version {version} unchanged; preserved cache")
    listings = json.loads(INVENTORY_FILE.read_text(encoding="utf-8"))
    clean10_ids = [
        row["SKU"]
        for row in csv.DictReader(CLEAN10_FILE.open("r", encoding="utf-8-sig", newline=""))
    ]
    listings_by_id = {item["item_id"]: item for item in listings}
    listings = [listings_by_id[item_id] for item_id in clean10_ids if item_id in listings_by_id]
    if len(listings) != 10:
        raise RuntimeError(f"Expected 10 CLEAN-10 listings, found {len(listings)}")
    recommendations = recommend_categories(rows, listings)
    write_recommendations(recommendations, version)
    print(f"Wrote recommendations for {len(recommendations)} CLEAN-10 records")


if __name__ == "__main__":
    main()
