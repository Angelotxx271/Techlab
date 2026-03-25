import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.db import get_db
from backend.routers.auth import require_user, get_current_user_id

router = APIRouter(prefix="/api/xp", tags=["xp"])

RANK_THRESHOLDS = [
    (0, "8 kyu", "Novice"),
    (100, "7 kyu", "Apprentice"),
    (300, "6 kyu", "Student"),
    (700, "5 kyu", "Practitioner"),
    (1500, "4 kyu", "Developer"),
    (3000, "3 kyu", "Specialist"),
    (6000, "2 kyu", "Expert"),
    (10000, "1 kyu", "Master"),
]

XP_TABLE = {
    ("exercise", "beginner"): 10,
    ("exercise", "intermediate"): 25,
    ("exercise", "advanced"): 50,
    ("code_challenge", "beginner"): 30,
    ("code_challenge", "intermediate"): 60,
    ("code_challenge", "advanced"): 100,
}

MODULE_COMPLETE_BONUS = 50
PATH_COMPLETE_BONUS = 200


def get_rank(total_xp: int) -> tuple[str, str, int]:
    """Returns (rank_code, rank_title, xp_for_next_rank)."""
    current_rank = RANK_THRESHOLDS[0]
    next_xp = RANK_THRESHOLDS[1][0] if len(RANK_THRESHOLDS) > 1 else 0
    for i, (threshold, code, title) in enumerate(RANK_THRESHOLDS):
        if total_xp >= threshold:
            current_rank = (code, title)
            next_xp = RANK_THRESHOLDS[i + 1][0] if i + 1 < len(RANK_THRESHOLDS) else threshold
    return current_rank[0], current_rank[1], next_xp


class XPAwardRequest(BaseModel):
    exercise_id: str
    difficulty: str
    exercise_type: str
    context: str = ""


@router.post("/award")
async def award_xp(req: XPAwardRequest, user_id: str = Depends(require_user)):
    category = "code_challenge" if req.exercise_type == "code_challenge" else "exercise"
    amount = XP_TABLE.get((category, req.difficulty), 10)

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM xp_ledger WHERE user_id = ? AND exercise_id = ?",
            (user_id, req.exercise_id),
        )
        if await cursor.fetchone():
            total_cursor = await db.execute(
                "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ?",
                (user_id,),
            )
            total_row = await total_cursor.fetchone()
            total_xp = total_row["total"]
            rank_code, rank_title, next_xp = get_rank(total_xp)
            return {
                "awarded": 0,
                "duplicate": True,
                "totalXp": total_xp,
                "rank": rank_code,
                "rankTitle": rank_title,
                "nextRankXp": next_xp,
            }

        now = datetime.now(timezone.utc).isoformat()
        reason = f"{category}:{req.difficulty}"
        if req.context:
            reason += f":{req.context}"

        await db.execute(
            "INSERT INTO xp_ledger (user_id, amount, reason, exercise_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, amount, reason, req.exercise_id, now),
        )
        await db.commit()

        total_cursor = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ?",
            (user_id,),
        )
        total_row = await total_cursor.fetchone()
        total_xp = total_row["total"]
    finally:
        await db.close()

    rank_code, rank_title, next_xp = get_rank(total_xp)
    return {
        "awarded": amount,
        "duplicate": False,
        "totalXp": total_xp,
        "rank": rank_code,
        "rankTitle": rank_title,
        "nextRankXp": next_xp,
    }


@router.post("/award-bonus")
async def award_bonus(
    bonus_type: str = "module",
    context_id: str = "",
    user_id: str = Depends(require_user),
):
    amount = MODULE_COMPLETE_BONUS if bonus_type == "module" else PATH_COMPLETE_BONUS
    exercise_id = f"bonus:{bonus_type}:{context_id}"

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM xp_ledger WHERE user_id = ? AND exercise_id = ?",
            (user_id, exercise_id),
        )
        if await cursor.fetchone():
            return {"awarded": 0, "duplicate": True}

        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO xp_ledger (user_id, amount, reason, exercise_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, amount, f"bonus:{bonus_type}", exercise_id, now),
        )
        await db.commit()

        total_cursor = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ?",
            (user_id,),
        )
        total_row = await total_cursor.fetchone()
        total_xp = total_row["total"]
    finally:
        await db.close()

    rank_code, rank_title, next_xp = get_rank(total_xp)
    return {
        "awarded": amount,
        "duplicate": False,
        "totalXp": total_xp,
        "rank": rank_code,
        "rankTitle": rank_title,
        "nextRankXp": next_xp,
    }


@router.get("/summary")
async def xp_summary(user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        total_cursor = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ?",
            (user_id,),
        )
        total_row = await total_cursor.fetchone()
        total_xp = total_row["total"]

        count_cursor = await db.execute(
            "SELECT COUNT(DISTINCT exercise_id) as cnt FROM xp_ledger WHERE user_id = ? AND exercise_id NOT LIKE 'bonus:%'",
            (user_id,),
        )
        count_row = await count_cursor.fetchone()
        exercises_completed = count_row["cnt"]
    finally:
        await db.close()

    rank_code, rank_title, next_xp = get_rank(total_xp)
    return {
        "totalXp": total_xp,
        "rank": rank_code,
        "rankTitle": rank_title,
        "nextRankXp": next_xp,
        "exercisesCompleted": exercises_completed,
    }


@router.get("/leaderboard")
async def leaderboard():
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT u.id, u.display_name, u.is_public,
                   COALESCE(SUM(x.amount), 0) as total_xp
            FROM users u
            LEFT JOIN xp_ledger x ON x.user_id = u.id
            GROUP BY u.id
            HAVING total_xp > 0
            ORDER BY total_xp DESC
            LIMIT 20
        """)
        rows = await cursor.fetchall()
    finally:
        await db.close()

    result = []
    for row in rows:
        total_xp = row["total_xp"]
        rank_code, rank_title, _ = get_rank(total_xp)
        result.append({
            "userId": row["id"],
            "displayName": row["display_name"] if row["is_public"] else "Anonymous",
            "totalXp": total_xp,
            "rank": rank_code,
            "rankTitle": rank_title,
        })
    return result
