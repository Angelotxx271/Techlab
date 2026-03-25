import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from backend.db import get_db
from backend.routers.auth import require_user
from backend.routers.xp import get_rank

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


@router.get("/{path_id}")
async def get_certificate(path_id: str, user_id: str = Depends(require_user)):
    db = await get_db()
    try:
        user_cursor = await db.execute("SELECT display_name FROM users WHERE id = ?", (user_id,))
        user_row = await user_cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")

        progress_cursor = await db.execute("SELECT data FROM progress WHERE user_id = ?", (user_id,))
        progress_row = await progress_cursor.fetchone()
        progress_data = json.loads(progress_row["data"]) if progress_row else {}

        bonus_cursor = await db.execute(
            "SELECT created_at FROM xp_ledger WHERE user_id = ? AND exercise_id = ?",
            (user_id, f"bonus:path:{path_id}"),
        )
        bonus_row = await bonus_cursor.fetchone()

        xp_cursor = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM xp_ledger WHERE user_id = ?",
            (user_id,),
        )
        xp_row = await xp_cursor.fetchone()
        total_xp = xp_row["total"]
    finally:
        await db.close()

    completed_modules = progress_data.get("completedModules", {})
    path_modules = completed_modules.get(path_id, [])

    if not bonus_row and len(path_modules) == 0:
        raise HTTPException(status_code=403, detail="Path not completed")

    completion_date = bonus_row["created_at"] if bonus_row else datetime.now(timezone.utc).isoformat()
    rank_code, rank_title, _ = get_rank(total_xp)

    return {
        "userName": user_row["display_name"],
        "pathId": path_id,
        "pathTitle": path_id.replace("-", " ").title(),
        "completionDate": completion_date,
        "totalXp": total_xp,
        "rank": rank_code,
        "rankTitle": rank_title,
        "modulesCompleted": len(path_modules),
    }
