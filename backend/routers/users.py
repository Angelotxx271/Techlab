import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db import get_db
from backend.routers.auth import require_user

router = APIRouter(prefix="/api/users", tags=["users"])


class ProfileUpdate(BaseModel):
    skill_level: str | None = None
    interests: list[str] | None = None
    onboarding_complete: bool | None = None
    current_position: str | None = None


class ProgressUpdate(BaseModel):
    data: dict


@router.get("/profile")
async def get_profile(user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data FROM profiles WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
        user_cursor = await db.execute(
            "SELECT current_position FROM users WHERE id = ?", (user_id,)
        )
        user_row = await user_cursor.fetchone()
    finally:
        await db.close()

    profile_data = json.loads(row["data"]) if row else {}
    if user_row:
        profile_data["currentPosition"] = user_row["current_position"]
    return profile_data


@router.put("/profile")
async def update_profile(update: ProfileUpdate, user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data FROM profiles WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
        existing = json.loads(row["data"]) if row else {}

        if update.skill_level is not None:
            existing["skillLevel"] = update.skill_level
        if update.interests is not None:
            existing["interests"] = update.interests
        if update.onboarding_complete is not None:
            existing["onboardingComplete"] = update.onboarding_complete
        if update.current_position is not None:
            existing["currentPosition"] = update.current_position
            await db.execute(
                "UPDATE users SET current_position = ? WHERE id = ?",
                (update.current_position, user_id),
            )

        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO profiles (user_id, data, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
            (user_id, json.dumps(existing), now),
        )
        await db.commit()
    finally:
        await db.close()

    return existing


@router.get("/progress")
async def get_progress(user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data FROM progress WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
    finally:
        await db.close()

    return json.loads(row["data"]) if row else {}


@router.put("/progress")
async def update_progress(update: ProgressUpdate, user_id: str = Depends(require_user)):
    now = datetime.now(timezone.utc).isoformat()
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
            (user_id, json.dumps(update.data), now),
        )
        await db.commit()
    finally:
        await db.close()

    return {"ok": True}


@router.get("/me/full")
async def get_full_profile(user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        user_cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user_row = await user_cursor.fetchone()

        profile_cursor = await db.execute("SELECT data FROM profiles WHERE user_id = ?", (user_id,))
        profile_row = await profile_cursor.fetchone()

        xp_cursor = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ?", (user_id,)
        )
        xp_row = await xp_cursor.fetchone()

        badge_cursor = await db.execute(
            "SELECT badge_type, earned_at FROM badges WHERE user_id = ? ORDER BY earned_at DESC", (user_id,)
        )
        badge_rows = await badge_cursor.fetchall()

        streak_cursor = await db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,))
        streak_row = await streak_cursor.fetchone()

        ex_cursor = await db.execute(
            "SELECT COUNT(DISTINCT exercise_id) as cnt FROM xp_ledger WHERE user_id = ? AND exercise_id NOT LIKE 'bonus:%%'",
            (user_id,),
        )
        ex_row = await ex_cursor.fetchone()
    finally:
        await db.close()

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    profile_data = json.loads(profile_row["data"]) if profile_row else {}

    return {
        "id": user_row["id"],
        "username": user_row["username"],
        "displayName": user_row["display_name"],
        "bio": user_row["bio"],
        "isPublic": bool(user_row["is_public"]),
        "currentPosition": user_row["current_position"],
        "createdAt": user_row["created_at"],
        "profile": profile_data,
        "totalXp": xp_row["total"],
        "exercisesCompleted": ex_row["cnt"],
        "badges": [{"type": r["badge_type"], "earnedAt": r["earned_at"]} for r in badge_rows],
        "streak": {
            "current": streak_row["current_streak"] if streak_row else 0,
            "longest": streak_row["longest_streak"] if streak_row else 0,
        },
    }


class VisibilityUpdate(BaseModel):
    is_public: bool = True
    bio: str = ""


@router.put("/profile/visibility")
async def update_visibility(
    body: VisibilityUpdate,
    user_id: str = Depends(require_user),
):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE users SET is_public = ?, bio = ? WHERE id = ?",
            (int(body.is_public), body.bio, user_id),
        )
        await db.commit()
    finally:
        await db.close()

    return {"ok": True}
