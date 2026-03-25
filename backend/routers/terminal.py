import asyncio
import os
import sys
import tempfile

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/api/terminal", tags=["terminal"])

TIMEOUT_SECONDS = 60
MAX_OUTPUT_BYTES = 10 * 1024 * 1024  # 10 MB


@router.websocket("/ws")
async def terminal_ws(websocket: WebSocket):
    await websocket.accept()

    language = "python"
    process = None
    output_bytes = 0

    async def start_process(lang: str):
        nonlocal process, language, output_bytes
        language = lang
        output_bytes = 0
        if process and process.returncode is None:
            try:
                process.kill()
            except ProcessError:
                pass

        if lang == "javascript":
            cmd = ["node", "-i"]
        else:
            cmd = [sys.executable, "-i", "-u"]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        return process

    async def read_stream(stream, ws, label=""):
        nonlocal output_bytes
        try:
            while True:
                data = await asyncio.wait_for(stream.read(4096), timeout=TIMEOUT_SECONDS)
                if not data:
                    break
                output_bytes += len(data)
                if output_bytes > MAX_OUTPUT_BYTES:
                    await ws.send_json({"type": "error", "data": "Output limit exceeded. Session reset."})
                    break
                text = data.decode("utf-8", errors="replace")
                await ws.send_json({"type": "output", "data": text})
        except asyncio.TimeoutError:
            await ws.send_json({"type": "error", "data": "Session timed out due to inactivity."})
        except Exception:
            pass

    try:
        process = await start_process("python")
        stdout_task = asyncio.create_task(read_stream(process.stdout, websocket))
        stderr_task = asyncio.create_task(read_stream(process.stderr, websocket))

        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type", "input")

            if msg_type == "switch":
                stdout_task.cancel()
                stderr_task.cancel()
                if process and process.returncode is None:
                    process.kill()
                new_lang = msg.get("language", "python")
                process = await start_process(new_lang)
                stdout_task = asyncio.create_task(read_stream(process.stdout, websocket))
                stderr_task = asyncio.create_task(read_stream(process.stderr, websocket))
                await websocket.send_json({"type": "info", "data": f"Switched to {new_lang} REPL.\n"})

            elif msg_type == "reset":
                stdout_task.cancel()
                stderr_task.cancel()
                if process and process.returncode is None:
                    process.kill()
                process = await start_process(language)
                stdout_task = asyncio.create_task(read_stream(process.stdout, websocket))
                stderr_task = asyncio.create_task(read_stream(process.stderr, websocket))
                await websocket.send_json({"type": "info", "data": "Session reset.\n"})

            elif msg_type == "input":
                text = msg.get("data", "")
                if process and process.stdin and process.returncode is None:
                    process.stdin.write((text + "\n").encode())
                    await process.stdin.drain()

    except WebSocketDisconnect:
        pass
    finally:
        if process and process.returncode is None:
            try:
                process.kill()
            except Exception:
                pass
