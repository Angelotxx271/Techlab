"""One-time script: call Gemini 3 Flash to generate flashcards, analogies, and
key terms for every module JSON, then merge the results back into the files.

Usage:
    python -m backend.scripts.generate_interactive
"""

import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from google import genai

ROOT = Path(__file__).resolve().parent.parent / "content" / "paths"
API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")

PROMPT_TEMPLATE = """You are an expert tech educator. Given the module below, generate interactive learning content.

Module title: {title}
Module path/topic: {path_id}
Concept explanation (first 500 chars): {concept_snippet}

Return ONLY valid JSON (no markdown fences, no commentary) with exactly this structure:
{{
  "flashcards": [
    {{ "front": "question or term", "back": "concise answer or definition" }}
  ],
  "analogies": [
    {{ "title": "short title", "analogy": "the real-world analogy", "explanation": "how it maps to the tech concept" }}
  ],
  "keyTerms": [
    {{ "term": "technical term", "definition": "one-sentence definition" }}
  ]
}}

Requirements:
- flashcards: exactly 6 cards. Mix definitions, gotchas, and "what does X do?" questions.
- analogies: exactly 2. Use vivid, everyday scenarios (kitchen, city, sports, mail, etc.).
- keyTerms: exactly 5. The most important terms a learner must know from this module.
- Keep all text concise (1-2 sentences max per field).
- Do NOT repeat the concept explanation verbatim.
"""


def generate_for_module(client: genai.Client, path_id: str, data: dict) -> dict | None:
    title = data.get("title", data.get("id", "unknown"))
    concept = data.get("conceptExplanation", "")[:500]

    prompt = PROMPT_TEMPLATE.format(
        title=title,
        path_id=path_id,
        concept_snippet=concept,
    )

    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        return json.loads(text)
    except Exception as e:
        print(f"  ERROR: {e}")
        return None


def main() -> None:
    if not API_KEY:
        print("GEMINI_API_KEY not set. Aborting.")
        sys.exit(1)

    client = genai.Client(api_key=API_KEY)
    module_files = sorted(ROOT.rglob("modules/*.json"))
    print(f"Found {len(module_files)} module files.", flush=True)

    success = 0
    for fp in module_files:
        path_id = fp.parent.parent.name
        label = f"{path_id}/{fp.stem}"
        print(f"Processing {label} ...", flush=True)

        data = json.loads(fp.read_text(encoding="utf-8"))

        if data.get("flashcards") and len(data["flashcards"]) >= 4:
            print(f"  Skipped (already has flashcards)", flush=True)
            success += 1
            continue

        result = generate_for_module(client, path_id, data)
        if result is None:
            print(f"  FAILED — skipping", flush=True)
            continue

        data["flashcards"] = result.get("flashcards", [])
        data["analogies"] = result.get("analogies", [])
        data["keyTerms"] = result.get("keyTerms", [])

        fp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  OK — {len(data['flashcards'])} cards, {len(data['analogies'])} analogies, {len(data['keyTerms'])} terms", flush=True)
        success += 1
        time.sleep(0.5)

    print(f"\nDone. {success}/{len(module_files)} modules enriched.", flush=True)


if __name__ == "__main__":
    main()
