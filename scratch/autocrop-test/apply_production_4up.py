from pathlib import Path
import csv
import hashlib
import sys

ROOT = Path(__file__).resolve().parent

CANON_SOURCE = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets\inventory-photos"
    r"\s-and-s-sports-memorabilia\4UP\oriented"
)

PRODUCTION_OUTPUT = CANON_SOURCE.parent / "processed"
MARK_TO_DO = PRODUCTION_OUTPUT / "mark-to-do"
MANIFEST = PRODUCTION_OUTPUT / "production-4up-manifest.csv"

EXPECTED_ORIENTED_FILES = 428
EXPECTED_LOGICAL_PAIRS = 214
EXPECTED_PHYSICAL_PAIRS = 53
EXPECTED_CARDS = 212


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inventory_source():
    if not CANON_SOURCE.exists():
        raise RuntimeError(f"STOP: Missing source: {CANON_SOURCE}")

    files = sorted(
        (
            p for p in CANON_SOURCE.iterdir()
            if p.is_file() and p.suffix.lower() == ".jpg"
        ),
        key=lambda p: p.name.lower()
    )

    if len(files) != EXPECTED_ORIENTED_FILES:
        raise RuntimeError(
            f"STOP: Expected {EXPECTED_ORIENTED_FILES} oriented JPGs; "
            f"found {len(files)}."
        )

    return files


def build_logical_pairs(files):
    pairs = {}

    for path in files:
        stem = path.stem
        if not (stem.endswith("_a") or stem.endswith("_b")):
            raise RuntimeError(
                f"STOP: Invalid A/B filename: {path.name}"
            )

        key = stem[:-2]
        side = stem[-1].lower()
        pair = pairs.setdefault(key, {})

        if side in pair:
            raise RuntimeError(
                f"STOP: Duplicate {side.upper()} side: {key}"
            )

        pair[side] = path

    if len(pairs) != EXPECTED_LOGICAL_PAIRS:
        raise RuntimeError(
            f"STOP: Expected {EXPECTED_LOGICAL_PAIRS} logical pairs; "
            f"found {len(pairs)}."
        )

    for key, sides in sorted(pairs.items()):
        if set(sides) != {"a", "b"}:
            raise RuntimeError(f"STOP: Incomplete A/B pair: {key}")

    return pairs


def deduplicate(pairs):
    physical = {}
    identities = {}

    for key, sides in sorted(pairs.items()):
        identity = (sha256(sides["a"]), sha256(sides["b"]))

        if identity not in identities:
            identities[identity] = key
            physical[key] = {
                "a": sides["a"],
                "b": sides["b"],
                "aliases": [key],
            }
        else:
            physical[identities[identity]]["aliases"].append(key)

    if len(physical) != EXPECTED_PHYSICAL_PAIRS:
        raise RuntimeError(
            f"STOP: Expected {EXPECTED_PHYSICAL_PAIRS} physical pairs; "
            f"found {len(physical)}."
        )

    return physical


def configure_turtle():
    sys.path.insert(0, str(ROOT))
    import test_autocrop as turtle

    turtle.CANON_SOURCE = CANON_SOURCE
    turtle.OUTPUT = PRODUCTION_OUTPUT
    turtle.MARK_TO_DO = MARK_TO_DO

    return turtle


def write_manifest(rows):
    with MANIFEST.open(
        "w",
        newline="",
        encoding="utf-8"
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "pair_key",
                "aliases",
                "a_source",
                "b_source",
                "status",
                "crop_files",
                "manual_files",
                "manual_reason",
            ]
        )
        writer.writeheader()
        writer.writerows(rows)


def crop_files():
    return list(PRODUCTION_OUTPUT.glob("*_crop_*.jpg"))


def main():
    print()
    print("TURTLE PRODUCTION 4UP")
    print("======================")
    print("SOURCE IS READ-ONLY")
    print()

    source_files = inventory_source()
    logical = build_logical_pairs(source_files)
    physical = deduplicate(logical)

    print(f"Oriented files:    {len(source_files)}")
    print(f"Logical pairs:     {len(logical)}")
    print(f"Physical pairs:    {len(physical)}")
    print(f"Expected cards:    {EXPECTED_CARDS}")
    print(f"Output:             {PRODUCTION_OUTPUT}")
    print()

    before_hashes = {
        path.name: sha256(path)
        for path in source_files
    }

    if PRODUCTION_OUTPUT.exists():
        raise RuntimeError(
            "STOP: Production output already exists:\n"
            f"  {PRODUCTION_OUTPUT}\n\n"
            "This script refuses to delete or overwrite production output."
        )

    PRODUCTION_OUTPUT.mkdir(parents=True)
    MARK_TO_DO.mkdir(parents=True)

    turtle = configure_turtle()
    rows = []

    for index, (key, sides) in enumerate(
        sorted(physical.items()),
        start=1
    ):
        print(
            f"PAIR {index}/{len(physical)}: {key} "
            f"[aliases={len(sides['aliases'])}]"
        )

        before_crops = len(crop_files())
        before_manual = {
            p.name for p in MARK_TO_DO.iterdir() if p.is_file()
        }

        turtle.process_pair(
            sides["a"],
            sides["b"]
        )

        new_crops = len(crop_files()) - before_crops
        new_manual = sorted(
            p.name
            for p in MARK_TO_DO.iterdir()
            if p.is_file() and p.name not in before_manual
        )

        status = (
            "READY"
            if new_crops == 8 and not new_manual
            else "MANUAL"
        )

        rows.append({
            "pair_key": key,
            "aliases": "|".join(sides["aliases"]),
            "a_source": sides["a"].name,
            "b_source": sides["b"].name,
            "status": status,
            "crop_files": new_crops,
            "manual_files": len(new_manual),
            "manual_reason": "|".join(new_manual),
        })

    after_hashes = {
        path.name: sha256(path)
        for path in CANON_SOURCE.glob("*.jpg")
    }

    if before_hashes != after_hashes:
        raise RuntimeError(
            "STOP: Production source hashes changed during processing."
        )

    total_crops = len(crop_files())
    total_manual = len(
        [p for p in MARK_TO_DO.iterdir() if p.is_file()]
    )

    ready_pairs = sum(r["status"] == "READY" for r in rows)
    manual_pairs = sum(r["status"] == "MANUAL" for r in rows)

    write_manifest(rows)

    print()
    print("TURTLE PRODUCTION POSTFLIGHT")
    print("============================")
    print(f"Physical pairs:  {len(rows)}/{EXPECTED_PHYSICAL_PAIRS}")
    print(f"READY pairs:     {ready_pairs}")
    print(f"MANUAL pairs:    {manual_pairs}")
    print(f"Crop files:      {total_crops}")
    print(f"Manual files:    {total_manual}")
    print("Source hashes:   PASS")
    print(f"Manifest:        {MANIFEST}")
    print()

    if len(rows) != EXPECTED_PHYSICAL_PAIRS:
        raise RuntimeError("STOP: Physical-pair accounting failed.")

    if ready_pairs != 49 or manual_pairs != 4:
        raise RuntimeError(
            "STOP: Expected 49 READY + 4 MANUAL pairs; "
            f"found {ready_pairs} + {manual_pairs}."
        )

    if total_crops != 392:
        raise RuntimeError(
            f"STOP: Expected 392 crop files; found {total_crops}."
        )

    if total_manual != 8:
        raise RuntimeError(
            f"STOP: Expected 8 manual source files; found {total_manual}."
        )

    print("RESULT: PRODUCTION 4UP COMPLETE")
    print("Source directory unchanged.")
    print("Human review queue preserved.")


if __name__ == "__main__":
    main()
