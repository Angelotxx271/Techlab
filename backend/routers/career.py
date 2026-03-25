import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.routers.auth import get_current_user_id

router = APIRouter(prefix="/api/career", tags=["career"])

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"

CAREER_MAPPINGS = {
    "marketing": {
        "targetRole": "Marketing Data Scientist",
        "rationale": "Combine your marketing domain expertise with data science skills for higher-paying analytical roles. Marketing data scientists earn 30-50% more than traditional marketing roles.",
        "recommendedPaths": ["fastapi", "agentic-ai", "docker", "aws"],
        "salaryInsight": "Marketing Data Scientists: $95k-$140k vs Marketing Analyst: $55k-$80k",
    },
    "sales": {
        "targetRole": "Sales Engineering / Revenue Operations",
        "rationale": "Your sales experience + technical skills = Sales Engineer, one of the highest-paying roles in tech. You already understand the customer side.",
        "recommendedPaths": ["fastapi", "aws", "docker", "terraform"],
        "salaryInsight": "Sales Engineers: $120k-$200k+ vs Sales Rep: $50k-$90k",
    },
    "design": {
        "targetRole": "Full-Stack Product Designer",
        "rationale": "Designers who can code are extremely valuable. Add frontend framework and DevOps skills to become a full-stack product designer.",
        "recommendedPaths": ["fastapi", "docker", "github-actions", "git"],
        "salaryInsight": "Product Designers (technical): $110k-$170k vs Visual Designer: $60k-$90k",
    },
    "finance": {
        "targetRole": "FinTech Developer / Quantitative Analyst",
        "rationale": "Your finance background gives you a massive advantage in FinTech. Add programming and cloud skills to build financial tools.",
        "recommendedPaths": ["fastapi", "aws", "docker", "terraform"],
        "salaryInsight": "FinTech Engineers: $130k-$200k vs Financial Analyst: $65k-$95k",
    },
    "developer": {
        "targetRole": "Senior Cloud-Native Developer",
        "rationale": "Level up from development into cloud-native architecture. Kubernetes + IaC skills separate senior engineers from the pack.",
        "recommendedPaths": ["kubernetes", "terraform", "aws", "github-actions"],
        "salaryInsight": "Cloud-Native Senior Dev: $150k-$220k vs Mid Developer: $80k-$120k",
    },
    "student": {
        "targetRole": "Full-Stack Developer",
        "rationale": "Build a strong foundation across the stack. Start with web frameworks, add cloud and DevOps, and you'll be job-ready.",
        "recommendedPaths": ["fastapi", "docker", "git", "aws"],
        "salaryInsight": "Junior Full-Stack: $70k-$100k, growing to $120k-$180k in 3-5 years",
    },
}

DEFAULT_REC = {
    "targetRole": "Tech-Savvy Professional",
    "rationale": "Adding technical skills to any career dramatically increases earning potential and job flexibility.",
    "recommendedPaths": ["fastapi", "docker", "git", "aws"],
    "salaryInsight": "Technical professionals earn 20-40% more than non-technical peers in the same field",
}


def _match_position(position: str) -> dict:
    pos_lower = position.lower()
    for keyword, rec in CAREER_MAPPINGS.items():
        if keyword in pos_lower:
            return rec
    if any(w in pos_lower for w in ("intern", "junior", "entry", "graduate", "fresh")):
        return CAREER_MAPPINGS["student"]
    if any(w in pos_lower for w in ("engineer", "programmer", "coder", "dev", "software")):
        return CAREER_MAPPINGS["developer"]
    return DEFAULT_REC


class CareerRecommendRequest(BaseModel):
    current_position: str
    interests: list[str] = []
    skill_level: str = "beginner"


@router.post("/recommend")
async def recommend_career(req: CareerRecommendRequest):
    recommendation = _match_position(req.current_position)

    try:
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY")
        model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
        if api_key:
            client = genai.Client(api_key=api_key)
            catalog_path = CONTENT_DIR / "catalog.json"
            catalog_data = json.loads(catalog_path.read_text()) if catalog_path.exists() else {}
            available_paths = []
            for cat in catalog_data.get("categories", []):
                available_paths.extend(cat.get("paths", []))

            prompt = f"""You are a career advisor for a tech learning platform.
The user's current position is: {req.current_position}
Their interests: {', '.join(req.interests) if req.interests else 'not specified'}
Their skill level: {req.skill_level}

Available learning paths on the platform: {', '.join(available_paths)}

Recommend a specific tech career upgrade. Respond in valid JSON only:
{{
  "targetRole": "specific job title they should aim for",
  "rationale": "2-3 sentences explaining why this is a good career move given their background",
  "recommendedPaths": ["path_id1", "path_id2", "path_id3", "path_id4"],
  "salaryInsight": "comparison of current vs target salary range"
}}

The recommendedPaths MUST be chosen from the available paths list above. Order them by priority.
Focus on realistic, achievable career transitions. Be specific about salary ranges."""

            response = client.models.generate_content(model=model_name, contents=prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            recommendation = json.loads(text)
            valid_paths = [p for p in recommendation.get("recommendedPaths", []) if p in available_paths]
            recommendation["recommendedPaths"] = valid_paths or recommendation.get("recommendedPaths", [])[:4]
    except Exception:
        pass

    return recommendation
