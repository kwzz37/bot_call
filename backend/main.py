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
    OnboardingRequest,
    OnboardingResponse,
    StatsResponse,
    UserInitRequest,
    UserUpdateRequest,
    WaterEntry,
    WaterAddRequest,
    WeightEntry,
    ManualFoodRequest,
    WeeklyStatsResponse,
    CustomFoodRequest,
    FavoriteRequest,
    FavoriteResponse,
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
    complete_onboarding,
    add_favorite,
    remove_favorite,
    get_favorites,
    is_favorite,
)

# ─────────────────────────── Config ───────────────────────────

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY is missing! Please set it in .env file.")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

food_ai = FoodAI(api_key=GEMINI_API_KEY, model=GEMINI_MODEL)
http_client = httpx.AsyncClient(timeout=8.0)

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
    version="2.0.0",
    lifespan=lifespan,
)

# ─────────────────────────── CORS ───────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        "user_id":        user["id"],
        "calorie_goal":   user["calorie_goal"],
        "protein_goal":   user["protein_goal"],
        "carbs_goal":     user["carbs_goal"],
        "fat_goal":       user["fat_goal"],
        "weight":         user["weight"],
        "height":         user["height"],
        "age":            user["age"],
        "gender":         user["gender"],
        "goal_type":      user["goal_type"],
        "activity_level": user["activity_level"],
        "water_goal":     user["water_goal"] or 2000,
        "setup_complete": user["setup_complete"] or 0,
        "first_name":     user["first_name"],
        "username":       user["username"],
        "created_at":     user["created_at"],
    }


@app.patch("/api/user/{user_id}", status_code=status.HTTP_200_OK)
def update_user(user_id: int, body: UserUpdateRequest):
    """Update user goals / metrics."""
    _require_user(user_id)
    user = upsert_user(
        user_id,
        calorie_goal=body.calorie_goal,
        protein_goal=body.protein_goal,
        carbs_goal=body.carbs_goal,
        fat_goal=body.fat_goal,
        weight=body.weight,
        height=body.height,
        age=body.age,
        gender=body.gender,
        goal_type=body.goal_type,
        activity_level=body.activity_level,
        water_goal=body.water_goal,
    )
    return {
        "calorie_goal":   user["calorie_goal"],
        "protein_goal":   user["protein_goal"],
        "carbs_goal":     user["carbs_goal"],
        "fat_goal":       user["fat_goal"],
        "weight":         user["weight"],
        "goal_type":      user["goal_type"],
        "activity_level": user["activity_level"],
    }


# ── 2. Onboarding ─────────────────────────────────────────────────

@app.post("/api/onboarding", response_model=OnboardingResponse, status_code=status.HTTP_200_OK)
def onboarding(body: OnboardingRequest):
    """
    Complete user onboarding: calculate TDEE, macro goals, save everything.
    Called after the user fills in their profile on first launch.
    """
    _require_user(body.user_id)
    goals = complete_onboarding(
        user_id=body.user_id,
        weight=body.weight,
        height=body.height,
        age=body.age,
        gender=body.gender,
        goal_type=body.goal_type,
        activity_level=body.activity_level,
    )
    return OnboardingResponse(
        bmr=goals["bmr"],
        tdee=goals["tdee"],
        calorie_goal=goals["calorie_goal"],
        protein_goal=goals["protein_goal"],
        carbs_goal=goals["carbs_goal"],
        fat_goal=goals["fat_goal"],
        water_goal=2000,
    )


# ── 3. Stats ──────────────────────────────────────────────────

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
        water_goal=user["water_goal"] or 2000,
        streak=streak,
        entries=entries,
        water_entries=water_entries,
        protein_goal=user["protein_goal"],
        carbs_goal=user["carbs_goal"],
        fat_goal=user["fat_goal"],
        setup_complete=user["setup_complete"] or 0,
    )


# ── 4. Add food by text ───────────────────────────────────────

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


# ── 5. Analyze photo ─────────────────────────────────────────

@app.post("/api/analyze-photo", response_model=AIFoodResult, status_code=status.HTTP_201_CREATED)
async def analyze_photo(
    user_id: Annotated[int, Form()],
    file: Annotated[UploadFile, File(description="Food photo (JPEG / PNG / WEBP)")],
    meal_type: Annotated[str, Form()] = "any",
    log_date: Annotated[str | None, Form()] = None,
):
    """Upload a food photo. Gemini vision identifies the dish and estimates calories."""
    _require_user(user_id)

    allowed_mime = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    content_type = file.content_type or "image/jpeg"
    if content_type not in allowed_mime:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type: {content_type}. Allowed: {allowed_mime}",
        )

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


# ── 6. Delete food entry ─────────────────────────────────────

@app.delete("/api/food/{log_id}", status_code=status.HTTP_200_OK)
def delete_food(log_id: int, user_id: int):
    """Delete a food log entry. ?user_id=123 is required for authorization."""
    _require_user(user_id)
    deleted = delete_food_log(log_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log entry not found.")
    return {"deleted": True, "log_id": log_id}


# ── 7. Water Tracker ─────────────────────────────────────────

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


# ── 8. Weight History ────────────────────────────────────────

@app.get("/api/weight-history", response_model=list[WeightEntry])
def weight_history(user_id: int):
    _require_user(user_id)
    rows = get_weight_history(user_id)
    return [WeightEntry(weight=r["weight"], date=r["date"]) for r in rows]


# ── 9. Manual Food ───────────────────────────────────────────

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


# ── 10. Barcode Scanner (OpenFoodFacts) ───────────────────────

@app.get("/api/barcode/{barcode}")
async def scan_barcode(barcode: str):
    # Try Russian OpenFoodFacts first, then global
    urls = [
        f"https://ru.openfoodfacts.org/api/v0/product/{barcode}.json",
        f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json",
    ]

    for url in urls:
        try:
            resp = await http_client.get(url, headers={"User-Agent": "CalorieTrackerApp/2.0"})
            if resp.status_code != 200:
                continue

            data = resp.json()
            if data.get("status") != 1:
                continue

            product = data.get("product", {})
            nutriments = product.get("nutriments", {})
            calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal")

            if calories is None:
                continue

            return {
                "food_name": (
                    product.get("product_name_ru")
                    or product.get("product_name")
                    or "Неизвестный продукт"
                ),
                "calories": int(calories or 0),
                "protein": float(nutriments.get("proteins_100g") or 0.0),
                "carbs": float(nutriments.get("carbohydrates_100g") or 0.0),
                "fat": float(nutriments.get("fat_100g") or 0.0),
                "brand": product.get("brands", ""),
                "image_url": product.get("image_url", ""),
                "barcode": barcode,
            }
        except Exception:
            continue

    raise HTTPException(status_code=404, detail="Продукт не найден в базе штрих-кодов")


# ── 11. Search Food ─────────────────────────────────────────

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
    "pringles": "принглс", "milka": "милка", "nutella": "нутелла",
    "miratorg": "мираторг", "vkusvill": "вкусвилл",
    "savushkin": "савушкин", "teos": "теоск", "bonfesto": "бонфесто",
    "lidskae": "лидское", "lidskoe": "лидское", "grod-food": "гродфуд",
    "onega": "онега", "vitba": "витьба", "slodych": "слодыч",
    "spartak": "спартак", "kommunarka": "коммунарка", "domochay": "домочай",
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


LOCAL_DB_CACHE = []
LOCAL_DB_NAMES = []

def _get_local_db():
    global LOCAL_DB_CACHE, LOCAL_DB_NAMES
    if not LOCAL_DB_CACHE:
        local_db_path = os.path.join(os.path.dirname(__file__), "local_db.json")
        if os.path.exists(local_db_path):
            with open(local_db_path, "r", encoding="utf-8") as f:
                LOCAL_DB_CACHE = json.load(f)
            LOCAL_DB_NAMES = [lf["food_name"].lower().replace("ё", "е") for lf in LOCAL_DB_CACHE]
    return LOCAL_DB_CACHE, LOCAL_DB_NAMES


@app.get("/api/search-food")
async def search_food(q: str, user_id: int | None = None):
    q_str = q.strip().lower()
    if not q_str:
        return []

    results = []
    seen = set()

    # 1. Preprocess query (keyboard layout + transliteration)
    q_kb = q_str.translate(ENG_TO_RUS_KEYBOARD)
    words = q_str.split()
    for i, w in enumerate(words):
        if w in ENG_TO_RUS_SOUND:
            words[i] = ENG_TO_RUS_SOUND[w]
    q_syn = " ".join(words)
    queries = list({q_str, q_kb, q_syn})

    # 2. Search user's custom foods first
    if user_id:
        custom_results = search_custom_foods(q_str, limit=5)
        for cr in custom_results:
            fname_lower = cr["food_name"].lower()
            if fname_lower not in seen:
                results.append({
                    "food_name": cr["food_name"],
                    "calories": cr["calories"],
                    "protein": cr["protein"],
                    "carbs": cr["carbs"],
                    "fat": cr["fat"],
                    "brand": "Мой рецепт 🧑‍🍳",
                    "image_url": "",
                    "category": "custom",
                })
                seen.add(fname_lower)

    # 3. Search local DB (fuzzy with ё/е normalization)
    local_foods, local_names = _get_local_db()
    if local_foods:
        scored = []
        for lf, fname_norm in zip(local_foods, local_names):
            best_score = 0
            for query in queries:
                query_norm = query.replace("ё", "е")
                
                score_ts = fuzz.token_set_ratio(query_norm, fname_norm)
                score_w = fuzz.WRatio(query_norm, fname_norm)
                score = max(score_ts, score_w)
                
                if query_norm in fname_norm:
                    score = max(score, 92)
                best_score = max(best_score, score)

            if best_score >= 55:
                scored.append((best_score, lf))

        scored.sort(key=lambda x: x[0], reverse=True)

        for score, lf in scored[:20]:
            fname_lower = lf["food_name"].lower()
            if fname_lower not in seen:
                results.append({
                    "food_name": lf["food_name"],
                    "calories": lf["calories"],
                    "protein": lf["protein"],
                    "carbs": lf["carbs"],
                    "fat": lf["fat"],
                    "brand": lf.get("brand", "Локальная база"),
                    "image_url": "",
                    "category": lf.get("category", ""),
                })
                seen.add(fname_lower)

    # 4. Try OpenFoodFacts (Russian/Belarusian products first)
    q_encoded = urllib.parse.quote(q.strip())
    off_url = (
        f"https://world.openfoodfacts.org/cgi/search.pl"
        f"?search_terms={q_encoded}&search_simple=1&action=process&json=1"
        f"&page_size=15&lc=ru&cc=ru"
    )

    try:
        resp = await http_client.get(off_url, headers={"User-Agent": "CalorieTrackerApp/2.0"})
        if resp.status_code == 200:
            data = resp.json()
            products = data.get("products", [])
            for p in products:
                name = p.get("product_name_ru") or p.get("product_name")
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
                    "category": "",
                })
    except Exception:
        pass

    return results[:30]


# ── 12. Weekly Stats ─────────────────────────────────────────

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
    weekly_protein = [0.0] * 7
    weekly_carbs = [0.0] * 7
    weekly_fat = [0.0] * 7

    for log in all_logs:
        try:
            day_idx = dates.index(log["date"])
            weekly_calories[day_idx] += log["calories"]
            weekly_protein[day_idx] += log["protein"] or 0
            weekly_carbs[day_idx] += log["carbs"] or 0
            weekly_fat[day_idx] += log["fat"] or 0
        except ValueError:
            pass

    streak = update_user_streak(user_id)
    return WeeklyStatsResponse(
        user_id=user_id,
        streak=streak,
        weekly_calories=weekly_calories,
        dates=dates,
        weekly_protein=[round(p, 1) for p in weekly_protein],
        weekly_carbs=[round(c, 1) for c in weekly_carbs],
        weekly_fat=[round(f, 1) for f in weekly_fat],
    )


# ── 13. Favorites ─────────────────────────────────────────────

@app.post("/api/favorites", status_code=status.HTTP_201_CREATED)
def add_to_favorites(body: FavoriteRequest):
    """Add a food item to user's favorites."""
    _require_user(body.user_id)
    fav_id = add_favorite(
        user_id=body.user_id,
        food_name=body.food_name,
        calories=body.calories,
        protein=body.protein,
        carbs=body.carbs,
        fat=body.fat,
        emoji=body.emoji,
    )
    return {"status": "ok", "favorite_id": fav_id}


@app.get("/api/favorites", response_model=list[FavoriteResponse])
def list_favorites(user_id: int):
    """Get user's favorite foods."""
    _require_user(user_id)
    favs = get_favorites(user_id)
    return [FavoriteResponse(**f) for f in favs]


@app.delete("/api/favorites/{favorite_id}", status_code=status.HTTP_200_OK)
def delete_favorite(favorite_id: int, user_id: int):
    """Remove a food from favorites."""
    _require_user(user_id)
    deleted = remove_favorite(favorite_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"deleted": True}


@app.get("/api/favorites/check")
def check_favorite(user_id: int, food_name: str):
    """Check if a food is in user's favorites."""
    _require_user(user_id)
    fav_id = is_favorite(user_id, food_name)
    return {"is_favorite": fav_id is not None, "favorite_id": fav_id}


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
