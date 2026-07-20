import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Scale, Ruler, Calendar, Target, Activity, Zap, CheckCircle } from 'lucide-react';
import { completeOnboarding, updateUser, OnboardingRequest, OnboardingResponse } from '../api';
import { useTelegram } from '../hooks/useTelegram';

interface OnboardingScreenProps {
    userId: number;
    onComplete: (goals: {
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
    }) => void;
}

type GoalType = 'lose' | 'maintain' | 'gain';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Gender = 'male' | 'female';

const GOALS: { id: GoalType; emoji: string; title: string; desc: string; color: string }[] = [
    { id: 'lose',     emoji: '🔥', title: 'Похудеть',       desc: 'Дефицит -500 ккал/день\n~0.5 кг в неделю',    color: '#ef4444' },
    { id: 'maintain', emoji: '⚖️', title: 'Поддерживать вес', desc: 'Сбалансированное питание\nПоддержка TDEE',  color: '#6366f1' },
    { id: 'gain',     emoji: '💪', title: 'Набрать массу',   desc: 'Профицит +300 ккал/день\nРост мышц',         color: '#22c55e' },
];

const ACTIVITIES: { id: ActivityLevel; emoji: string; title: string; desc: string }[] = [
    { id: 'sedentary',   emoji: '🛋️', title: 'Малоподвижный',     desc: 'Сижу дома, офис, почти не хожу' },
    { id: 'light',       emoji: '🚶', title: 'Лёгкая активность',  desc: '1–3 тренировки/прогулки в неделю' },
    { id: 'moderate',    emoji: '🏃', title: 'Умеренная',          desc: '3–5 тренировок в неделю' },
    { id: 'active',      emoji: '🏋️', title: 'Высокая',            desc: '6–7 тренировок в неделю' },
    { id: 'very_active', emoji: '⚡', title: 'Очень высокая',      desc: 'Физический труд + тренировки' },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ userId, onComplete }) => {
    const { tapImpact } = useTelegram();
    const [step, setStep] = useState(0); // 0=goal, 1=body, 2=activity, 3=result
    const [goalType, setGoalType] = useState<GoalType>('maintain');
    const [gender, setGender] = useState<Gender>('male');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>('light');
    const [result, setResult] = useState<OnboardingResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const totalSteps = 4;

    const handleNext = async () => {
        tapImpact();
        if (step === 1) {
            if (!weight || !height || !age) {
                setError('Заполни все поля');
                return;
            }
            const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);
            if (w < 30 || w > 300) { setError('Вес: 30–300 кг'); return; }
            if (h < 100 || h > 250) { setError('Рост: 100–250 см'); return; }
            if (a < 10 || a > 100) { setError('Возраст: 10–100 лет'); return; }
        }
        setError('');

        if (step === 2) {
            // Calculate and show results
            setLoading(true);
            try {
                const data: OnboardingRequest = {
                    user_id: userId,
                    weight: parseFloat(weight),
                    height: parseFloat(height),
                    age: parseInt(age),
                    gender,
                    goal_type: goalType,
                    activity_level: activityLevel,
                };
                const res = await completeOnboarding(data);
                setResult(res);
                setStep(3);
            } catch (e) {
                setError('Ошибка соединения. Попробуй ещё раз.');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step < 3) setStep(s => s + 1);
    };

    const handleBack = () => {
        tapImpact();
        setError('');
        if (step > 0) setStep(s => s - 1);
    };

    const handleFinish = () => {
        tapImpact();
        if (!result) return;
        onComplete({
            calorieGoal: result.calorie_goal,
            proteinGoal: result.protein_goal,
            carbsGoal: result.carbs_goal,
            fatGoal: result.fat_goal,
            waterGoal: result.water_goal,
            weight: parseFloat(weight),
            height: parseFloat(height),
            age: parseInt(age),
            gender,
            goalType,
            activityLevel,
        });
    };

    const selectedGoal = GOALS.find(g => g.id === goalType)!;

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>

            {/* Progress bar */}
            <div style={{ padding: '20px 20px 0' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 99,
                                background: i <= step ? 'var(--accent)' : 'var(--track)',
                                transition: 'background 0.3s ease',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>

                {/* ── Step 0: Goal ── */}
                {step === 0 && (
                    <div className="animate-fade-in">
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>Шаг 1 из 4</p>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                            Какова твоя цель?
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                            На основе этого мы настроим твои нормы КБЖУ
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {GOALS.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => { tapImpact(); setGoalType(g.id); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        padding: '18px 20px',
                                        borderRadius: 20,
                                        border: goalType === g.id ? `2px solid ${g.color}` : '2px solid var(--border)',
                                        background: goalType === g.id ? `${g.color}15` : 'var(--bg-card)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                        boxShadow: goalType === g.id ? `0 4px 20px ${g.color}30` : '0 2px 8px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <span style={{ fontSize: 36 }}>{g.emoji}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
                                            {g.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
                                            {g.desc}
                                        </div>
                                    </div>
                                    {goalType === g.id && (
                                        <CheckCircle size={20} style={{ color: g.color, flexShrink: 0 }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 1: Body params ── */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>Шаг 2 из 4</p>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                            Параметры тела
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                            Нужно для расчёта базального метаболизма (BMR)
                        </p>

                        {/* Gender */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                Пол
                            </label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {(['male', 'female'] as Gender[]).map(g => (
                                    <button
                                        key={g}
                                        onClick={() => { tapImpact(); setGender(g); }}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: 16,
                                            border: gender === g ? '2px solid var(--accent)' : '2px solid var(--border)',
                                            background: gender === g ? 'var(--accent-bg)' : 'var(--bg-card)',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            fontSize: 14,
                                            color: gender === g ? 'var(--accent)' : 'var(--text-secondary)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {g === 'male' ? '👨 Мужской' : '👩 Женский'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fields */}
                        {[
                            { icon: <Scale size={18} style={{ color: 'var(--accent)' }} />, label: 'Вес', value: weight, setter: setWeight, placeholder: '70', suffix: 'кг', inputMode: 'decimal' as const },
                            { icon: <Ruler size={18} style={{ color: 'var(--accent)' }} />, label: 'Рост', value: height, setter: setHeight, placeholder: '175', suffix: 'см', inputMode: 'numeric' as const },
                            { icon: <Calendar size={18} style={{ color: 'var(--accent)' }} />, label: 'Возраст', value: age, setter: setAge, placeholder: '25', suffix: 'лет', inputMode: 'numeric' as const },
                        ].map(field => (
                            <div key={field.label} style={{ marginBottom: 16 }}>
                                <label style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                    {field.label}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                                        {field.icon}
                                    </div>
                                    <input
                                        type="text"
                                        inputMode={field.inputMode}
                                        className="input-field"
                                        placeholder={field.placeholder}
                                        value={field.value}
                                        onChange={e => field.setter(e.target.value.replace(/[^\d.]/g, ''))}
                                        style={{ paddingLeft: 44, paddingRight: 44, fontSize: 16 }}
                                    />
                                    <span style={{
                                        position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)', fontSize: 14, fontWeight: 600,
                                    }}>
                                        {field.suffix}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8, fontWeight: 600 }}>
                                ⚠️ {error}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Step 2: Activity ── */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>Шаг 3 из 4</p>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                            Уровень активности
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                            Выбери то, что лучше всего описывает твой образ жизни
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {ACTIVITIES.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => { tapImpact(); setActivityLevel(a.id); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '16px 18px',
                                        borderRadius: 18,
                                        border: activityLevel === a.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                                        background: activityLevel === a.id ? 'var(--accent-bg)' : 'var(--bg-card)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <span style={{ fontSize: 28, flexShrink: 0 }}>{a.emoji}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: 700, fontSize: 15,
                                            color: activityLevel === a.id ? 'var(--accent)' : 'var(--text-primary)',
                                            marginBottom: 2,
                                        }}>
                                            {a.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.desc}</div>
                                    </div>
                                    {activityLevel === a.id && (
                                        <CheckCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 3: Results ── */}
                {step === 3 && result && (
                    <div className="animate-fade-in">
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>Шаг 4 из 4</p>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
                            Твои нормы готовы! 🎉
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                            Рассчитано по формуле Миффлина-Сан Жеора
                        </p>

                        {/* Main calorie card */}
                        <div style={{
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                            borderRadius: 24,
                            padding: '24px',
                            marginBottom: 16,
                            textAlign: 'center',
                            boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
                        }}>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 600 }}>
                                Цель {selectedGoal.emoji} {selectedGoal.title}
                            </div>
                            <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                                {result.calorie_goal}
                            </div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                                ккал в день
                            </div>
                        </div>

                        {/* BMR/TDEE info */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '14px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                                    BMR (базовый)
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{result.bmr}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ккал/день</div>
                            </div>
                            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '14px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                                    TDEE (с акт.)
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{result.tdee}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ккал/день</div>
                            </div>
                        </div>

                        {/* Macros */}
                        <div className="card" style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14 }}>
                                Нормы макросов
                            </div>
                            {[
                                { label: 'Белки', value: result.protein_goal, suffix: 'г', color: '#60a5fa' },
                                { label: 'Углеводы', value: result.carbs_goal, suffix: 'г', color: '#fbbf24' },
                                { label: 'Жиры', value: result.fat_goal, suffix: 'г', color: '#f87171' },
                                { label: 'Вода', value: result.water_goal, suffix: 'мл', color: '#38bdf8' },
                            ].map(m => (
                                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{m.label}</span>
                                    <span style={{ fontSize: 16, fontWeight: 800, color: m.color }}>
                                        {m.value} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{m.suffix}</span>
                                    </span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Вода</span>
                                <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                                    {result.water_goal} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>мл</span>
                                </span>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(99,102,241,0.08)',
                            borderRadius: 16,
                            padding: '12px 16px',
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            marginBottom: 24,
                        }}>
                            💡 Эти значения можно изменить в любое время в разделе <strong>Профиль</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom buttons */}
            <div style={{ padding: '16px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
                {error && step < 2 && (
                    <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                        ⚠️ {error}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                    {step > 0 && step < 3 && (
                        <button
                            onClick={handleBack}
                            style={{
                                padding: '16px 20px',
                                borderRadius: 18,
                                border: '2px solid var(--border)',
                                background: 'var(--bg-card)',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                minHeight: 56,
                            }}
                        >
                            <ChevronLeft size={18} /> Назад
                        </button>
                    )}
                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: 18,
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: 16,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                minHeight: 56,
                                boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                                opacity: loading ? 0.7 : 1,
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading ? 'Считаем...' : (
                                <>
                                    {step === 2 ? 'Рассчитать' : 'Далее'}
                                    <ChevronRight size={20} />
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: 18,
                                border: 'none',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: 16,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                minHeight: 56,
                                boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
                            }}
                        >
                            Начать отслеживать 🚀
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
