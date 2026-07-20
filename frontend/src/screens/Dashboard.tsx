import React, { useState } from 'react';
import { CircularProgress } from '../components/CircularProgress';
import { FoodCard, FoodItem } from '../components/FoodCard';
import { Droplets, Zap, Beef, Wheat, FlameKindling, Plus, Minus, ChevronLeft } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { logWater } from '../api';

const DAILY_GOAL = 2500;
const WATER_GOAL = 2000;

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 6) return 'Доброй ночи 🌙';
    if (h < 12) return 'Доброе утро ☀️';
    if (h < 17) return 'Добрый день 🌤';
    if (h < 22) return 'Добрый вечер 🌆';
    return 'Добрый вечер 🌙';
}

const MEALS_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEALS_LABELS: Record<string, string> = {
    'breakfast': 'Завтрак 🍳',
    'lunch': 'Обед 🍽️',
    'dinner': 'Ужин 🌙',
    'snack': 'Перекус 🍎',
    'any': 'Разное 🥗'
};

function groupFoodByMeal(foods: FoodItem[]): Record<string, FoodItem[]> {
    const groups: Record<string, FoodItem[]> = {
        'breakfast': [],
        'lunch': [],
        'dinner': [],
        'snack': [],
        'any': [],
    };
    foods.forEach(f => {
        const type = f.meal_type || 'any';
        if (groups[type]) {
            groups[type].push(f);
        } else {
            groups['any'].push(f);
        }
    });
    return groups;
}

interface DashboardProps {
    foods: FoodItem[];
    onDeleteFood: (id: string) => void;
    calorieGoal?: number;
    waterMl?: number;
    setWaterMl?: React.Dispatch<React.SetStateAction<number>>;
    streak?: number;
    proteinGoal?: number;
    carbsGoal?: number;
    fatGoal?: number;
    onOpenProfile?: () => void;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    onAddMeal: (mealType: string) => void;
    waterGoal?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
    foods,
    onDeleteFood,
    calorieGoal = DAILY_GOAL,
    waterMl = 0,
    setWaterMl,
    streak = 0,
    proteinGoal = 150,
    carbsGoal = 250,
    fatGoal = 70,
    waterGoal = WATER_GOAL,
    onOpenProfile,
    selectedDate,
    setSelectedDate,
    onAddMeal,
}) => {
    const { user, tapImpact } = useTelegram();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const handleAddWater = async (ml: number) => {
        if (!user?.id || !setWaterMl) return;
        tapImpact();
        try {
            await logWater(user.id, ml);
            setWaterMl(prev => prev + ml);
        } catch (e) {
            console.error('Failed to log water', e);
        }
    };

    const totalCalories = foods.reduce((s, f) => s + f.calories, 0);
    const totalProtein = foods.reduce((s, f) => s + (f.protein ?? 0), 0);
    const totalCarbs = foods.reduce((s, f) => s + (f.carbs ?? 0), 0);
    const totalFat = foods.reduce((s, f) => s + (f.fat ?? 0), 0);

    const waterPct = Math.min((waterMl / WATER_GOAL) * 100, 100);
    const firstName = user?.first_name ?? 'друг';

    const grouped = groupFoodByMeal(foods);

    const MacroBar = ({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) => {
        const pct = Math.min((value / goal) * 100, 100);
        return (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{value}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{goal}г</span></span>
                </div>
                <div className="macro-bar-track">
                    <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">

            {/* ── Header ── */}
            <div className="px-5 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{getGreeting()}</p>
                        <h1 className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{firstName}!</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {streak > 0 && (
                            <div
                                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
                                style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 4px 12px rgba(249,115,22,0.35)' }}
                            >
                                <FlameKindling size={16} className="text-white" />
                                <span className="text-white text-sm font-bold">{streak}</span>
                            </div>
                        )}
                        <button onClick={onOpenProfile} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 active:scale-95 transition-transform">
                            <Zap size={20} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                    </div>
                </div>
                
                {/* ── Date Ribbon ── */}
                <div className="flex items-center justify-between mt-4 bg-white/50 dark:bg-black/20 p-2 rounded-2xl backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-sm">
                    <button 
                        onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() - 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }}
                        className="p-2 rounded-xl active:bg-black/5 dark:active:bg-white/10 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-500" />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {selectedDate === new Date().toISOString().split('T')[0] 
                                ? 'Сегодня' 
                                : new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                            {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long' })}
                        </span>
                    </div>

                    <button 
                        onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() + 1);
                            const nextDateStr = d.toISOString().split('T')[0];
                            const todayStr = new Date().toISOString().split('T')[0];
                            if (nextDateStr <= todayStr) {
                                setSelectedDate(nextDateStr);
                            }
                        }}
                        disabled={selectedDate === new Date().toISOString().split('T')[0]}
                        className={`p-2 rounded-xl transition-colors ${selectedDate === new Date().toISOString().split('T')[0] ? 'opacity-30' : 'active:bg-black/5 dark:active:bg-white/10'}`}
                    >
                        <ChevronLeft size={20} className="text-gray-500 rotate-180" />
                    </button>
                </div>
            </div>

            {/* ── Calorie Ring ── */}
            <div className="mx-5 mb-4">
                <div className="card flex flex-col items-center py-6">
                    <CircularProgress current={totalCalories} goal={calorieGoal} />
                </div>
            </div>

            {/* ── Macros ── */}
            <div className="mx-5 mb-4">
                <div className="card space-y-3">
                    <MacroBar label="Белки" value={totalProtein} goal={proteinGoal} color="#60a5fa" />
                    <MacroBar label="Углеводы" value={totalCarbs} goal={carbsGoal} color="#fbbf24" />
                    <MacroBar label="Жиры" value={totalFat} goal={fatGoal} color="#f87171" />
                </div>
            </div>

            {/* ── Water ── */}
            <div className="mx-5 mb-4">
                <div className="card">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.15)' }}>
                                <Droplets size={18} style={{ color: 'var(--water)' }} />
                            </div>
                            <div>
                                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Вода</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{waterMl} / {WATER_GOAL} мл</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold" style={{ color: 'var(--water)' }}>{Math.round(waterPct)}%</span>
                    </div>
                    <div className="macro-bar-track mb-3">
                        <div className="macro-bar-fill" style={{ width: `${waterPct}%`, background: 'var(--water)' }} />
                    </div>
                    <div className="flex gap-2">
                        {[150, 250, 500].map(ml => (
                            <button
                                key={ml}
                                onClick={() => handleAddWater(ml)}
                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                                style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--water)' }}
                            >
                                +{ml}мл
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Food log ── */}
            <div className="px-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Приёмы пищи</h2>
                    <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                        {foods.length} записей
                    </span>
                </div>

                {MEALS_ORDER.map(mealKey => {
                    const items = grouped[mealKey] || [];
                    const isOpen = !collapsed[mealKey];
                    const mealCals = items.reduce((s, i) => s + i.calories, 0);
                    
                    // Don't show "any" if it's empty
                    if (mealKey === 'any' && items.length === 0) return null;

                    return (
                        <div key={mealKey} className="mb-4 bg-white dark:bg-[#1c1c1e] rounded-2xl p-3 shadow-sm border border-black/5 dark:border-white/5">
                            <button
                                className="flex items-center justify-between w-full mb-2 transition-all active:scale-[0.98]"
                                onClick={() => setCollapsed(p => ({ ...p, [mealKey]: !p[mealKey] }))}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {MEALS_LABELS[mealKey]}
                                    </span>
                                    {mealCals > 0 && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                                            {mealCals} ккал
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400">
                                    {isOpen ? 'Скрыть' : 'Раскрыть'}
                                </span>
                            </button>
                            
                            {isOpen && (
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <FoodCard key={item.id} item={item} onDelete={onDeleteFood} />
                                    ))}
                                    <button 
                                        onClick={() => onAddMeal(mealKey)}
                                        className="w-full py-3 mt-1 rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-900 text-sky-500 dark:text-sky-400 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-sky-50 dark:hover:bg-sky-900/20"
                                    >
                                        <Plus size={16} /> Добавить {MEALS_LABELS[mealKey].split(' ')[0].toLowerCase()}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export { DAILY_GOAL };
export const INITIAL_FOODS: FoodItem[] = [];
