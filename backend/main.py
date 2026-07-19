"""
main.py — FastAPI backend for Calorie Tracker Telegram Mini App
"""

import logging
import os
import urllib.parse
import json
import httpx
from rapidfuzz import fuzz
from contextlib import asynccontextmanager
from typing import Annotated
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from schemas import (
    AIFoodResult,
    AddTextRequest,
    FoodEntry,
    StatsResponse,
    UserInitRequest,
    UserUpdateRequest,
    WaterEntry,
    WaterAddRequest,
    WeightEntry,
    ManualFoodRequest,
    WeeklyStatsResponse,
    CustomFoodRequest,
)

from ai import FoodAI
from database import (
    add_food_log,
    delete_food_log,
    get_today_logs,
    get_user,
    init_db,
    upsert_user,
    get_logs_by_date,
    get_logs_by_date_range,
    add_water,
    delete_water,
    get_water_by_date,
    get_weight_history,
    update_user_streak,
    add_custom_food,
    search_custom_foods,
    get_recent_foods,
)

# ─────────────────────────── Config ───────────────────────────

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY is missing! Please set it in .env file.")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

food_ai = FoodAI(api_key=GEMINI_API_KEY, model=GEMINI_MODEL)
http_client = httpx.AsyncClient(timeout=5.0)

# ─────────────────────────── App lifecycle ───────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized. Model: %s", GEMINI_MODEL)
    yield
    await http_client.aclose()

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

# ─────────────────────────── Removed schemas (now in schemas.py) ───────────────────────────


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
    water_rows = get_water_by_date(user_id, target)
    
    # Update and get current streak
    streak = update_user_streak(user_id)

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
            meal_type=r["meal_type"],
            logged_at=r["logged_at"],
        )
        for r in rows
    ]
    
    water_entries = [
        WaterEntry(id=r["id"], amount_ml=r["amount_ml"], logged_at=r["logged_at"])
        for r in water_rows
    ]

    return StatsResponse(
        user_id=user_id,
        date=target,
        total_calories=sum(e.calories for e in entries),
        calorie_goal=user["calorie_goal"],
        total_protein=sum(e.protein or 0 for e in entries),
        total_carbs=sum(e.carbs or 0 for e in entries),
        total_fat=sum(e.fat or 0 for e in entries),
        water_ml=sum(w.amount_ml for w in water_entries),
        streak=streak,
        entries=entries,
        water_entries=water_entries,
    )


# ── 3. Add food by text ───────────────────────────────────────

@app.post("/api/add-text", response_model=AIFoodResult, status_code=status.HTTP_201_CREATED)
async def add_text(body: AddTextRequest):
    """
    Pass a text description (e.g. "банан" or "тарелка борща").
    Gemini returns name + calories + macros, which are saved to the DB.
    """
    _require_user(body.user_id)

    result = await food_ai.analyze_text(body.text)
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
        meal_type=body.meal_type,
        log_date=body.log_date,
    )

    return AIFoodResult(log_id=log_id, **result)


# ── 4. Analyze photo ─────────────────────────────────────────

@app.post("/api/analyze-photo", response_model=AIFoodResult, status_code=status.HTTP_201_CREATED)
async def analyze_photo(
    user_id: Annotated[int, Form()],
    file: Annotated[UploadFile, File(description="Food photo (JPEG / PNG / WEBP)")],
    meal_type: Annotated[str, Form()] = "any",
    log_date: Annotated[str | None, Form()] = None,
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

    result = await food_ai.analyze_photo(image_bytes, mime_type=content_type)
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
        meal_type=meal_type,
        log_date=log_date,
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


# ── 6. Water Tracker ─────────────────────────────────────────

@app.post("/api/water", status_code=status.HTTP_201_CREATED)
def log_water(body: WaterAddRequest):
    _require_user(body.user_id)
    log_id = add_water(body.user_id, body.amount_ml)
    return {"log_id": log_id, "amount_ml": body.amount_ml}

@app.delete("/api/water/{log_id}", status_code=status.HTTP_200_OK)
def remove_water(log_id: int, user_id: int):
    _require_user(user_id)
    deleted = delete_water(log_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Water log not found")
    return {"deleted": True}


# ── 7. Weight History ────────────────────────────────────────

@app.get("/api/weight-history", response_model=list[WeightEntry])
def weight_history(user_id: int):
    _require_user(user_id)
    rows = get_weight_history(user_id)
    return [WeightEntry(weight=r["weight"], date=r["date"]) for r in rows]


# ── 8. Manual Food ───────────────────────────────────────────

@app.post("/api/add-manual", response_model=AIFoodResult)
def add_manual(body: ManualFoodRequest):
    _require_user(body.user_id)
    log_id = add_food_log(
        user_id=body.user_id,
        food_name=body.food_name,
        calories=body.calories,
        protein=body.protein,
        carbs=body.carbs,
        fat=body.fat,
        emoji=body.emoji,
        source="manual",
        meal_type=body.meal_type,
        log_date=body.log_date,
    )
    return AIFoodResult(
        log_id=log_id,
        food=body.food_name,
        calories=body.calories,
        protein=body.protein,
        carbs=body.carbs,
        fat=body.fat,
        emoji=body.emoji,
    )


# ── 9. Barcode Scanner (OpenFoodFacts) ───────────────────────

@app.get("/api/barcode/{barcode}")
async def scan_barcode(barcode: str):
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    resp = await http_client.get(url)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Barcode API error")
        
    data = resp.json()
    if data.get("status") != 1:
        raise HTTPException(status_code=404, detail="Product not found in OpenFoodFacts")
        
    product = data.get("product", {})
    nutriments = product.get("nutriments", {})
    
    return {
        "food_name": product.get("product_name", "Unknown Product"),
        "calories": int(nutriments.get("energy-kcal_100g", 0) or 0),
        "protein": float(nutriments.get("proteins_100g", 0.0) or 0.0),
        "carbs": float(nutriments.get("carbohydrates_100g", 0.0) or 0.0),
        "fat": float(nutriments.get("fat_100g", 0.0) or 0.0),
        "brand": product.get("brands", ""),
        "image_url": product.get("image_url", ""),
    }


# ── 10. Search Food (OpenFoodFacts) ───────────────────────

ENG_TO_RUS_KEYBOARD = str.maketrans(
    "qwertyuiop[]asdfghjkl;'zxcvbnm,.",
    "йцукенгшщзхъфывапролджэячсмитьбю"
)

ENG_TO_RUS_SOUND = {
    "cola": "кола", "kfc": "кфс", "mcdonalds": "макдоналдс",
    "sprite": "спрайт", "fanta": "фанта", "pepsi": "пепси",
    "latte": "латте", "cappuccino": "капучино", "coffee": "кофе",
    "tea": "чай", "burger": "бургер", "pizza": "пицца",
    "sushi": "суши", "snickers": "сникерс", "bounty": "баунти",
    "twix": "твикс", "mars": "марс", "oreo": "орео", "lays": "лейс",
    "pringles": "принглс"
}
@app.post("/api/custom-food", status_code=status.HTTP_201_CREATED)
def create_custom_food(body: CustomFoodRequest):
    """Save a custom food/recipe to the database."""
    _require_user(body.user_id)
    food_id = add_custom_food(
        user_id=body.user_id,
        food_name=body.food_name,
        calories=body.calories,
        protein=body.protein,
        carbs=body.carbs,
        fat=body.fat,
    )
    return {"status": "ok", "custom_food_id": food_id}

@app.get("/api/recent-foods")
def recent_foods(user_id: int):
    _require_user(user_id)
    rows = get_recent_foods(user_id, limit=20)
    return [
        {
            "food_name": r["food_name"],
            "calories": r["calories"],
            "protein": r["protein"],
            "carbs": r["carbs"],
            "fat": r["fat"],
            "emoji": r["emoji"],
        }
        for r in rows
    ]

@app.get("/api/search-food")
async def search_food(q: str):
    q_str = q.strip().lower()
    if not q_str:
        return []
        
    results = []
    seen = set()
    
    # 1. Preprocess query
    q_kb = q_str.translate(ENG_TO_RUS_KEYBOARD)
    words = q_str.split()
    for i, w in enumerate(words):
        if w in ENG_TO_RUS_SOUND:
            words[i] = ENG_TO_RUS_SOUND[w]
    q_syn = " ".join(words)
    
    queries = [q_str, q_kb, q_syn]
    
    # 2. Search Custom Foods from DB first
    custom_results = search_custom_foods(q_str, limit=5)
    for cr in custom_results:
        results.append({
            "food_name": cr["food_name"],
            "calories": cr["calories"],
            "protein": cr["protein"],
            "carbs": cr["carbs"],
            "fat": cr["fat"],
            "brand": "Мой рецепт",
            "image_url": "",
        })
        seen.add(cr["food_name"].lower())

    # 3. Search local DB
    local_db_path = os.path.join(os.path.dirname(__file__), "local_db.json")
    if os.path.exists(local_db_path):
        with open(local_db_path, "r", encoding="utf-8") as f:
            local_foods = json.load(f)
            
            scored = []
            for lf in local_foods:
                fname = lf["food_name"].lower()
                best_score = 0
                for query in queries:
                    score = fuzz.token_set_ratio(query, fname)
                    if query in fname:
                        score = max(score, 90)
                    best_score = max(best_score, score)
                
                if best_score >= 60:
                    scored.append((best_score, lf))
            
            scored.sort(key=lambda x: x[0], reverse=True)
            
            for score, lf in scored[:15]:
                results.append({
                    "food_name": lf["food_name"],
                    "calories": lf["calories"],
                    "protein": lf["protein"],
                    "carbs": lf["carbs"],
                    "fat": lf["fat"],
                    "brand": "Локальная база",
                    "image_url": "",
                })
                seen.add(lf["food_name"].lower())
    
    # 4. Try OpenFoodFacts
    q_encoded = urllib.parse.quote(q.strip())
    url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={q_encoded}&search_simple=1&action=process&json=1&page_size=20"
    
    try:
        resp = await http_client.get(url, headers={"User-Agent": "CalorieTrackerApp/1.0"})
        if resp.status_code == 200:
                data = resp.json()
                products = data.get("products", [])
                for p in products:
                    name = p.get("product_name")
                    if not name:
                        continue
                        
                    name_lower = name.lower().strip()
                    if name_lower in seen:
                        continue
                        
                    nutriments = p.get("nutriments", {})
                    calories = nutriments.get("energy-kcal_100g")
                    if calories is None:
                        continue
                        
                    seen.add(name_lower)
                    results.append({
                        "food_name": name,
                        "calories": int(calories or 0),
                        "protein": float(nutriments.get("proteins_100g") or 0.0),
                        "carbs": float(nutriments.get("carbohydrates_100g") or 0.0),
                        "fat": float(nutriments.get("fat_100g") or 0.0),
                        "brand": p.get("brands", ""),
                        "image_url": p.get("image_url", ""),
                    })
    except Exception:
        pass # Ignore 503 or timeout from OpenFoodFacts
        
    return results


# ── 11. Weekly Stats ─────────────────────────────────────────

@app.get("/api/stats/weekly", response_model=WeeklyStatsResponse)
def get_weekly_stats(user_id: int):
    _require_user(user_id)
    from datetime import date as date_cls, timedelta
    today = date_cls.today()
    dates = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    
    start_date = dates[0]
    end_date = dates[-1]
    all_logs = get_logs_by_date_range(user_id, start_date, end_date)
    
    weekly_calories = [0] * 7
    for log in all_logs:
        try:
            day_idx = dates.index(log["date"])
            weekly_calories[day_idx] += log["calories"]
        except ValueError:
            pass
            
    streak = update_user_streak(user_id)
    return WeeklyStatsResponse(
        user_id=user_id,
        streak=streak,
        weekly_calories=weekly_calories,
        dates=dates
    )


# ─────────────────────────── Run locally / Serve Frontend ───────────────────────────

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
assets_dir = os.path.join(frontend_dir, "assets")
os.makedirs(assets_dir, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join(frontend_dir, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    raise HTTPException(status_code=404, detail="Frontend not built. Run 'npm run build' in frontend folder.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
