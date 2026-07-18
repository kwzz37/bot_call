import React, { useState } from 'react';
import { CircularProgress } from '../components/CircularProgress';
import { FoodCard, FoodItem } from '../components/FoodCard';
import { Flame, Droplets, Wheat, Beef, Plus } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { logWater } from '../api';

const INITIAL_FOODS: FoodItem[] = [
    {
        id: '1',
        name: 'Овсяная каша с бананом',
        calories: 380,
        protein: 12,
        carbs: 65,
        fat: 6,
        time: '08:30',
        emoji: '🥣',
    },
    {
        id: '2',
        name: 'Куриная грудка с рисом',
        calories: 480,
        protein: 45,
        carbs: 42,
        fat: 8,
        time: '13:15',
        emoji: '🍗',
    },
    {
        id: '3',
        name: 'Греческий йогурт',
        calories: 130,
        protein: 18,
        carbs: 8,
        fat: 3,
        time: '16:00',
        emoji: '🥛',
    },
    {
        id: '4',
        name: 'Зелёный яблочный смузи',
        calories: 160,
        protein: 3,
        carbs: 35,
        fat: 1,
        time: '17:30',
        emoji: '🥤',
    },
];

const DAILY_GOAL = 2500;

interface DashboardProps {
    foods: FoodItem[];
    onDeleteFood: (id: string) => void;
    calorieGoal?: number;
    waterMl?: number;
    setWaterMl?: React.Dispatch<React.SetStateAction<number>>;
}

export const Dashboard: React.FC<DashboardProps> = ({ foods, onDeleteFood, calorieGoal = DAILY_GOAL, waterMl = 0, setWaterMl }) => {
    const { user, tapImpact } = useTelegram();

    const handleAddWater = async () => {
        if (!user?.id || !setWaterMl) return;
        tapImpact();
        try {
            await logWater(user.id, 250);
            setWaterMl(prev => prev + 250);
        } catch (e) {
            console.error('Failed to log water', e);
        }
    };

    const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);
    const totalProtein = foods.reduce((sum, f) => sum + (f.protein ?? 0), 0);
    const totalCarbs = foods.reduce((sum, f) => sum + (f.carbs ?? 0), 0);
    const totalFat = foods.reduce((sum, f) => sum + (f.fat ?? 0), 0);

    const firstName = user?.first_name ?? 'Привет';

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
            {/* Header */}
            <div className="px-5 pt-6 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400 font-medium">Добрый день,</p>
                        <h1 className="text-2xl font-bold text-gray-800">{firstName} 👋</h1>
                    </div>
                    <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-sky-50">
                        <Flame size={20} className="text-sky-500" />
                    </div>
                </div>

                {/* Date */}
                <p className="text-sm text-gray-400 mt-1">
                    {new Date().toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                    })}
                </p>
            </div>

            {/* Circular Progress Card */}
            <div className="mx-5 mb-5">
                <div className="card flex flex-col items-center py-7">
                    <CircularProgress current={totalCalories} goal={calorieGoal} />
                </div>
            </div>

            {/* Macro Stats */}
            <div className="mx-5 mb-5">
                <div className="grid grid-cols-3 gap-3">
                    <div className="card flex flex-col items-center py-4">
                        <Beef size={18} className="text-blue-400 mb-2" />
                        <p className="text-lg font-bold text-gray-800">{totalProtein}г</p>
                        <p className="text-xs text-gray-400 font-medium">Белки</p>
                    </div>
                    <div className="card flex flex-col items-center py-4">
                        <Wheat size={18} className="text-amber-400 mb-2" />
                        <p className="text-lg font-bold text-gray-800">{totalCarbs}г</p>
                        <p className="text-xs text-gray-400 font-medium">Углеводы</p>
                    </div>
                    <div className="card flex flex-col items-center py-4">
                        <Droplets size={18} className="text-rose-400 mb-2" />
                        <p className="text-lg font-bold text-gray-800">{totalFat}г</p>
                        <p className="text-xs text-gray-400 font-medium">Жиры</p>
                    </div>
                </div>
            </div>

            {/* Water Tracker */}
            <div className="mx-5 mb-5">
                <div className="card flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50">
                            <Droplets size={24} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Вода</p>
                            <p className="text-sm text-gray-400">{waterMl} мл выпито</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAddWater}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all"
                    >
                        <Plus size={16} />
                        250 мл
                    </button>
                </div>
            </div>

            {/* Food List */}
            <div className="px-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Сегодня</h2>
                    <span className="text-sm text-gray-400">{foods.length} приёмов пищи</span>
                </div>

                {foods.length === 0 ? (
                    <div className="card flex flex-col items-center py-10 text-center">
                        <span className="text-5xl mb-3">🍽️</span>
                        <p className="font-semibold text-gray-600">Пока пусто</p>
                        <p className="text-sm text-gray-400 mt-1">Добавьте первый приём пищи</p>
                    </div>
                ) : (
                    foods.map((item) => (
                        <FoodCard key={item.id} item={item} onDelete={onDeleteFood} />
                    ))
                )}
            </div>
        </div>
    );
};

export { INITIAL_FOODS, DAILY_GOAL };
