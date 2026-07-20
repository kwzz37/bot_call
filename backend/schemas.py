"""
schemas.py — Pydantic request/response schemas for Calorie Tracker API
"""

from pydantic import BaseModel
from typing import Optional


# ─────────────────────────── User ───────────────────────────

class UserInitRequest(BaseModel):
    user_id: int
    first_name: Optional[str] = None
    username: Optional[str] = None
    calorie_goal: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None


class UserUpdateRequest(BaseModel):
    calorie_goal: Optional[int] = None
    protein_goal: Optional[float] = None
    carbs_goal: Optional[float] = None
    fat_goal: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    goal_type: Optional[str] = None
    activity_level: Optional[str] = None
    water_goal: Optional[int] = None


class OnboardingRequest(BaseModel):
    user_id: int
    weight: float
    height: float
    age: int
    gender: str           # 'male' | 'female'
    goal_type: str        # 'lose' | 'maintain' | 'gain'
    activity_level: str   # 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'


class OnboardingResponse(BaseModel):
    bmr: int
    tdee: int
    calorie_goal: int
    protein_goal: int
    carbs_goal: int
    fat_goal: int
    water_goal: int


# ─────────────────────────── Food ───────────────────────────

class FoodEntry(BaseModel):
    id: int
    food_name: str
    calories: int
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    emoji: Optional[str] = None
    source: str
    meal_type: str
    logged_at: str


class AIFoodResult(BaseModel):
    log_id: int
    food: str
    calories: int
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    emoji: Optional[str] = None


class AddTextRequest(BaseModel):
    user_id: int
    text: str
    meal_type: str = 'any'
    log_date: Optional[str] = None


class ManualFoodRequest(BaseModel):
    user_id: int
    food_name: str
    calories: int
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    emoji: Optional[str] = None
    meal_type: str = 'any'
    log_date: Optional[str] = None


class CustomFoodRequest(BaseModel):
    user_id: int
    food_name: str
    calories: float
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0


# ─────────────────────────── Favorites ───────────────────────────

class FavoriteRequest(BaseModel):
    user_id: int
    food_name: str
    calories: float
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0
    emoji: str = '🍽️'


class FavoriteResponse(BaseModel):
    id: int
    food_name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    emoji: str


# ─────────────────────────── Water ───────────────────────────

class WaterEntry(BaseModel):
    id: int
    amount_ml: int
    logged_at: str


class WaterAddRequest(BaseModel):
    user_id: int
    amount_ml: int


# ─────────────────────────── Weight ───────────────────────────

class WeightEntry(BaseModel):
    weight: float
    date: str


# ─────────────────────────── Stats ───────────────────────────

class StatsResponse(BaseModel):
    user_id: int
    date: str
    total_calories: int
    calorie_goal: int
    total_protein: float
    total_carbs: float
    total_fat: float
    water_ml: int
    water_goal: int
    streak: int
    entries: list[FoodEntry]
    water_entries: list[WaterEntry]
    protein_goal: Optional[float] = None
    carbs_goal: Optional[float] = None
    fat_goal: Optional[float] = None
    setup_complete: int = 0


class WeeklyStatsResponse(BaseModel):
    user_id: int
    streak: int
    weekly_calories: list[int]
    dates: list[str]
    weekly_protein: Optional[list[float]] = None
    weekly_carbs: Optional[list[float]] = None
    weekly_fat: Optional[list[float]] = None
