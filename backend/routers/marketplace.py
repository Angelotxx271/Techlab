import json

from fastapi import APIRouter, HTTPException

from backend.db import get_db
from backend.routers.xp import get_rank

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.get("/developers")
async def list_developers(
    skill_level: str | None = None,
    min_rank: str | None = None,
    path_id: str | None = None,
):
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT u.id, u.display_name, u.bio, u.current_position,
                   COALESCE(SUM(x.amount), 0) as total_xp,
                   p.data as profile_data, pr.data as progress_data
            FROM users u
            LEFT JOIN xp_ledger x ON x.user_id = u.id
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN progress pr ON pr.user_id = u.id
            WHERE u.is_public = 1
            GROUP BY u.id
            ORDER BY total_xp DESC
        """)
        rows = await cursor.fetchall()
    finally:
        await db.close()

    developers = []
    for row in rows:
        total_xp = row["total_xp"]
        rank_code, rank_title, _ = get_rank(total_xp)

        profile = json.loads(row["profile_data"]) if row["profile_data"] else {}
        progress = json.loads(row["progress_data"]) if row["progress_data"] else {}

        user_skill = profile.get("skillLevel", "beginner")
        if skill_level and user_skill != skill_level:
            continue

        completed_modules = progress.get("completedModules", {})
        completed_paths = [pid for pid, mods in completed_modules.items() if len(mods) > 0]

        if path_id and path_id not in completed_paths:
            continue

        developers.append({
            "userId": row["id"],
            "displayName": row["display_name"],
            "bio": row["bio"],
            "currentPosition": row["current_position"],
            "totalXp": total_xp,
            "rank": rank_code,
            "rankTitle": rank_title,
            "skillLevel": user_skill,
            "completedPaths": completed_paths,
            "exerciseAccuracy": progress.get("exerciseAccuracy", {}),
        })

    return developers


@router.get("/developers/{user_id}")
async def get_developer(user_id: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM users WHERE id = ? AND is_public = 1", (user_id,)
        )
        user_row = await cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Developer not found")

        xp_cursor = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ?",
            (user_id,),
        )
        xp_row = await xp_cursor.fetchone()
        total_xp = xp_row["total"]

        profile_cursor = await db.execute(
            "SELECT data FROM profiles WHERE user_id = ?", (user_id,)
        )
        profile_row = await profile_cursor.fetchone()
        profile = json.loads(profile_row["data"]) if profile_row else {}

        progress_cursor = await db.execute(
            "SELECT data FROM progress WHERE user_id = ?", (user_id,)
        )
        progress_row = await progress_cursor.fetchone()
        progress = json.loads(progress_row["data"]) if progress_row else {}

        history_cursor = await db.execute(
            "SELECT amount, reason, created_at FROM xp_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user_id,),
        )
        history_rows = await history_cursor.fetchall()
    finally:
        await db.close()

    rank_code, rank_title, next_xp = get_rank(total_xp)
    completed_modules = progress.get("completedModules", {})

    return {
        "userId": user_row["id"],
        "displayName": user_row["display_name"],
        "bio": user_row["bio"],
        "currentPosition": user_row["current_position"],
        "totalXp": total_xp,
        "rank": rank_code,
        "rankTitle": rank_title,
        "nextRankXp": next_xp,
        "skillLevel": profile.get("skillLevel", "beginner"),
        "interests": profile.get("interests", []),
        "completedModules": completed_modules,
        "exerciseAccuracy": progress.get("exerciseAccuracy", {}),
        "xpHistory": [
            {"amount": r["amount"], "reason": r["reason"], "date": r["created_at"]}
            for r in history_rows
        ],
    }
