"""Project approved CLEAN-10 data into eBay's dedicated draft template."""

from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "processed" / "generic-memorabilia" / "eBay-draft-listing-template-Aug-17-2026-2-13-37.csv"
SOURCE = ROOT / "processed" / "generic-memorabilia" / "ebay-upload-clean-10-v2.csv"
OUTPUT = ROOT / "processed" / "generic-memorabilia" / "ebay-upload-clean-10-draft-template.csv"

EXPECTED_HEADERS = [
    "Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)",
    "Custom label (SKU)",
    "Category ID",
    "Title",
    "UPC",
    "Price",
    "Quantity",
    "Item photo URL",
    "Condition ID",
    "Description",
    "Format",
]


def read_rows(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.reader(source))


def main() -> None:
    template_rows = read_rows(TEMPLATE)
    source_rows = read_rows(SOURCE)
    if len(template_rows) != 6 or template_rows[4] != EXPECTED_HEADERS:
        raise ValueError("Draft template envelope or header contract changed")
    if len(source_rows) != 12 or len(source_rows[2:]) != 10:
        raise ValueError("Expected exactly ten CLEAN-10 v2 data rows")
    source_header = source_rows[1]
    source_index = {header: index for index, header in enumerate(source_header)}
    required_source = ["CustomLabel", "*Category", "*Title", "*StartPrice", "*Quantity", "PicURL", "*Description", "*Format"]
    if any(header not in source_index for header in required_source):
        raise ValueError("CLEAN-10 v2 source contract changed")

    output_rows = template_rows[:5]
    for source in source_rows[2:]:
        record = [""] * len(EXPECTED_HEADERS)
        record[0] = "Draft"
        record[1] = source[source_index["CustomLabel"]]
        record[2] = source[source_index["*Category"]]
        record[3] = source[source_index["*Title"]]
        record[5] = source[source_index["*StartPrice"]]
        record[6] = source[source_index["*Quantity"]]
        record[7] = source[source_index["PicURL"]]
        record[9] = source[source_index["*Description"]]
        record[10] = source[source_index["*Format"]]
        if record[4] or record[8]:
            raise ValueError("Unsupported UPC or Condition ID was populated")
        output_rows.append(record)

    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as output:
        csv.writer(output).writerows(output_rows)
    print(f"Exported {len(output_rows) - 5} draft rows to {OUTPUT}")
    print(f"Template columns: {len(EXPECTED_HEADERS)}; Condition IDs populated: 0")


if __name__ == "__main__":
    main()
