from pathlib import Path
import re
import sys

import cv2


ROOT = Path(__file__).parent

sys.path.insert(
    0,
    str(ROOT)
)

from test_autocrop import detect_best_candidates


SOURCE = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets\inventory-photos\s-and-s-sports-memorabilia\4UP\oriented"
)

PATTERN = re.compile(
    r"^(?P<layout>.+)_(?P<copy>\d{2})_(?P<side>[ab])$",
    re.IGNORECASE,
)


if not SOURCE.exists():
    raise RuntimeError(
        f"STOP: Oriented source does not exist: {SOURCE}"
    )


layouts = {}

for path in sorted(
    SOURCE.glob("*.jpg"),
    key=lambda p: p.name.lower()
):
    match = PATTERN.match(
        path.stem
    )

    if not match:
        raise RuntimeError(
            f"STOP: Unexpected filename: {path.name}"
        )

    layout = match.group("layout")
    copy = match.group("copy")
    side = match.group("side").lower()

    layouts.setdefault(
        layout,
        {}
    ).setdefault(
        copy,
        {}
    )[side] = path


results = []

for layout in sorted(layouts):

    copies = layouts[layout]
    winner = None
    attempts = []

    for copy in sorted(copies):

        pair = copies[copy]

        if "a" not in pair or "b" not in pair:
            attempts.append(
                f"{copy}=MISSING_PAIR"
            )
            continue

        a_image = cv2.imread(
            str(pair["a"])
        )

        if a_image is None:
            attempts.append(
                f"{copy}=UNREADABLE"
            )
            continue

        (
            _,
            candidates,
            detection_pass,
            baseline_count,
        ) = detect_best_candidates(
            a_image
        )

        found = len(
            candidates
        )

        centers = []

        height, width = a_image.shape[:2]

        for _, box in candidates:
            center_x = float(box[:, 0].mean()) / width
            center_y = float(box[:, 1].mean()) / height

            centers.append(
                (
                    round(center_x, 3),
                    round(center_y, 3),
                )
            )

        attempts.append(
            f"{copy}={found}/4[{detection_pass}] "
            f"centers={centers}"
        )

        if found == 4:
            winner = {
                "copy": copy,
                "pass": detection_pass,
                "baseline": baseline_count,
                "a": pair["a"],
                "b": pair["b"],
            }
            break

    results.append({
        "layout": layout,
        "winner": winner,
        "attempts": attempts,
    })


ready = [
    row
    for row in results
    if row["winner"] is not None
]

manual = [
    row
    for row in results
    if row["winner"] is None
]


print()
print("COOKIE TURTLE SOURCE AUDITION")
print("-----------------------------")
print(f"Layouts found:   {len(results)}")
print(f"READY:           {len(ready)}")
print(f"MANUAL:          {len(manual)}")
print()

print("REPRESENTATIVES")
print("---------------")

for row in ready:
    winner = row["winner"]

    print(
        f"{row['layout']}: "
        f"copy={winner['copy']} "
        f"[{winner['pass']}] "
        f"attempts={', '.join(row['attempts'])}"
    )


if manual:
    print()
    print("NEEDS MANUAL")
    print("------------")

    for row in manual:
        print(
            f"{row['layout']}: "
            f"{', '.join(row['attempts'])}"
        )


print()
print("EXPECTED FINAL ASSETS")
print("---------------------")
print(
    f"Physical cards:  {len(ready) * 4}"
)
print(
    f"A/B images:      {len(ready) * 8}"
)
print()
print("No image files were modified.")


if manual:
    raise SystemExit(2)