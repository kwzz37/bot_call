import React, { useEffect, useState, useCallback } from 'react';
import { Dashboard, INITIAL_FOODS } from './screens/Dashboard';
import { AddFood } from './screens/AddFood';
import { Profile } from './screens/Profile';
import { ProgressScreen } from './screens/ProgressScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { BottomNav } from './components/BottomNav';
import { Toast, ToastMessage } from './components/Toast';
import { FoodItem } from './components/FoodCard';
import { useTelegram } from './hooks/useTelegram';
import { ThemeProvider } from './contexts/ThemeContext';
import { initUser, getStats, completeOnboarding } from './api';

type Screen = 'dashboard' | 'progress' | 'add' | 'profile';

interface UserGoals {
    calorieGoal: number;
    proteinGoal: number;
    carbsGoal: number;
    fatGoal: number;
    waterGoal: number;
    weight: number;
    height: number;
    age: number;
    gender: string;
    goalType: string;
    activityLevel: string;
}

function AppInner() {
    const { user } = useTelegram();
    const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
    const [foods, setFoods] = useState<FoodItem[]>(INITIAL_FOODS);
    const [goals, setGoals] = useState<UserGoals>({
        calorieGoal: 2000,
        proteinGoal: 120,
        carbsGoal: 200,
        fatGoal: 55,
        waterGoal: 2000,
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male',
        goalType: 'maintain',
        activityLevel: 'light',
    });
    const [waterMl, setWaterMl] = useState(0);
    const [streak, setStreak] = useState(0);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [appReady, setAppReady] = useState(false);

    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedMealType, setSelectedMealType] = useState<string>('any');

    // ── Keyboard-aware bottom nav ──────────────────────────────
    useEffect(() => {
        if (!window.visualViewport) return;

        const handleResize = () => {
            const viewport = window.visualViewport!;
            const windowHeight = window.innerHeight;
            const viewportHeight = viewport.height;
            // If visible viewport is significantly smaller than window → keyboard is open
            const keyboardOpen = windowHeight - viewportHeight > 150;
            document.documentElement.classList.toggle('keyboard-open', keyboardOpen);
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, []);

    // ── Toast helpers ──────────────────────────────────────────
    const pushToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, text, type }]);
        // Auto-dismiss after 3s
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ── Init user & load stats ─────────────────────────────────
    useEffect(() => {
        if (!user) return;

        initUser({
            user_id: user.id,
            first_name: user.first_name,
            username: user.username,
        })
            .then((profile) => {
                const setupDone = (profile.setup_complete === 1) && 
                                  (profile.weight && profile.weight > 0) &&
                                  (profile.height && profile.height > 0);

                if (!setupDone) {
                    const savedProfileStr = localStorage.getItem('saved_user_profile');
                    if (savedProfileStr) {
                        try {
                            const saved = JSON.parse(savedProfileStr);
                            const restoredGoals = {
                                calorieGoal: saved.calorieGoal || saved.calorie_goal || 2000,
                                proteinGoal: saved.proteinGoal || saved.protein_goal || 150,
                                carbsGoal: saved.carbsGoal || saved.carbs_goal || 200,
                                fatGoal: saved.fatGoal || saved.fat_goal || 65,
                                waterGoal: saved.waterGoal || saved.water_goal || 2000,
                                weight: saved.weight || 70,
                                height: saved.height || 175,
                                age: saved.age || 25,
                                gender: saved.gender || 'male',
                                goalType: saved.goalType || saved.goal_type || 'maintain',
                                activityLevel: saved.activityLevel || saved.activity_level || 'moderate',
                            };

                            setGoals(restoredGoals);
                            setShowOnboarding(false);

                            // Restore user profile to server DB in background
                            completeOnboarding({
                                user_id: user.id,
                                weight: restoredGoals.weight,
                                height: restoredGoals.height,
                                age: restoredGoals.age,
                                gender: restoredGoals.gender,
                                goal_type: restoredGoals.goalType,
                                activity_level: restoredGoals.activityLevel,
                                calorie_goal: restoredGoals.calorieGoal,
                                protein_goal: restoredGoals.proteinGoal,
                                carbs_goal: restoredGoals.carbsGoal,
                                fat_goal: restoredGoals.fatGoal,
                            }).catch(console.error);

                            return getStats(user.id, selectedDate);
                        } catch (e) {
                            console.error('Failed to parse saved user profile:', e);
                        }
                    }

                    setShowOnboarding(true);
                    setAppReady(true);
                    return;
                }

                // Load goals from profile & cache locally
                const activeGoals = {
                    calorieGoal: profile.calorie_goal ?? 2000,
                    proteinGoal: profile.protein_goal ?? 150,
                    carbsGoal: profile.carbs_goal ?? 200,
                    fatGoal: profile.fat_goal ?? 65,
                    waterGoal: profile.water_goal ?? 2000,
                    weight: profile.weight ?? 70,
                    height: profile.height ?? 175,
                    age: profile.age ?? 25,
                    gender: profile.gender ?? 'male',
                    goalType: profile.goal_type ?? 'maintain',
                    activityLevel: profile.activity_level ?? 'moderate',
                };
                setGoals(activeGoals);
                localStorage.setItem('saved_user_profile', JSON.stringify(activeGoals));
                localStorage.setItem('onboarding_done', '1');

                return getStats(user.id, selectedDate);
            })
            .then((stats) => {
                if (!stats) return;
                setGoals(g => ({
                    ...g,
                    calorieGoal: stats.calorie_goal ?? g.calorieGoal,
                    proteinGoal: stats.protein_goal ?? g.proteinGoal,
                    carbsGoal: stats.carbs_goal ?? g.carbsGoal,
                    fatGoal: stats.fat_goal ?? g.fatGoal,
                    waterGoal: stats.water_goal ?? g.waterGoal,
                }));
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
                setAppReady(true);
            })
            .catch((err) => {
                console.warn('Backend not reachable, running in offline mode:', err);
                const localDone = localStorage.getItem('onboarding_done') === '1';
                if (!localDone) {
                    setShowOnboarding(true);
                }
                setAppReady(true);
            });
    }, [user?.id, selectedDate]);

    // ── Onboarding complete ────────────────────────────────────
    const handleOnboardingComplete = (newGoals: {
        calorieGoal: number;
        proteinGoal: number;
        carbsGoal: number;
        fatGoal: number;
        waterGoal: number;
        weight: number;
        height: number;
        age: number;
        gender: string;
        goalType: string;
        activityLevel: string;
    }) => {
        setGoals(newGoals);
        localStorage.setItem('onboarding_done', '1');
        localStorage.setItem('saved_user_profile', JSON.stringify(newGoals));
        setShowOnboarding(false);

        // Load stats after onboarding
        if (user?.id) {
            getStats(user.id, selectedDate)
                .then((stats) => {
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
                .catch(console.error);
        }
    };

    const handleAddFood = (item: FoodItem) => {
        setFoods((prev) => [item, ...prev]);
        pushToast(`✅ ${item.name} — ${item.calories} ккал`);
        setActiveScreen('dashboard');
    };

    const handleDeleteFood = (id: string) => {
        setFoods((prev) => prev.filter((f) => f.id !== id));
    };

    // ── Loading state ──────────────────────────────────────────
    if (!appReady) {
        return (
            <div style={{
                minHeight: '100dvh',
                background: 'var(--bg-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 16,
            }}>
                <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                    animation: 'pulseSoft 1.5s ease-in-out infinite',
                }}>
                    🥗
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
                    Загружаем данные...
                </p>
            </div>
        );
    }

    // ── Onboarding ─────────────────────────────────────────────
    if (showOnboarding && user?.id) {
        return (
            <OnboardingScreen
                userId={user.id}
                onComplete={handleOnboardingComplete}
            />
        );
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
            <div key={activeScreen} className="animate-fade-in">
                {activeScreen === 'dashboard' && (
                    <Dashboard
                        foods={foods}
                        onDeleteFood={handleDeleteFood}
                        calorieGoal={goals.calorieGoal}
                        waterMl={waterMl}
                        setWaterMl={setWaterMl}
                        waterGoal={goals.waterGoal}
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
                        onGoalsChange={(g) => {
                            setGoals(prev => {
                                const updated = { ...prev, ...g };
                                localStorage.setItem('saved_user_profile', JSON.stringify(updated));
                                return updated;
                            });
                        }}
                        onResetOnboarding={() => {
                            localStorage.removeItem('saved_user_profile');
                            localStorage.removeItem('onboarding_done');
                            setShowOnboarding(true);
                        }}
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
