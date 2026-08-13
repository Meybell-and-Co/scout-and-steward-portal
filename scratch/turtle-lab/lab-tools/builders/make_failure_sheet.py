from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "output" / "full-validation"
DESTINATION = SOURCE / "failure-review-sheet.jpg"

PATTERNS = [
    "UD_001_C_056_01_a_DEBUG.jpg",
    "UD_001_C_058_01_a_DEBUG.jpg",
    "UD_001_C_060_01_a_DEBUG.jpg",
    "UD_001_C_061_01_a_DEBUG.jpg",
    "UD_001_C_084_01_a_DEBUG.jpg",
    "UD_001_G_097_01_a_DEBUG.jpg",
    "UD_002_A_0101_01_a_DEBUG.jpg",
    "UD_002_B_0002_01_a_DEBUG.jpg",
    "UD_002_B_0003_01_a_DEBUG.jpg",
    "UD_002_B_0003_02_a_DEBUG.jpg",
    "UD_002_B_0006_01_01_a_DEBUG.jpg",
    "UD_002_B_0006_02_01_a_DEBUG.jpg",
]

TILE_WIDTH = 800
LABEL_HEIGHT = 60
COLUMNS = 3


def resize_to_width(image, width):
    height, current_width = image.shape[:2]

    scale = width / current_width
    new_height = int(height * scale)

    return cv2.resize(
        image,
        (width, new_height),
        interpolation=cv2.INTER_AREA,
    )


def main():
    images = []

    for name in PATTERNS:
        path = SOURCE / name

        image = cv2.imread(str(path))

        if image is None:
            raise RuntimeError(
                f"Could not read: {path}"
            )

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
            name.replace("_DEBUG.jpg", ""),
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 0, 0),
            2,
            cv2.LINE_AA,
        )

        images.append(
            np.vstack([
                label,
                image,
            ])
        )

    tile_height = max(
        image.shape[0]
        for image in images
    )

    padded = []

    for image in images:
        if image.shape[0] < tile_height:
            padding = np.full(
                (
                    tile_height - image.shape[0],
                    TILE_WIDTH,
                    3
                ),
                255,
                dtype=np.uint8
            )

            image = np.vstack([
                image,
                padding,
            ])

        padded.append(image)

    rows = []

    for index in range(
        0,
        len(padded),
        COLUMNS
    ):
        row_images = padded[
            index:index + COLUMNS
        ]

        while len(row_images) < COLUMNS:
            row_images.append(
                np.full(
                    (tile_height, TILE_WIDTH, 3),
                    255,
                    dtype=np.uint8
                )
            )

        rows.append(
            np.hstack(row_images)
        )

    sheet = np.vstack(rows)

    cv2.imwrite(
        str(DESTINATION),
        sheet,
        [cv2.IMWRITE_JPEG_QUALITY, 90]
    )

    print(f"FAILURE REVIEW SHEET: {DESTINATION}")
    print(f"Images: {len(images)}")
    print(f"Dimensions: {sheet.shape[1]} x {sheet.shape[0]}")


if __name__ == "__main__":
    main()
