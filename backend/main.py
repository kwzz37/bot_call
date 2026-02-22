"""
main.py — FastAPI backend for Calorie Tracker Telegram Mini App
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai import FoodAI
from database import (
    add_food_log,
    delete_food_log,
    get_today_logs,
    get_user,
    init_db,
    upsert_user,
    get_logs_by_date,
)

# ─────────────────────────── Config ───────────────────────────

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAPnuJCUBA8QzxU8shSg96Rpf4qiB2exv8")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

food_ai = FoodAI(api_key=GEMINI_API_KEY, model=GEMINI_MODEL)

# ─────────────────────────── App lifecycle ───────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized. Model: %s", GEMINI_MODEL)
    yield

app = FastAPI(
    title="Calorie Tracker API",
    description="Backend for Telegram Mini App calorie tracker",
    version="1.0.0",
    lifespan=lifespan,
)

# ─────────────────────────── CORS ───────────────────────────
# Allow all origins so the Telegram Mini App (webview / localhost) can connect.
# Tighten in production by listing specific origins.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────── Pydantic schemas ───────────────────────────

class UserInitRequest(BaseModel):
    user_id: int
    first_name: str | None = None
    username: str | None = None
    calorie_goal: int = Field(default=2500, ge=500, le=10000)
    weight: float | None = Field(default=None, ge=20, le=500)
    height: float | None = Field(default=None, ge=50, le=300)
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = None


class UserUpdateRequest(BaseModel):
    calorie_goal: int | None = Field(default=None, ge=500, le=10000)
    weight: float | None = Field(default=None, ge=20, le=500)
    height: float | None = Field(default=None, ge=50, le=300)
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = None


class AddTextRequest(BaseModel):
    user_id: int
    text: str = Field(min_length=1, max_length=500)


class FoodEntry(BaseModel):
    id: int
    food_name: str
    calories: int
    protein: float | None
    carbs: float | None
    fat: float | None
    emoji: str | None
    source: str
    logged_at: str


class StatsResponse(BaseModel):
    user_id: int
    date: str
    total_calories: int
    calorie_goal: int
    total_protein: float
    total_carbs: float
    total_fat: float
    entries: list[FoodEntry]


class AIFoodResult(BaseModel):
    food: str
    calories: int
    protein: float | None = None
    carbs: float | None = None
    fat: float | None = None
    emoji: str | None = None
    log_id: int


# ─────────────────────────── Helper ───────────────────────────

def _require_user(user_id: int):
    user = get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found. Call /api/init-user first.",
        )
    return user


# ─────────────────────────── Endpoints ───────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": GEMINI_MODEL}


# ── 1. Init / upsert user ──────────────────────────────────────────

@app.post("/api/init-user", status_code=status.HTTP_200_OK)
def init_user(body: UserInitRequest):
    """
    Create the user if they don't exist, or update their profile.
    Called when the Telegram Mini App opens.
    """
    user = upsert_user(
        body.user_id,
        calorie_goal=body.calorie_goal,
        weight=body.weight,
        height=body.height,
        age=body.age,
        gender=body.gender,
        first_name=body.first_name,
        username=body.username,
    )
    return {
        "user_id":      user["id"],
        "calorie_goal": user["calorie_goal"],
        "weight":       user["weight"],
        "height":       user["height"],
        "age":          user["age"],
        "gender":       user["gender"],
        "first_name":   user["first_name"],
        "username":     user["username"],
        "created_at":   user["created_at"],
    }


@app.patch("/api/user/{user_id}", status_code=status.HTTP_200_OK)
def update_user(user_id: int, body: UserUpdateRequest):
    """Update user goals / metrics."""
    _require_user(user_id)
    user = upsert_user(
        user_id,
        calorie_goal=body.calorie_goal or 2500,
        weight=body.weight,
        height=body.height,
        age=body.age,
        gender=body.gender,
    )
    return {"calorie_goal": user["calorie_goal"], "weight": user["weight"]}


# ── 2. Stats ──────────────────────────────────────────────────

@app.get("/api/stats", response_model=StatsResponse)
def get_stats(user_id: int, date: str | None = None):
    """
    Return today's (or a specific date's) food logs and calorie total.
    Query params: ?user_id=123&date=2026-02-22 (date is optional, defaults to today)
    """
    user = _require_user(user_id)

    from datetime import date as date_cls
    target = date or date_cls.today().isoformat()

    rows = get_logs_by_date(user_id, target) if date else get_today_logs(user_id)

    entries = [
        FoodEntry(
            id=r["id"],
            food_name=r["food_name"],
            calories=r["calories"],
            protein=r["protein"],
            carbs=r["carbs"],
            fat=r["fat"],
            emoji=r["emoji"],
            source=r["source"],
            logged_at=r["logged_at"],
        )
        for r in rows
    ]

    return StatsResponse(
        user_id=user_id,
        date=target,
        total_calories=sum(e.calories for e in entries),
        calorie_goal=user["calorie_goal"],
        total_protein=sum(e.protein or 0 for e in entries),
        total_carbs=sum(e.carbs or 0 for e in entries),
        total_fat=sum(e.fat or 0 for e in entries),
        entries=entries,
    )


# ── 3. Add food by text ───────────────────────────────────────

@app.post("/api/add-text", response_model=AIFoodResult, status_code=status.HTTP_201_CREATED)
def add_text(body: AddTextRequest):
    """
    Pass a text description (e.g. "банан" or "тарелка борща").
    Gemini returns name + calories + macros, which are saved to the DB.
    """
    _require_user(body.user_id)

    result = food_ai.analyze_text(body.text)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gemini could not identify food in the given text.",
        )

    log_id = add_food_log(
        user_id=body.user_id,
        food_name=result["food"],
        calories=int(result["calories"]),
        protein=result.get("protein"),
        carbs=result.get("carbs"),
        fat=result.get("fat"),
        emoji=result.get("emoji"),
        source="text_ai",
    )

    return AIFoodResult(log_id=log_id, **result)


# ── 4. Analyze photo ─────────────────────────────────────────

@app.post("/api/analyze-photo", response_model=AIFoodResult, status_code=status.HTTP_201_CREATED)
async def analyze_photo(
    user_id: Annotated[int, Form()],
    file: Annotated[UploadFile, File(description="Food photo (JPEG / PNG / WEBP)")],
):
    """
    Upload a food photo. Gemini vision identifies the dish and estimates calories.
    The result is saved to the DB and returned.
    """
    _require_user(user_id)

    # Validate MIME
    allowed_mime = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    content_type = file.content_type or "image/jpeg"
    if content_type not in allowed_mime:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type: {content_type}. Allowed: {allowed_mime}",
        )

    # Limit file size to 10 MB
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large. Max 10 MB.",
        )

    result = food_ai.analyze_photo(image_bytes, mime_type=content_type)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No food detected in the photo.",
        )

    log_id = add_food_log(
        user_id=user_id,
        food_name=result["food"],
        calories=int(result["calories"]),
        protein=result.get("protein"),
        carbs=result.get("carbs"),
        fat=result.get("fat"),
        emoji=result.get("emoji"),
        source="photo_ai",
    )

    return AIFoodResult(log_id=log_id, **result)


# ── 5. Delete food entry ─────────────────────────────────────

@app.delete("/api/food/{log_id}", status_code=status.HTTP_200_OK)
def delete_food(log_id: int, user_id: int):
    """Delete a food log entry. ?user_id=123 is required for authorization."""
    _require_user(user_id)
    deleted = delete_food_log(log_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log entry not found.")
    return {"deleted": True, "log_id": log_id}


# ─────────────────────────── Run locally ───────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
