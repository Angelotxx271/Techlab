from fastapi import APIRouter

from backend.db import get_db

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("")
async def get_feed():
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT af.event_type, af.detail, af.created_at,
                   u.display_name, u.is_public
            FROM activity_feed af
            JOIN users u ON u.id = af.user_id
            ORDER BY af.created_at DESC
            LIMIT 50
        """)
        rows = await cursor.fetchall()

        xp_events = await db.execute("""
            SELECT x.amount, x.reason, x.created_at,
                   u.display_name, u.is_public
            FROM xp_ledger x
            JOIN users u ON u.id = x.user_id
            WHERE x.exercise_id LIKE 'bonus:%'
            ORDER BY x.created_at DESC
            LIMIT 20
        """)
        xp_rows = await xp_events.fetchall()
    finally:
        await db.close()

    events = []
    for row in rows:
        name = row["display_name"] if row["is_public"] else "Anonymous"
        event_type = row["event_type"]
        detail = row["detail"]

        if event_type == "badge":
            action = f"earned the {detail.replace('_', ' ').title()} badge"
        elif event_type == "path_complete":
            action = f"completed the {detail.replace('-', ' ').title()} path"
        elif event_type == "streak":
            action = f"reached a {detail}-day streak"
        else:
            action = detail

        events.append({
            "displayName": name,
            "action": action,
            "type": event_type,
            "timestamp": row["created_at"],
        })

    for row in xp_rows:
        name = row["display_name"] if row["is_public"] else "Anonymous"
        reason = row["reason"]
        if reason.startswith("bonus:path"):
            action = f"completed a learning path"
        elif reason.startswith("bonus:module"):
            action = f"finished a module"
        else:
            action = f"earned {row['amount']} XP"

        events.append({
            "displayName": name,
            "action": action,
            "type": "xp",
            "timestamp": row["created_at"],
        })

    events.sort(key=lambda e: e["timestamp"], reverse=True)
    return events[:50]
