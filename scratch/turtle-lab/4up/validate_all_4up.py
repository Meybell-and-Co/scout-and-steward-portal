from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "2up"))
import test_autocrop_2up as turtle


OUTPUT = ROOT / "output" / "full-validation"
MARK_TO_DO = OUTPUT / "mark-to-do"


def reset_output():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)

    OUTPUT.mkdir(
        parents=True,
        exist_ok=True
    )

    MARK_TO_DO.mkdir(
        parents=True,
        exist_ok=True
    )


def main():
    _, physical_pairs = turtle.prepare_source_roster()

    reset_output()

    # Redirect Turtle's disposable outputs for this run.
    turtle.OUTPUT = OUTPUT
    turtle.MARK_TO_DO = MARK_TO_DO

    total = len(physical_pairs)

    print()
    print("TURTLE FULL 4UP VALIDATION")
    print("--------------------------")
    print(f"Physical pairs: {total}")
    oriented_source = (
        turtle.CANON_SOURCE.parent / "oriented"
    )

    if not oriented_source.exists():
        raise RuntimeError(
            f"Missing production-oriented source: {oriented_source}"
        )

    oriented_files = list(
        oriented_source.glob("*.jpg")
    )

    if len(oriented_files) != 428:
        raise RuntimeError(
            "STOP: Expected exactly 428 oriented JPGs; "
            f"found {len(oriented_files)}."
        )

    print(f"Input:          {oriented_source}")
    print(f"Output:         {OUTPUT}")
    print()

    processed = 0

    for index, (pair_key, sides) in enumerate(
        sorted(physical_pairs.items()),
        start=1
    ):
        a_path = (
            oriented_source
            / sides["a"]["name"]
        )

        b_path = (
            oriented_source
            / sides["b"]["name"]
        )

        if not a_path.exists():
            raise RuntimeError(
                f"Missing working A source: {a_path}"
            )

        if not b_path.exists():
            raise RuntimeError(
                f"Missing working B source: {b_path}"
            )

        aliases = sides.get(
            "aliases",
            [pair_key]
        )

        print()
        print(
            f"PAIR {index}/{total}: {pair_key} "
            f"[logical aliases={len(aliases)}]"
        )

        turtle.process_pair(
            a_path,
            b_path
        )

        processed += 1

    crop_count = len(
        list(OUTPUT.glob("*_crop_*.jpg"))
    )

    debug_count = len(
        list(OUTPUT.glob("*_DEBUG.jpg"))
    )

    manual_count = len(
        list(MARK_TO_DO.glob("*"))
    )

    print()
    print("FULL VALIDATION SUMMARY")
    print("-----------------------")
    print(f"Physical pairs processed: {processed}/{total}")
    print(f"Crop files written:       {crop_count}")
    print(f"Debug images written:     {debug_count}")
    print(f"Mark-to-do files:         {manual_count}")
    print(f"Output:                   {OUTPUT}")
    print()

    if processed != total:
        print("RESULT: INCOMPLETE")
        sys.exit(1)

    if manual_count:
        print("RESULT: REVIEW REQUIRED")
        sys.exit(2)

    print("RESULT: CLEAN")


if __name__ == "__main__":
    main()
