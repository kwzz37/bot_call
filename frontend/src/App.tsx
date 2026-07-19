import React, { useEffect, useState } from 'react';
import { Dashboard, INITIAL_FOODS } from './screens/Dashboard';
import { AddFood } from './screens/AddFood';
import { Profile } from './screens/Profile';
import { ProgressScreen } from './screens/ProgressScreen';
import { BottomNav } from './components/BottomNav';
import { Toast, ToastMessage } from './components/Toast';
import { FoodItem } from './components/FoodCard';
import { useTelegram } from './hooks/useTelegram';
import { ThemeProvider } from './contexts/ThemeContext';
import { initUser, getStats } from './api';

type Screen = 'dashboard' | 'progress' | 'add' | 'profile';

interface UserGoals {
    calorieGoal: number;
    proteinGoal: number;
    carbsGoal: number;
    fatGoal: number;
    weight: number;
    height: number;
    age: number;
}

function AppInner() {
    const { user } = useTelegram();
    const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
    const [foods, setFoods] = useState<FoodItem[]>(INITIAL_FOODS);
    const [goals, setGoals] = useState<UserGoals>({
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 250,
        fatGoal: 65,
        weight: 70,
        height: 175,
        age: 25,
    });
    const [waterMl, setWaterMl] = useState(0);
    const [streak, setStreak] = useState(0);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedMealType, setSelectedMealType] = useState<string>('any');

    const pushToast = (text: string, type: ToastMessage['type'] = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, text, type }]);
    };

    const dismissToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    useEffect(() => {
        if (!user) return;
        initUser({
            user_id: user.id,
            first_name: user.first_name,
            username: user.username,
        })
            .then(() => getStats(user.id, selectedDate))
            .then((stats) => {
                setGoals(g => ({ ...g, calorieGoal: stats.calorie_goal }));
                setWaterMl(stats.water_ml ?? 0);
                setStreak(stats.streak ?? 0);
                const mapped: FoodItem[] = stats.entries.map((e) => ({
                    id: String(e.id),
                    name: e.food_name,
                    calories: e.calories,
                    protein: e.protein ?? undefined,
                    carbs: e.carbs ?? undefined,
                    fat: e.fat ?? undefined,
                    emoji: e.emoji ?? undefined,
                    time: e.logged_at.slice(11, 16),
                    meal_type: e.meal_type,
                }));
                setFoods(mapped);
            })
            .catch((err) => {
                console.warn('Backend not reachable, running in offline mode:', err);
            });
    }, [user?.id, selectedDate]);

    const handleAddFood = (item: FoodItem) => {
        setFoods((prev) => [item, ...prev]);
        pushToast(`✅ Добавлено: ${item.name} — ${item.calories} ккал`);
        setActiveScreen('dashboard');
    };

    const handleDeleteFood = (id: string) => {
        setFoods((prev) => prev.filter((f) => f.id !== id));
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
            <div key={activeScreen} className="animate-fade-in">
                {activeScreen === 'dashboard' && (
                    <Dashboard
                        foods={foods}
                        onDeleteFood={handleDeleteFood}
                        calorieGoal={goals.calorieGoal}
                        waterMl={waterMl}
                        setWaterMl={setWaterMl}
                        streak={streak}
                        proteinGoal={goals.proteinGoal}
                        carbsGoal={goals.carbsGoal}
                        fatGoal={goals.fatGoal}
                        onOpenProfile={() => setActiveScreen('profile')}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        onAddMeal={(meal) => {
                            setSelectedMealType(meal);
                            setActiveScreen('add');
                        }}
                    />
                )}
                {activeScreen === 'progress' && (
                    <ProgressScreen calorieGoal={goals.calorieGoal} />
                )}
                {activeScreen === 'add' && (
                    <AddFood
                        onAdd={handleAddFood}
                        onBack={() => setActiveScreen('dashboard')}
                        selectedDate={selectedDate}
                        selectedMealType={selectedMealType}
                        setSelectedMealType={setSelectedMealType}
                    />
                )}
                {activeScreen === 'profile' && (
                    <Profile
                        goals={goals}
                        onGoalsChange={(g) => setGoals(prev => ({ ...prev, ...g }))}
                    />
                )}
            </div>
            <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
            <Toast toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AppInner />
        </ThemeProvider>
    );
}

export default App;
