import React, { useState } from 'react';
import { User, Target, Edit3, Save, Sun, Moon, Scale, Ruler, Calendar, Zap, RefreshCw, TrendingUp, Droplets } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../contexts/ThemeContext';
import { updateUser } from '../api';

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

const DEFAULT_GOALS: UserGoals = {
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
};

const GOAL_LABELS: Record<string, string> = {
    lose: '🔥 Похудение',
    maintain: '⚖️ Поддержание',
    gain: '💪 Набор массы',
};

const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: '🛋️ Малоподвижный',
    light: '🚶 Лёгкая',
    moderate: '🏃 Умеренная',
    active: '🏋️ Высокая',
    very_active: '⚡ Очень высокая',
};

interface ProfileProps {
    goals?: Partial<UserGoals>;
    onGoalsChange?: (g: Partial<UserGoals>) => void;
    onResetOnboarding?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ goals, onGoalsChange, onResetOnboarding }) => {
    const { user, tapImpact } = useTelegram();
    const { theme, setTheme } = useTheme();

    const merged = { ...DEFAULT_GOALS, ...goals };
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<UserGoals>(merged);
    const [saving, setSaving] = useState(false);

    const displayName = user
        ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
        : 'Пользователь';

    // BMR (Mifflin-St Jeor)
    const bmr = draft.gender === 'female'
        ? Math.round(10 * draft.weight + 6.25 * draft.height - 5 * draft.age - 161)
        : Math.round(10 * draft.weight + 6.25 * draft.height - 5 * draft.age + 5);

    // BMI
    const bmi = draft.height > 0
        ? +(draft.weight / ((draft.height / 100) ** 2)).toFixed(1)
        : 0;

    const getBmiLabel = (b: number) => {
        if (b < 18.5) return { label: 'Дефицит', color: '#60a5fa' };
        if (b < 25)   return { label: 'Норма ✅', color: '#22c55e' };
        if (b < 30)   return { label: 'Избыток', color: '#f59e0b' };
        return { label: 'Ожирение', color: '#ef4444' };
    };

    const bmiInfo = getBmiLabel(bmi);

    const handleSave = async () => {
        tapImpact();
        setSaving(true);
        try {
            if (user?.id) {
                await updateUser(user.id, {
                    calorie_goal: draft.calorieGoal,
                    protein_goal: draft.proteinGoal,
                    carbs_goal: draft.carbsGoal,
                    fat_goal: draft.fatGoal,
                    water_goal: draft.waterGoal,
                    weight: draft.weight,
                    height: draft.height,
                    age: draft.age,
                    gender: draft.gender,
                }).catch(console.error);
            }
            onGoalsChange?.(draft);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const renderField = (
        icon: React.ReactNode,
        iconBg: string,
        label: string,
        value: number,
        unit: string,
        field: keyof UserGoals,
        color: string = 'var(--text-primary)'
    ) => (
        <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    {icon}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>{label}</span>
            </div>
            {editing ? (
                <input
                    type="text"
                    inputMode="numeric"
                    style={{
                        width: 90,
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 14,
                        background: 'transparent',
                        outline: 'none',
                        border: 'none',
                        borderBottom: '2px solid var(--accent)',
                        color,
                        padding: '2px 4px',
                    }}
                    value={draft[field] || ''}
                    onChange={(e) => {
                        const val = e.target.value.replace(/[^\d.]/g, '');
                        setDraft(d => ({ ...d, [field]: val === '' ? 0 : parseFloat(val) }));
                    }}
                />
            ) : (
                <span style={{ fontWeight: 700, fontSize: 14, color }}>
                    {value} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>{unit}</span>
                </span>
            )}
        </div>
    );

    return (
        <div className="page-container">

            {/* Header */}
            <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Профиль</h1>
                <button
                    onClick={() => { tapImpact(); editing ? handleSave() : setEditing(true); }}
                    disabled={saving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        borderRadius: 14,
                        border: 'none',
                        background: editing ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--accent-bg)',
                        color: editing ? '#fff' : 'var(--accent)',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        boxShadow: editing ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                        minHeight: 44,
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {editing ? <><Save size={15} />{saving ? 'Сохраняю...' : 'Сохранить'}</> : <><Edit3 size={15} />Изменить</>}
                </button>
            </div>

            {/* Avatar + name */}
            <div style={{ padding: '0 20px 16px' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, fontWeight: 900, color: '#fff',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                        flexShrink: 0,
                    }}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{displayName}</p>
                        {user?.username && (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0' }}>@{user.username}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{
                                background: 'var(--accent-bg)', color: 'var(--accent)',
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                            }}>
                                {GOAL_LABELS[merged.goalType] ?? '⚖️ Поддержание'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BMI / TDEE card */}
            <div style={{ padding: '0 20px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 4px' }}>
                    Здоровье
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>ИМТ (BMI)</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: bmiInfo.color, lineHeight: 1 }}>{bmi}</div>
                        <div style={{ fontSize: 11, color: bmiInfo.color, fontWeight: 700, marginTop: 4 }}>{bmiInfo.label}</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>BMR</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{bmr}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>ккал/день</div>
                    </div>
                </div>
                <div className="card" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Активность</div>
                        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, marginTop: 2 }}>
                            {ACTIVITY_LABELS[merged.activityLevel] ?? '🚶 Лёгкая'}
                        </div>
                    </div>
                    <button
                        onClick={() => { tapImpact(); onResetOnboarding?.(); }}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 12,
                            border: 'none',
                            background: 'var(--accent-bg)',
                            color: 'var(--accent)',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            minHeight: 44,
                        }}
                    >
                        <RefreshCw size={13} /> Пересчитать
                    </button>
                </div>
            </div>

            {/* Calorie / Macro goals */}
            <div style={{ padding: '0 20px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 4px' }}>
                    Цели питания
                </p>
                <div className="card">
                    {renderField(<Target size={16} style={{ color: 'var(--accent)' }} />, 'var(--accent-bg)', 'Калории', merged.calorieGoal, 'ккал', 'calorieGoal', 'var(--accent)')}
                    {renderField(<span className="text-xs font-black" style={{ color: '#60a5fa' }}>Б</span>, 'rgba(96,165,250,0.12)', 'Белки', merged.proteinGoal, 'г', 'proteinGoal', '#60a5fa')}
                    {renderField(<span className="text-xs font-black" style={{ color: '#fbbf24' }}>У</span>, 'rgba(251,191,36,0.12)', 'Углеводы', merged.carbsGoal, 'г', 'carbsGoal', '#fbbf24')}
                    {renderField(<span className="text-xs font-black" style={{ color: '#f87171' }}>Ж</span>, 'rgba(248,113,113,0.12)', 'Жиры', merged.fatGoal, 'г', 'fatGoal', '#f87171')}
                </div>
            </div>

            {/* Body params */}
            <div style={{ padding: '0 20px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 4px' }}>
                    Параметры тела
                </p>
                <div className="card">
                    {renderField(<Scale size={16} style={{ color: '#22c55e' }} />, 'rgba(34,197,94,0.12)', 'Вес', merged.weight, 'кг', 'weight', '#22c55e')}
                    {renderField(<Ruler size={16} style={{ color: '#38bdf8' }} />, 'rgba(56,189,248,0.12)', 'Рост', merged.height, 'см', 'height')}
                    {renderField(<Calendar size={16} style={{ color: '#f59e0b' }} />, 'rgba(245,158,11,0.12)', 'Возраст', merged.age, 'лет', 'age')}
                </div>
            </div>

            {/* Water goal */}
            <div style={{ padding: '0 20px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 4px' }}>
                    Вода
                </p>
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Droplets size={18} style={{ color: 'var(--water)' }} />
                        </div>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Цель по воде</span>
                    </div>
                    {editing ? (
                        <input
                            type="text"
                            inputMode="numeric"
                            style={{
                                width: 90,
                                textAlign: 'right',
                                fontWeight: 700,
                                fontSize: 14,
                                background: 'transparent',
                                outline: 'none',
                                border: 'none',
                                borderBottom: '2px solid var(--water)',
                                color: 'var(--water)',
                                padding: '2px 4px',
                            }}
                            value={draft.waterGoal || ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^\d]/g, '');
                                setDraft(d => ({ ...d, waterGoal: val === '' ? 0 : parseInt(val) }));
                            }}
                        />
                    ) : (
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--water)' }}>
                            {merged.waterGoal} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>мл</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Theme */}
            <div style={{ padding: '0 20px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 4px' }}>
                    Оформление
                </p>
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {theme === 'dark' ? <Moon size={16} style={{ color: 'var(--accent)' }} /> : <Sun size={16} style={{ color: '#fbbf24' }} />}
                        </div>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Тема</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { tapImpact(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                        style={{
                            position: 'relative',
                            width: 50,
                            height: 28,
                            borderRadius: 14,
                            border: 'none',
                            background: theme === 'dark' ? 'var(--accent)' : 'var(--track)',
                            cursor: 'pointer',
                            transition: 'background 0.3s ease',
                            flexShrink: 0,
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 4,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            left: theme === 'dark' ? 28 : 4,
                            transition: 'left 0.3s ease',
                        }} />
                    </button>
                </div>
            </div>

            {editing && (
                <div style={{ padding: '0 20px 24px' }}>
                    <button
                        onClick={() => { tapImpact(); setDraft(merged); setEditing(false); }}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: 18,
                            border: '2px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: 'pointer',
                            minHeight: 56,
                        }}
                    >
                        Отмена
                    </button>
                </div>
            )}
        </div>
    );
};
