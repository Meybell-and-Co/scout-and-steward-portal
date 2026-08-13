from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "output" / "test-03"

EXACT_THRESHOLD = 0.001
NEAR_THRESHOLD = 0.015
SIMILAR_THRESHOLD = 0.050


def fingerprint(path):
    image = cv2.imread(str(path))

    if image is None:
        raise RuntimeError(f"Could not read: {path}")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    normalized = cv2.resize(
        gray,
        (128, 128),
        interpolation=cv2.INTER_AREA,
    )

    normalized = cv2.GaussianBlur(
        normalized,
        (3, 3),
        0,
    )

    return normalized.astype(np.float32) / 255.0


def difference(a, b):
    return float(np.mean(np.abs(a - b)))


def label_for(score):
    if score <= EXACT_THRESHOLD:
        return "IDENTICAL"

    if score <= NEAR_THRESHOLD:
        return "NEAR-DUPLICATE"

    if score <= SIMILAR_THRESHOLD:
        return "SIMILAR"

    return None


def main():
    files = sorted(
        path
        for path in TARGET.glob("*.jpg")
        if "_crop_" in path.name
        and "_DEBUG" not in path.name
    )

    print()
    print("TURTLE SIMILARITY AUDIT")
    print("-----------------------")
    print(f"Folder: {TARGET}")
    print(f"Crop files: {len(files)}")
    print()

    fingerprints = {
        path: fingerprint(path)
        for path in files
    }

    matches = []

    for index, first in enumerate(files):
        for second in files[index + 1:]:
            score = difference(
                fingerprints[first],
                fingerprints[second],
            )

            label = label_for(score)

            if label:
                matches.append(
                    (
                        score,
                        label,
                        first.name,
                        second.name,
                    )
                )

    matches.sort(key=lambda item: item[0])

    if not matches:
        print("No suspiciously similar crops found.")
        return

    print(f"Suspicious pairs: {len(matches)}")
    print()

    for score, label, first, second in matches:
        print(f"{label:14}  difference={score:.5f}")
        print(f"  {first}")
        print(f"  {second}")
        print()


if __name__ == "__main__":
    main()
