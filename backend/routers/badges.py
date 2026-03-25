from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.db import get_db
from backend.routers.auth import require_user

router = APIRouter(prefix="/api/badges", tags=["badges"])

BADGE_DEFS = {
    "first_exercise": {"label": "First Steps", "description": "Complete your first exercise", "icon": "rocket"},
    "streak_7": {"label": "On Fire", "description": "Maintain a 7-day streak", "icon": "flame"},
    "streak_30": {"label": "Unstoppable", "description": "Maintain a 30-day streak", "icon": "fire"},
    "path_complete": {"label": "Pathfinder", "description": "Complete a learning path", "icon": "flag"},
    "xp_100_session": {"label": "XP Burst", "description": "Earn 100+ XP in one day", "icon": "zap"},
    "night_owl": {"label": "Night Owl", "description": "Complete an exercise after midnight", "icon": "moon"},
    "speed_demon": {"label": "Speed Demon", "description": "Complete an exercise in under 30 seconds", "icon": "bolt"},
    "full_catalog": {"label": "Completionist", "description": "Complete all available paths", "icon": "trophy"},
    "top3_leaderboard": {"label": "Elite", "description": "Reach top 3 on the leaderboard", "icon": "crown"},
}


@router.get("")
async def list_badges(user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT badge_type, earned_at FROM badges WHERE user_id = ? ORDER BY earned_at DESC",
            (user_id,),
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()

    earned = []
    for row in rows:
        bt = row["badge_type"]
        defn = BADGE_DEFS.get(bt, {"label": bt, "description": "", "icon": "star"})
        earned.append({
            "type": bt,
            "label": defn["label"],
            "description": defn["description"],
            "icon": defn["icon"],
            "earnedAt": row["earned_at"],
        })

    all_badges = []
    earned_types = {b["type"] for b in earned}
    for bt, defn in BADGE_DEFS.items():
        all_badges.append({
            "type": bt,
            "label": defn["label"],
            "description": defn["description"],
            "icon": defn["icon"],
            "earned": bt in earned_types,
            "earnedAt": next((b["earnedAt"] for b in earned if b["type"] == bt), None),
        })

    return {"badges": all_badges, "earnedCount": len(earned_types), "totalCount": len(BADGE_DEFS)}


@router.post("/check")
async def check_badges(user_id: str = Depends(require_user)):
    """Evaluate and award any newly earned badges. Returns list of newly awarded badge types."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    new_badges: list[str] = []

    db = await get_db()
    try:
        existing_cursor = await db.execute("SELECT badge_type FROM badges WHERE user_id = ?", (user_id,))
        existing = {row["badge_type"] for row in await existing_cursor.fetchall()}

        async def _award(badge_type: str) -> None:
            if badge_type not in existing:
                await db.execute(
                    "INSERT OR IGNORE INTO badges (user_id, badge_type, earned_at) VALUES (?, ?, ?)",
                    (user_id, badge_type, now_iso),
                )
                new_badges.append(badge_type)
                await db.execute(
                    "INSERT INTO activity_feed (user_id, event_type, detail, created_at) VALUES (?, 'badge', ?, ?)",
                    (user_id, badge_type, now_iso),
                )

        ex_count = await db.execute(
            "SELECT COUNT(DISTINCT exercise_id) as cnt FROM xp_ledger WHERE user_id = ? AND exercise_id NOT LIKE 'bonus:%'",
            (user_id,),
        )
        ex_row = await ex_count.fetchone()
        if ex_row and ex_row["cnt"] >= 1:
            await _award("first_exercise")

        streak_cursor = await db.execute("SELECT current_streak FROM streaks WHERE user_id = ?", (user_id,))
        streak_row = await streak_cursor.fetchone()
        if streak_row:
            if streak_row["current_streak"] >= 7:
                await _award("streak_7")
            if streak_row["current_streak"] >= 30:
                await _award("streak_30")

        today_str = now.strftime("%Y-%m-%d")
        today_xp_cursor = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ? AND created_at >= ?",
            (user_id, today_str),
        )
        today_xp_row = await today_xp_cursor.fetchone()
        if today_xp_row and today_xp_row["total"] >= 100:
            await _award("xp_100_session")

        hour = now.hour
        if hour >= 0 and hour < 5:
            last_ex = await db.execute(
                "SELECT created_at FROM xp_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            )
            last_row = await last_ex.fetchone()
            if last_row:
                await _award("night_owl")

        path_bonus = await db.execute(
            "SELECT COUNT(*) as cnt FROM xp_ledger WHERE user_id = ? AND exercise_id LIKE 'bonus:path:%'",
            (user_id,),
        )
        path_row = await path_bonus.fetchone()
        if path_row and path_row["cnt"] >= 1:
            await _award("path_complete")

        top3 = await db.execute("""
            SELECT user_id FROM (
                SELECT user_id, SUM(amount) as total
                FROM xp_ledger GROUP BY user_id ORDER BY total DESC LIMIT 3
            )
        """)
        top3_ids = [row["user_id"] for row in await top3.fetchall()]
        if user_id in top3_ids:
            await _award("top3_leaderboard")

        await db.commit()
    finally:
        await db.close()

    result = []
    for bt in new_badges:
        defn = BADGE_DEFS.get(bt, {"label": bt, "description": "", "icon": "star"})
        result.append({"type": bt, "label": defn["label"], "description": defn["description"], "icon": defn["icon"]})

    return {"newBadges": result}
