from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from backend.db import get_db
from backend.routers.auth import require_user

router = APIRouter(prefix="/api/streaks", tags=["streaks"])

DAILY_GOAL = 2


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _yesterday_str() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")


@router.post("/checkin")
async def checkin(user_id: str = Depends(require_user)):
    today = _today_str()
    yesterday = _yesterday_str()

    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()

        if not row:
            await db.execute(
                "INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date, freeze_count, today_exercises) "
                "VALUES (?, 1, 1, ?, 0, 1)",
                (user_id, today),
            )
            await db.commit()
            return {"currentStreak": 1, "longestStreak": 1, "todayExercises": 1, "dailyGoalMet": False}

        last_date = row["last_active_date"]
        current = row["current_streak"]
        longest = row["longest_streak"]
        today_ex = row["today_exercises"]

        if last_date == today:
            today_ex += 1
            await db.execute(
                "UPDATE streaks SET today_exercises = ? WHERE user_id = ?",
                (today_ex, user_id),
            )
        elif last_date == yesterday:
            current += 1
            longest = max(longest, current)
            today_ex = 1
            await db.execute(
                "UPDATE streaks SET current_streak = ?, longest_streak = ?, last_active_date = ?, today_exercises = 1 WHERE user_id = ?",
                (current, longest, today, user_id),
            )
        else:
            current = 1
            longest = max(longest, current)
            today_ex = 1
            await db.execute(
                "UPDATE streaks SET current_streak = 1, longest_streak = ?, last_active_date = ?, today_exercises = 1 WHERE user_id = ?",
                (longest, today, user_id),
            )

        await db.commit()
    finally:
        await db.close()

    return {
        "currentStreak": current,
        "longestStreak": longest,
        "todayExercises": today_ex,
        "dailyGoalMet": today_ex >= DAILY_GOAL,
    }


@router.get("")
async def get_streak(user_id: str = Depends(require_user)):
    today = _today_str()
    yesterday = _yesterday_str()

    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
    finally:
        await db.close()

    if not row:
        return {"currentStreak": 0, "longestStreak": 0, "todayExercises": 0, "dailyGoalMet": False}

    last_date = row["last_active_date"]
    current = row["current_streak"]

    if last_date != today and last_date != yesterday:
        current = 0

    return {
        "currentStreak": current,
        "longestStreak": row["longest_streak"],
        "todayExercises": row["today_exercises"] if last_date == today else 0,
        "dailyGoalMet": (row["today_exercises"] >= DAILY_GOAL) if last_date == today else False,
    }
