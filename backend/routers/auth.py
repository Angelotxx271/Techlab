import hashlib
import json
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from backend.db import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory session store: token -> user_id
_sessions: dict[str, str] = {}


class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


async def get_current_user_id(authorization: str | None = Header(None)) -> str | None:
    """Extract user_id from Bearer token. Returns None if not authenticated."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    return _sessions.get(token)


async def require_user(authorization: str | None = Header(None)) -> str:
    """Like get_current_user_id but raises 401 if not authenticated."""
    user_id = await get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


async def _user_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "username": row["username"],
        "displayName": row["display_name"],
        "currentPosition": row["current_position"],
        "role": row["role"],
        "bio": row["bio"],
        "isPublic": bool(row["is_public"]),
    }


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    if len(req.username) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    user_id = str(uuid.uuid4())
    salt = secrets.token_hex(16)
    password_hash = f"{salt}${_hash_password(req.password, salt)}"
    now = datetime.now(timezone.utc).isoformat()
    display_name = req.display_name or req.username

    db = await get_db()
    try:
        existing = await db.execute("SELECT id FROM users WHERE username = ?", (req.username,))
        if await existing.fetchone():
            raise HTTPException(status_code=409, detail="Username already taken")

        await db.execute(
            "INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, req.username, password_hash, display_name, now),
        )
        await db.execute(
            "INSERT INTO profiles (user_id, data, updated_at) VALUES (?, ?, ?)",
            (user_id, "{}", now),
        )
        await db.execute(
            "INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)",
            (user_id, "{}", now),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user_row = await cursor.fetchone()
    finally:
        await db.close()

    token = secrets.token_urlsafe(32)
    _sessions[token] = user_id

    return AuthResponse(token=token, user=await _user_to_dict(user_row))


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (req.username,))
        user_row = await cursor.fetchone()
    finally:
        await db.close()

    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    stored = user_row["password_hash"]
    salt, expected_hash = stored.split("$", 1)
    if _hash_password(req.password, salt) != expected_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    _sessions[token] = user_row["id"]

    return AuthResponse(token=token, user=await _user_to_dict(user_row))


@router.get("/me")
async def get_me(authorization: str | None = Header(None)):
    user_id = await get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user_row = await cursor.fetchone()
    finally:
        await db.close()

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    return await _user_to_dict(user_row)


@router.post("/logout")
async def logout(authorization: str | None = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        _sessions.pop(token, None)
    return {"ok": True}
