from pathlib import Path
import csv
import hashlib
import cv2


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

ROOT = Path(__file__).parent

MANIFEST = (
    ROOT /
    "production-rotation-manifest.csv"
)

ASSET_ROOT = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets"
    r"\inventory-photos\s-and-s-sports-memorabilia\4UP"
)

SOURCE = ASSET_ROOT / "source"
ORIENTED = ASSET_ROOT / "oriented"


VALID_ROTATIONS = {
    0,
    90,
    180,
    270,
}


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def sha256(path):
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(
            lambda: handle.read(1024 * 1024),
            b""
        ):
            digest.update(chunk)

    return digest.hexdigest()


def rotate_cw(image, degrees):
    if degrees == 0:
        return image.copy()

    if degrees == 90:
        return cv2.rotate(
            image,
            cv2.ROTATE_90_CLOCKWISE
        )

    if degrees == 180:
        return cv2.rotate(
            image,
            cv2.ROTATE_180
        )

    if degrees == 270:
        return cv2.rotate(
            image,
            cv2.ROTATE_90_COUNTERCLOCKWISE
        )

    raise ValueError(
        f"Unsupported rotation: {degrees}"
    )


# ---------------------------------------------------------
# Preconditions
# ---------------------------------------------------------

if not MANIFEST.exists():
    raise FileNotFoundError(
        f"Missing production manifest: "
        f"{MANIFEST}"
    )

if not SOURCE.exists():
    raise FileNotFoundError(
        f"Missing source directory: "
        f"{SOURCE}"
    )

if not ORIENTED.exists():
    raise FileNotFoundError(
        f"Missing oriented directory: "
        f"{ORIENTED}"
    )


# Refuse to mix a new production run with old output.
existing_output = list(
    ORIENTED.glob("*.jpg")
)

if existing_output:
    raise RuntimeError(
        "STOP: oriented directory is not empty. "
        f"Found {len(existing_output)} JPG file(s)."
    )


# ---------------------------------------------------------
# Load manifest
# ---------------------------------------------------------

with MANIFEST.open(
    newline="",
    encoding="utf-8-sig"
) as handle:
    records = list(
        csv.DictReader(handle)
    )


if len(records) != 214:
    raise RuntimeError(
        f"Expected 214 manifest rows; "
        f"found {len(records)}"
    )


# ---------------------------------------------------------
# Build explicit file instructions
# ---------------------------------------------------------

instructions = []

for row in records:

    if row["Status"].strip().upper() != "READY":
        raise RuntimeError(
            f"Manifest row not READY: "
            f"{row['PairKey']}"
        )

    a_rotation = int(
        row["ARotateCW"]
    )

    b_rotation = int(
        row["BRotateCW"]
    )

    if a_rotation not in VALID_ROTATIONS:
        raise RuntimeError(
            f"Invalid A rotation for "
            f"{row['PairKey']}: "
            f"{a_rotation}"
        )

    if b_rotation not in VALID_ROTATIONS:
        raise RuntimeError(
            f"Invalid B rotation for "
            f"{row['PairKey']}: "
            f"{b_rotation}"
        )

    instructions.append({
        "filename": row["AFile"],
        "rotation": a_rotation,
        "pair": row["PairKey"],
        "side": "A",
    })

    instructions.append({
        "filename": row["BFile"],
        "rotation": b_rotation,
        "pair": row["PairKey"],
        "side": "B",
    })


if len(instructions) != 428:
    raise RuntimeError(
        f"Expected 428 file instructions; "
        f"found {len(instructions)}"
    )


instruction_names = [
    item["filename"].lower()
    for item in instructions
]

if len(set(instruction_names)) != 428:
    raise RuntimeError(
        "Duplicate filenames found in "
        "production instructions."
    )


# ---------------------------------------------------------
# Source attendance
# ---------------------------------------------------------

source_files = sorted(
    SOURCE.glob("*.jpg")
)

if len(source_files) != 428:
    raise RuntimeError(
        f"Expected 428 source JPGs; "
        f"found {len(source_files)}"
    )


source_lookup = {
    path.name.lower(): path
    for path in source_files
}


missing = [
    item["filename"]
    for item in instructions
    if item["filename"].lower()
    not in source_lookup
]

if missing:
    raise RuntimeError(
        "Manifest references missing source files:\n"
        + "\n".join(missing)
    )


extra = sorted(
    path.name
    for path in source_files
    if path.name.lower()
    not in set(instruction_names)
)

if extra:
    raise RuntimeError(
        "Source contains files not represented "
        "in the production manifest:\n"
        + "\n".join(extra)
    )


# ---------------------------------------------------------
# Snapshot sacred source hashes BEFORE production
# ---------------------------------------------------------

before_hashes = {
    path.name.lower(): sha256(path)
    for path in source_files
}


# ---------------------------------------------------------
# Production rotation
# ---------------------------------------------------------

rotation_counts = {
    0: 0,
    90: 0,
    180: 0,
    270: 0,
}

written = []


print()
print("TURTLE PRODUCTION ORIENTATION")
print("-----------------------------")
print(
    f"Instructions: "
    f"{len(instructions)}"
)
print()


for index, item in enumerate(
    instructions,
    start=1
):

    filename = item["filename"]
    rotation = item["rotation"]

    source_path = source_lookup[
        filename.lower()
    ]

    destination = (
        ORIENTED /
        filename
    )

    # No overwrite, ever.
    if destination.exists():
        raise RuntimeError(
            f"STOP: Destination already exists: "
            f"{destination}"
        )

    image = cv2.imread(
        str(source_path),
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise RuntimeError(
            f"Unable to read source image: "
            f"{source_path}"
        )

    original_height, original_width = (
        image.shape[:2]
    )

    result = rotate_cw(
        image,
        rotation
    )

    result_height, result_width = (
        result.shape[:2]
    )

    # Quarter-turn dimensions must swap.
    if rotation in {90, 270}:
        expected_dimensions = (
            original_width,
            original_height,
        )
    else:
        expected_dimensions = (
            original_height,
            original_width,
        )

    actual_dimensions = (
        result_height,
        result_width,
    )

    if actual_dimensions != expected_dimensions:
        raise RuntimeError(
            f"Dimension verification failed for "
            f"{filename}: "
            f"expected {expected_dimensions}, "
            f"got {actual_dimensions}"
        )

    success = cv2.imwrite(
        str(destination),
        result,
        [
            cv2.IMWRITE_JPEG_QUALITY,
            100
        ]
    )

    if not success:
        raise RuntimeError(
            f"Unable to write: "
            f"{destination}"
        )

    if not destination.exists():
        raise RuntimeError(
            f"Write reported success but file "
            f"is missing: {destination}"
        )

    written.append(
        destination
    )

    rotation_counts[
        rotation
    ] += 1

    if (
        index % 25 == 0
        or index == len(instructions)
    ):
        print(
            f"Processed "
            f"{index}/{len(instructions)}"
        )


# ---------------------------------------------------------
# Postflight: output attendance
# ---------------------------------------------------------

output_files = sorted(
    ORIENTED.glob("*.jpg")
)

if len(output_files) != 428:
    raise RuntimeError(
        f"POSTFLIGHT FAIL: expected 428 "
        f"oriented JPGs; found "
        f"{len(output_files)}"
    )


output_names = {
    path.name.lower()
    for path in output_files
}

source_names = {
    path.name.lower()
    for path in source_files
}

if output_names != source_names:

    missing_output = sorted(
        source_names -
        output_names
    )

    unexpected_output = sorted(
        output_names -
        source_names
    )

    raise RuntimeError(
        "POSTFLIGHT FAIL: filename sets "
        "do not match.\n"
        f"Missing output: {missing_output}\n"
        f"Unexpected output: "
        f"{unexpected_output}"
    )


# ---------------------------------------------------------
# Postflight: sacred source integrity
# ---------------------------------------------------------

after_source_files = sorted(
    SOURCE.glob("*.jpg")
)

if len(after_source_files) != 428:
    raise RuntimeError(
        "SOURCE INTEGRITY FAIL: "
        f"expected 428 source files; "
        f"found {len(after_source_files)}"
    )


changed_sources = []

for path in after_source_files:

    before = before_hashes.get(
        path.name.lower()
    )

    after = sha256(path)

    if before != after:
        changed_sources.append(
            path.name
        )


if changed_sources:
    raise RuntimeError(
        "SOURCE INTEGRITY FAIL: "
        "source files changed:\n"
        + "\n".join(changed_sources)
    )


# ---------------------------------------------------------
# Report
# ---------------------------------------------------------

print()
print("TURTLE POSTFLIGHT")
print("-----------------")
print(
    f"Source files:     "
    f"{len(after_source_files)}"
)
print(
    f"Oriented files:   "
    f"{len(output_files)}"
)
print(
    "Filename match:   PASS"
)
print(
    "Source hashes:    PASS"
)
print(
    "Dimension checks: PASS"
)

print()
print("ROTATIONS APPLIED")
print("-----------------")

for degrees in (
    0,
    90,
    180,
    270
):
    print(
        f"{degrees:>3}°: "
        f"{rotation_counts[degrees]}"
    )

print()
print(
    f"Output: "
    f"{ORIENTED}"
)

print()
print(
    "PRODUCTION ORIENTATION COMPLETE."
)
print(
    "Source directory remains unchanged."
)