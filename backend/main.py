import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.db import init_db
from backend.routers import (
    ai, ai_instructor, analytics, auth, badges, career, catalog,
    certificates, code_challenges, exercises, feed, marketplace,
    modules, multiplayer, streaks, terminal, users, xp,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="TechLab API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers (must be before SPA catch-all)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(xp.router)
app.include_router(career.router)
app.include_router(marketplace.router)
app.include_router(terminal.router)
app.include_router(ai.router)
app.include_router(ai_instructor.router)
app.include_router(catalog.router)
app.include_router(code_challenges.router)
app.include_router(exercises.router)
app.include_router(modules.router)
app.include_router(streaks.router)
app.include_router(badges.router)
app.include_router(analytics.router)
app.include_router(multiplayer.router)
app.include_router(certificates.router)
app.include_router(feed.router)

# Path to the built frontend dist folder
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "An unexpected error occurred. Please try again.",
            "code": "INTERNAL_ERROR",
        },
    )


# Mount static files and SPA catch-all only if dist folder exists (production)
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Catch-all route: serve static files from dist or index.html for client-side routing."""
        # Serve static files from dist root (e.g., favicon.svg, icons.svg)
        static_file = FRONTEND_DIST / full_path
        if full_path and static_file.is_file():
            return FileResponse(static_file)
        # Fall back to index.html for SPA client-side routing
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        return JSONResponse(
            status_code=404,
            content={"error": True, "message": "Frontend not built yet."},
        )

