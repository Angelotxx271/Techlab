import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "users.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    current_position TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'learner',
    bio TEXT NOT NULL DEFAULT '',
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    exercise_id TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_exercise ON xp_ledger(user_id, exercise_id);

CREATE TABLE IF NOT EXISTS streaks (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT NOT NULL DEFAULT '',
    freeze_count INTEGER NOT NULL DEFAULT 0,
    today_exercises INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    badge_type TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    UNIQUE(user_id, badge_type)
);
CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);

CREATE TABLE IF NOT EXISTS activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feed_created ON activity_feed(created_at);
"""


async def get_db() -> aiosqlite.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db() -> None:
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()
    finally:
        await db.close()
