/// <reference types="vite/client" />
/**
 * api.ts — Typed client for the Calorie Tracker backend
 */

const BASE_URL = import.meta.env?.VITE_API_URL || 'https://bot-call-wftl.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────

export interface FoodEntry {
    id: number;
    food_name: string;
    calories: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    emoji: string | null;
    source: string;
    meal_type: string;
    logged_at: string;
}

export interface WaterEntry {
    id: number;
    amount_ml: number;
    logged_at: string;
}

export interface StatsResponse {
    user_id: number;
    date: string;
    total_calories: number;
    calorie_goal: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    water_ml: number;
    water_goal: number;
    streak: number;
    entries: FoodEntry[];
    water_entries: WaterEntry[];
    protein_goal?: number | null;
    carbs_goal?: number | null;
    fat_goal?: number | null;
    setup_complete?: number;
}

export interface WeeklyStatsResponse {
    user_id: number;
    streak: number;
    weekly_calories: number[];
    dates: string[];
    weekly_protein?: number[];
    weekly_carbs?: number[];
    weekly_fat?: number[];
}

export interface WeightEntry {
    weight: number;
    date: string;
}

export interface UserProfile {
    user_id: number;
    calorie_goal: number;
    protein_goal?: number | null;
    carbs_goal?: number | null;
    fat_goal?: number | null;
    weight?: number | null;
    height?: number | null;
    age?: number | null;
    gender?: string | null;
    goal_type?: string | null;
    activity_level?: string | null;
    water_goal?: number | null;
    setup_complete?: number;
    first_name?: string | null;
    username?: string | null;
    created_at: string;
}

export interface AIFoodResult {
    food: string;
    calories: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    emoji: string | null;
    log_id: number;
}

export interface FoodSearchResult {
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    brand: string;
    image_url: string;
    category?: string;
}

export interface FavoriteItem {
    id: number;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    emoji: string;
}

export interface OnboardingRequest {
    user_id: number;
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
    goal_type: 'lose' | 'maintain' | 'gain';
    activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface OnboardingResponse {
    bmr: number;
    tdee: number;
    calorie_goal: number;
    protein_goal: number;
    carbs_goal: number;
    fat_goal: number;
    water_goal: number;
}

export interface RecentFoodResult {
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    emoji: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            headers: { 'Content-Type': 'application/json', ...init?.headers },
            signal: controller.signal,
            ...init,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail ?? 'API error');
        }
        return res.json() as Promise<T>;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// ─── API calls ────────────────────────────────────────────────────────

/** Called on Mini App launch to register / sync the Telegram user. */
export async function initUser(params: {
    user_id: number;
    first_name?: string;
    username?: string;
    calorie_goal?: number;
}): Promise<UserProfile> {
    return request<UserProfile>('/api/init-user', {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

/** Complete onboarding: send user parameters, get calculated goals. */
export async function completeOnboarding(data: OnboardingRequest): Promise<OnboardingResponse> {
    return request<OnboardingResponse>('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/** Update user goals/metrics. */
export async function updateUser(
    userId: number,
    patch: {
        calorie_goal?: number;
        protein_goal?: number;
        carbs_goal?: number;
        fat_goal?: number;
        weight?: number;
        height?: number;
        age?: number;
        gender?: string;
        goal_type?: string;
        activity_level?: string;
        water_goal?: number;
    }
): Promise<{ calorie_goal: number; weight: number }> {
    return request(`/api/user/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
    });
}

/** Fetch today's stats (or a specific date). */
export async function getStats(userId: number, date?: string): Promise<StatsResponse> {
    const params = new URLSearchParams({ user_id: String(userId) });
    if (date) params.set('date', date);
    return request<StatsResponse>(`/api/stats?${params}`);
}

/** Add food by text description; Gemini infers calories. */
export async function addByText(
    userId: number,
    text: string,
    mealType: string = 'any',
    logDate?: string
): Promise<AIFoodResult> {
    return request<AIFoodResult>('/api/add-text', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, text, meal_type: mealType, log_date: logDate }),
    });
}

/** Upload a food photo; Gemini identifies the dish. */
export async function analyzePhoto(
    userId: number,
    file: File,
    mealType: string = 'any',
    logDate?: string
): Promise<AIFoodResult> {
    const form = new FormData();
    form.append('user_id', String(userId));
    form.append('file', file);
    form.append('meal_type', mealType);
    if (logDate) form.append('log_date', logDate);
    const res = await fetch(`${BASE_URL}/api/analyze-photo`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? 'API error');
    }
    return res.json() as Promise<AIFoodResult>;
}

/** Delete a food log entry. */
export async function deleteFood(logId: number, userId: number): Promise<void> {
    await request(`/api/food/${logId}?user_id=${userId}`, { method: 'DELETE' });
}

/** Log water. */
export async function logWater(userId: number, amountMl: number): Promise<{ log_id: number }> {
    return request<{ log_id: number }>('/api/water', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, amount_ml: amountMl }),
    });
}

/** Remove water. */
export async function removeWater(logId: number, userId: number): Promise<void> {
    await request(`/api/water/${logId}?user_id=${userId}`, { method: 'DELETE' });
}

/** Fetch weight history. */
export async function getWeightHistory(userId: number): Promise<WeightEntry[]> {
    return request<WeightEntry[]>(`/api/weight-history?user_id=${userId}`);
}

/** Scan barcode — returns product info from OpenFoodFacts. */
export async function scanBarcode(barcode: string): Promise<FoodSearchResult> {
    return request<FoodSearchResult>(`/api/barcode/${barcode}`);
}

export async function getWeeklyStats(userId: number): Promise<WeeklyStatsResponse> {
    return request<WeeklyStatsResponse>(`/api/stats/weekly?user_id=${userId}`);
}

/** Search food in local DB + OpenFoodFacts. */
export async function searchFood(query: string, userId?: number): Promise<FoodSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (userId) params.set('user_id', String(userId));
    return request<FoodSearchResult[]>(`/api/search-food?${params}`);
}

/** Add food manually. */
export async function addManual(
    userId: number,
    food: Partial<FoodSearchResult> & { grams?: number },
    mealType: string = 'any',
    logDate?: string
): Promise<AIFoodResult> {
    const grams = food.grams ?? 100;
    const factor = grams / 100;
    return request<AIFoodResult>('/api/add-manual', {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            food_name: food.food_name || 'Неизвестно',
            calories: Math.round((food.calories || 0) * factor),
            protein: Math.round(((food.protein || 0) * factor) * 10) / 10,
            carbs: Math.round(((food.carbs || 0) * factor) * 10) / 10,
            fat: Math.round(((food.fat || 0) * factor) * 10) / 10,
            emoji: '🍽️',
            meal_type: mealType,
            log_date: logDate,
        }),
    });
}

/** Create a custom food / recipe */
export async function createCustomFood(
    userId: number,
    food: { food_name: string; calories: number; protein: number; carbs: number; fat: number; }
): Promise<{ status: string; custom_food_id: number }> {
    return request('/api/custom-food', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, ...food }),
    });
}

/** Fetch recent foods */
export async function getRecentFoods(userId: number): Promise<RecentFoodResult[]> {
    return request<RecentFoodResult[]>(`/api/recent-foods?user_id=${userId}`);
}

// ─── Favorites ────────────────────────────────────────────────────────

/** Get user's favorite foods */
export async function getFavorites(userId: number): Promise<FavoriteItem[]> {
    return request<FavoriteItem[]>(`/api/favorites?user_id=${userId}`);
}

/** Add food to favorites */
export async function addFavorite(
    userId: number,
    food: { food_name: string; calories: number; protein: number; carbs: number; fat: number; emoji?: string }
): Promise<{ status: string; favorite_id: number }> {
    return request('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            food_name: food.food_name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            emoji: food.emoji || '🍽️',
        }),
    });
}

/** Remove food from favorites */
export async function removeFavorite(favoriteId: number, userId: number): Promise<void> {
    await request(`/api/favorites/${favoriteId}?user_id=${userId}`, { method: 'DELETE' });
}

/** Check if food is in favorites */
export async function checkFavorite(
    userId: number,
    foodName: string
): Promise<{ is_favorite: boolean; favorite_id: number | null }> {
    const params = new URLSearchParams({ user_id: String(userId), food_name: foodName });
    return request(`/api/favorites/check?${params}`);
}
