from pydantic import BaseModel, Field

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

class WaterEntry(BaseModel):
    id: int
    amount_ml: int
    logged_at: str

class StatsResponse(BaseModel):
    user_id: int
    date: str
    total_calories: int
    calorie_goal: int
    total_protein: float
    total_carbs: float
    total_fat: float
    water_ml: int = 0
    streak: int = 0
    entries: list[FoodEntry]
    water_entries: list[WaterEntry] = []

class AIFoodResult(BaseModel):
    food: str
    calories: int
    protein: float | None = None
    carbs: float | None = None
    fat: float | None = None
    emoji: str | None = None
    log_id: int

class WaterAddRequest(BaseModel):
    user_id: int
    amount_ml: int = Field(ge=1, le=5000)

class WeightEntry(BaseModel):
    weight: float
    date: str

class ManualFoodRequest(BaseModel):
    user_id: int
    food_name: str = Field(min_length=1, max_length=100)
    calories: int = Field(ge=0, le=10000)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    emoji: str | None = None

class WeeklyStatsResponse(BaseModel):
    user_id: int
    streak: int
    weekly_calories: list[int]
    dates: list[str]
