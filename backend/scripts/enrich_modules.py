"""
One-off enrichment: longer guidance footer + minimum exercise count for every module JSON.
Run from repo root: python backend/scripts/enrich_modules.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "content" / "paths"

FOOTER = """
---

**How to use this module:** Read the concept explanation, then work through the exercises in order. If you get stuck, use *Get a hint* — hints get more detailed each time without giving away the answer."""


def ensure_exercises(data: dict, path_slug: str) -> None:
    exercises: list = data["exercises"]
    mid: str = data["id"]
    if len(exercises) >= 4:
        return
    topic = path_slug.replace("-", " ").title()
    fillers = [
        {
            "type": "true_false",
            "question": f"Applying one idea from this {topic} module in a small side project deepens understanding.",
            "correctAnswer": "true",
            "difficulty": "beginner",
        },
        {
            "type": "multiple_choice",
            "question": "What is the best next step after reading the explanation?",
            "options": [
                "Try the exercises while concepts are fresh",
                "Skip exercises and move to the next module immediately",
                "Only read documentation elsewhere",
                "Memorize terms without practice",
            ],
            "correctAnswer": "Try the exercises while concepts are fresh",
            "difficulty": "beginner",
        },
    ]
    i = len(exercises)
    while len(exercises) < 4:
        template = fillers[(i - len(exercises)) % len(fillers)]
        ex_id = f"{mid}-enrich-{i + 1}"
        i += 1
        ex = {"id": ex_id, **template}
        exercises.append(ex)
    data["exercises"] = exercises


def main() -> None:
    for path_dir in sorted(ROOT.iterdir()):
        if not path_dir.is_dir():
            continue
        mdir = path_dir / "modules"
        if not mdir.is_dir():
            continue
        slug = path_dir.name
        for fp in sorted(mdir.glob("*.json")):
            data = json.loads(fp.read_text(encoding="utf-8"))
            expl = data.get("conceptExplanation", "")
            if "**How to use this module:**" not in expl:
                data["conceptExplanation"] = expl.rstrip() + FOOTER
            ensure_exercises(data, slug)
            fp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Enriched modules under", ROOT)


if __name__ == "__main__":
    main()
