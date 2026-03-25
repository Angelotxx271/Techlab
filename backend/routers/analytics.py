import json
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from backend.db import get_db
from backend.routers.auth import require_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

CATEGORY_MAP = {
    "django": "Web", "flask": "Web", "fastapi": "Web",
    "aws": "Cloud", "gcp": "Cloud", "azure": "Cloud",
    "docker": "Containers", "kubernetes": "Containers",
    "agentic-ai": "AI/ML", "mcps": "AI/ML",
    "github-actions": "DevOps", "terraform": "DevOps",
    "git": "Tools", "vscode": "Tools",
}


@router.get("")
async def get_analytics(user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        xp_cursor = await db.execute(
            "SELECT amount, reason, created_at FROM xp_ledger WHERE user_id = ? ORDER BY created_at",
            (user_id,),
        )
        xp_rows = await xp_cursor.fetchall()

        progress_cursor = await db.execute("SELECT data FROM progress WHERE user_id = ?", (user_id,))
        progress_row = await progress_cursor.fetchone()
        progress_data = json.loads(progress_row["data"]) if progress_row else {}

        streak_cursor = await db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,))
        streak_row = await streak_cursor.fetchone()
    finally:
        await db.close()

    daily_xp: dict[str, int] = {}
    daily_exercises: dict[str, int] = {}
    category_xp: dict[str, int] = {}

    for row in xp_rows:
        date_str = row["created_at"][:10]
        daily_xp[date_str] = daily_xp.get(date_str, 0) + row["amount"]

        reason = row["reason"]
        if not reason.startswith("bonus:"):
            daily_exercises[date_str] = daily_exercises.get(date_str, 0) + 1

        parts = reason.split(":")
        if len(parts) >= 3 and not reason.startswith("bonus:"):
            path_id = parts[2] if len(parts) > 2 else ""
            cat = CATEGORY_MAP.get(path_id, "Other")
            category_xp[cat] = category_xp.get(cat, 0) + row["amount"]

    last_30 = []
    today = datetime.now(timezone.utc).date()
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        last_30.append({"date": d, "xp": daily_xp.get(d, 0), "exercises": daily_exercises.get(d, 0)})

    completed_modules = progress_data.get("completedModules", {})
    category_scores: dict[str, float] = {}
    for cat_name in ["Web", "Cloud", "Containers", "AI/ML", "DevOps", "Tools"]:
        total = 0
        for pid, cat in CATEGORY_MAP.items():
            if cat == cat_name and pid in completed_modules:
                total += len(completed_modules[pid])
        category_scores[cat_name] = min(total * 20, 100)

    accuracy = progress_data.get("exerciseAccuracy", {})
    strongest = max(category_scores, key=category_scores.get) if category_scores else None
    weakest = min(category_scores, key=category_scores.get) if category_scores else None

    year_heatmap: dict[str, int] = {}
    for i in range(364, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        year_heatmap[d] = daily_exercises.get(d, 0)

    total_contributions = sum(year_heatmap.values())

    return {
        "dailyActivity": last_30,
        "categoryXp": category_xp,
        "categoryScores": category_scores,
        "strongest": strongest,
        "weakest": weakest,
        "totalExercises": sum(daily_exercises.values()),
        "totalDaysActive": len(daily_xp),
        "currentStreak": streak_row["current_streak"] if streak_row else 0,
        "yearHeatmap": year_heatmap,
        "totalContributions": total_contributions,
    }
