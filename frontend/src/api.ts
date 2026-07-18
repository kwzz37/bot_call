/// <reference types="vite/client" />
/**
 * api.ts — Typed client for the Calorie Tracker backend
 */

const BASE_URL = import.meta.env?.VITE_API_URL ?? '';

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
    streak: number;
    entries: FoodEntry[];
    water_entries: WaterEntry[];
}

export interface WeeklyStatsResponse {
    user_id: number;
    streak: number;
    weekly_calories: number[];
    dates: string[];
}

export interface WeightEntry {
    weight: number;
    date: string;
}

export interface UserProfile {
    user_id: number;
    calorie_goal: number;
    weight: number | null;
    height: number | null;
    age: number | null;
    gender: string | null;
    first_name: string | null;
    username: string | null;
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

// ─── Helpers ──────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...init?.headers },
        ...init,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? 'API error');
    }
    return res.json() as Promise<T>;
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

/** Update user goals/metrics. */
export async function updateUser(
    userId: number,
    patch: { calorie_goal?: number; weight?: number; height?: number; age?: number; gender?: string }
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
export async function addByText(userId: number, text: string): Promise<AIFoodResult> {
    return request<AIFoodResult>('/api/add-text', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, text }),
    });
}

/** Upload a food photo; Gemini identifies the dish. */
export async function analyzePhoto(userId: number, file: File): Promise<AIFoodResult> {
    const form = new FormData();
    form.append('user_id', String(userId));
    form.append('file', file);
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
export async function logWater(userId: number, amountMl: number): Promise<{log_id: number}> {
    return request<{log_id: number}>('/api/water', {
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

/** Scan barcode. */
export async function scanBarcode(barcode: string): Promise<AIFoodResult> {
    return request<AIFoodResult>(`/api/barcode/${barcode}`);
}

/** Fetch weekly stats. */
export async function getWeeklyStats(userId: number): Promise<WeeklyStatsResponse> {
    return request<WeeklyStatsResponse>(`/api/stats/weekly?user_id=${userId}`);
}
