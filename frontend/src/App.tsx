import React, { useEffect, useState } from 'react';
import { Dashboard, INITIAL_FOODS } from './screens/Dashboard';
import { AddFood } from './screens/AddFood';
import { Profile } from './screens/Profile';
import { BottomNav } from './components/BottomNav';
import { FoodItem } from './components/FoodCard';
import { useTelegram } from './hooks/useTelegram';
import { initUser, getStats } from './api';

type Screen = 'dashboard' | 'add' | 'profile';

function App() {
    const { user } = useTelegram();
    const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
    const [foods, setFoods] = useState<FoodItem[]>(INITIAL_FOODS);
    const [calorieGoal, setCalorieGoal] = useState(2500);
    const [apiReady, setApiReady] = useState(false);

    // Initialize user with backend on mount
    useEffect(() => {
        if (!user) return;

        initUser({
            user_id: user.id,
            first_name: user.first_name,
            username: user.username,
        })
            .then(() => {
                // Load today's real food log from backend
                return getStats(user.id);
            })
            .then((stats) => {
                setCalorieGoal(stats.calorie_goal);
                // Map backend entries to FoodItem shape
                const mapped: FoodItem[] = stats.entries.map((e) => ({
                    id: String(e.id),
                    name: e.food_name,
                    calories: e.calories,
                    protein: e.protein ?? undefined,
                    carbs: e.carbs ?? undefined,
                    fat: e.fat ?? undefined,
                    emoji: e.emoji ?? undefined,
                    time: e.logged_at.slice(11, 16), // "HH:MM"
                }));
                setFoods(mapped);
                setApiReady(true);
            })
            .catch((err) => {
                console.warn('Backend not reachable, running in offline mode:', err);
                setApiReady(false);
            });
    }, [user?.id]);

    const handleAddFood = (item: FoodItem) => {
        setFoods((prev) => [item, ...prev]);
    };

    const handleDeleteFood = (id: string) => {
        setFoods((prev) => prev.filter((f) => f.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-50 relative">
            <div key={activeScreen} className="animate-fade-in">
                {activeScreen === 'dashboard' && (
                    <Dashboard
                        foods={foods}
                        onDeleteFood={handleDeleteFood}
                        calorieGoal={calorieGoal}
                    />
                )}
                {activeScreen === 'add' && (
                    <AddFood
                        onAdd={handleAddFood}
                        onBack={() => setActiveScreen('dashboard')}
                    />
                )}
                {activeScreen === 'profile' && <Profile />}
            </div>
            <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
        </div>
    );
}

export default App;
