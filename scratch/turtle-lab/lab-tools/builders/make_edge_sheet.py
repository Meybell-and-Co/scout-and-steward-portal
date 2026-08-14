from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "output" / "full-validation" / "edge-review"
DESTINATION = SOURCE / "edge-review-sheet.jpg"

files = sorted(
    SOURCE.glob("*.jpg"),
    key=lambda p: p.name
)

TILE_WIDTH = 500
LABEL_HEIGHT = 45
COLUMNS = 4


def resize_to_width(image, width):
    h, w = image.shape[:2]
    scale = width / w
    return cv2.resize(
        image,
        (width, int(h * scale)),
        interpolation=cv2.INTER_AREA
    )


tiles = []

for path in files:
    image = cv2.imread(str(path))

    if image is None:
        continue

    image = resize_to_width(
        image,
        TILE_WIDTH
    )

    label = np.full(
        (LABEL_HEIGHT, TILE_WIDTH, 3),
        255,
        dtype=np.uint8
    )

    cv2.putText(
        label,
        path.stem,
        (12, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (0, 0, 0),
        2,
        cv2.LINE_AA
    )

    tiles.append(
        np.vstack([
            label,
            image
        ])
    )


tile_height = max(
    tile.shape[0]
    for tile in tiles
)

padded = []

for tile in tiles:
    if tile.shape[0] < tile_height:
        tile = np.vstack([
            tile,
            np.full(
                (
                    tile_height - tile.shape[0],
                    TILE_WIDTH,
                    3
                ),
                255,
                dtype=np.uint8
            )
        ])

    padded.append(tile)


rows = []

for index in range(
    0,
    len(padded),
    COLUMNS
):
    row = padded[
        index:index + COLUMNS
    ]

    while len(row) < COLUMNS:
        row.append(
            np.full(
                (tile_height, TILE_WIDTH, 3),
                255,
                dtype=np.uint8
            )
        )

    rows.append(
        np.hstack(row)
    )


sheet = np.vstack(rows)

cv2.imwrite(
    str(DESTINATION),
    sheet,
    [cv2.IMWRITE_JPEG_QUALITY, 90]
)

print(f"EDGE REVIEW SHEET: {DESTINATION}")
print(f"Images: {len(tiles)}")
print(
    f"Dimensions: "
    f"{sheet.shape[1]} x {sheet.shape[0]}"
)
