import asyncio
import json
import secrets
import time
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel

from backend.routers.auth import require_user

router = APIRouter(prefix="/api/multiplayer", tags=["multiplayer"])

CHALLENGES = [
    {
        "id": "fizzbuzz",
        "title": "FizzBuzz",
        "description": "Write a function that returns 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, 'FizzBuzz' for both, or the number as a string.",
        "language": "python",
        "template": "def fizzbuzz(n):\n    pass",
        "test_input": "15",
        "expected": "FizzBuzz",
    },
    {
        "id": "reverse_string",
        "title": "Reverse String",
        "description": "Write a function that reverses a string without using slicing or built-in reverse.",
        "language": "python",
        "template": "def reverse_string(s):\n    pass",
        "test_input": "hello",
        "expected": "olleh",
    },
    {
        "id": "palindrome",
        "title": "Palindrome Check",
        "description": "Write a function that checks if a string is a palindrome (ignoring case and spaces).",
        "language": "python",
        "template": "def is_palindrome(s):\n    pass",
        "test_input": "A man a plan a canal Panama",
        "expected": "True",
    },
    {
        "id": "fibonacci",
        "title": "Fibonacci Number",
        "description": "Write a function that returns the nth Fibonacci number (0-indexed). fib(0)=0, fib(1)=1.",
        "language": "python",
        "template": "def fib(n):\n    pass",
        "test_input": "10",
        "expected": "55",
    },
]

_rooms: dict[str, dict] = {}

TIMEOUT_SECS = 300


class CreateRoomResponse(BaseModel):
    room_id: str
    challenge: dict


@router.post("/create")
async def create_room(user_id: str = Depends(require_user)):
    room_id = secrets.token_urlsafe(8)
    challenge = CHALLENGES[hash(room_id) % len(CHALLENGES)]
    _rooms[room_id] = {
        "id": room_id,
        "challenge": challenge,
        "players": {},
        "state": "waiting",
        "created_at": time.time(),
        "winner": None,
    }
    return {"roomId": room_id, "challenge": challenge}


@router.get("/rooms")
async def list_rooms():
    now = time.time()
    available = []
    for rid, room in list(_rooms.items()):
        if now - room["created_at"] > TIMEOUT_SECS:
            del _rooms[rid]
            continue
        if room["state"] == "waiting" and len(room["players"]) < 2:
            available.append({"roomId": rid, "challenge": room["challenge"]["title"], "players": len(room["players"])})
    return available


@router.websocket("/ws/{room_id}")
async def multiplayer_ws(websocket: WebSocket, room_id: str):
    await websocket.accept()

    room = _rooms.get(room_id)
    if not room:
        await websocket.send_json({"type": "error", "message": "Room not found"})
        await websocket.close()
        return

    auth = await websocket.receive_text()
    try:
        auth_data = json.loads(auth)
        player_id = auth_data.get("userId", secrets.token_urlsafe(4))
        player_name = auth_data.get("displayName", "Player")
    except (json.JSONDecodeError, KeyError):
        player_id = secrets.token_urlsafe(4)
        player_name = "Player"

    if len(room["players"]) >= 2:
        await websocket.send_json({"type": "error", "message": "Room is full"})
        await websocket.close()
        return

    room["players"][player_id] = {
        "ws": websocket,
        "name": player_name,
        "progress": 0,
        "submitted": False,
        "code": "",
    }

    await websocket.send_json({
        "type": "joined",
        "playerId": player_id,
        "challenge": room["challenge"],
        "playerCount": len(room["players"]),
    })

    for pid, p in room["players"].items():
        if pid != player_id:
            try:
                await p["ws"].send_json({
                    "type": "opponent_joined",
                    "opponentName": player_name,
                    "playerCount": len(room["players"]),
                })
            except Exception:
                pass

    if len(room["players"]) == 2:
        room["state"] = "active"
        room["start_time"] = time.time()
        for pid, p in room["players"].items():
            try:
                await p["ws"].send_json({"type": "start", "timeout": TIMEOUT_SECS})
            except Exception:
                pass

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "progress":
                room["players"][player_id]["progress"] = msg.get("progress", 0)
                for pid, p in room["players"].items():
                    if pid != player_id:
                        try:
                            await p["ws"].send_json({
                                "type": "opponent_progress",
                                "progress": msg.get("progress", 0),
                            })
                        except Exception:
                            pass

            elif msg_type == "submit":
                room["players"][player_id]["submitted"] = True
                room["players"][player_id]["code"] = msg.get("code", "")
                answer = msg.get("answer", "").strip()
                expected = room["challenge"]["expected"].strip()
                correct = answer == expected

                if correct and not room["winner"]:
                    room["winner"] = player_id
                    room["state"] = "finished"
                    for pid, p in room["players"].items():
                        try:
                            await p["ws"].send_json({
                                "type": "finished",
                                "winner": player_id,
                                "winnerName": player_name,
                                "isYou": pid == player_id,
                            })
                        except Exception:
                            pass
                else:
                    await websocket.send_json({"type": "result", "correct": correct})

    except (WebSocketDisconnect, Exception):
        if player_id in room["players"]:
            del room["players"][player_id]
        for pid, p in room["players"].items():
            try:
                await p["ws"].send_json({"type": "opponent_left"})
            except Exception:
                pass
        if not room["players"]:
            _rooms.pop(room_id, None)
