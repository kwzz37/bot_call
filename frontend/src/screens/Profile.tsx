import React, { useState } from 'react';
import { User, Target, Edit3, Save, X, Sun, Moon, Scale, Ruler, Calendar, Zap } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../contexts/ThemeContext';
import { updateUser } from '../api';

interface UserGoals {
    calorieGoal: number;
    proteinGoal: number;
    carbsGoal: number;
    fatGoal: number;
    weight: number;
    height: number;
    age: number;
}

const DEFAULT_GOALS: UserGoals = {
    calorieGoal: 2000,
    proteinGoal: 150,
    carbsGoal: 250,
    fatGoal: 65,
    weight: 70,
    height: 175,
    age: 25,
};

interface ProfileProps {
    goals?: Partial<UserGoals>;
    onGoalsChange?: (g: Partial<UserGoals>) => void;
}

export const Profile: React.FC<ProfileProps> = ({ goals, onGoalsChange }) => {
    const { user, tapImpact } = useTelegram();
    const { theme, setTheme } = useTheme();

    const merged = { ...DEFAULT_GOALS, ...goals };
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<UserGoals>(merged);

    const displayName = user
        ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
        : 'Пользователь';

    const handleSave = async () => {
        tapImpact();
        if (user?.id) {
            await updateUser(user.id, {
                calorie_goal: draft.calorieGoal,
                weight: draft.weight,
                height: draft.height,
                age: draft.age,
            }).catch(console.error);
        }
        onGoalsChange?.(draft);
        setEditing(false);
    };

    // BMR calculation (Mifflin-St Jeor)
    const bmr = Math.round(
        10 * draft.weight + 6.25 * draft.height - 5 * draft.age + 5
    );

    const renderFieldRow = (icon: React.ReactNode, label: string, value: number, unit: string, field: keyof UserGoals, color: string) => (
        <div key={field} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
                    {icon}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </div>
            {editing ? (
                <input
                    type="text"
                    inputMode="numeric"
                    className="w-24 text-right font-bold text-sm bg-transparent outline-none border-b-2"
                    style={{ color, borderColor: 'var(--accent)' }}
                    value={draft[field] || ''}
                    onChange={(e) => {
                        const val = e.target.value.replace(/[^\d.]/g, '');
                        setDraft(d => ({ ...d, [field]: val === '' ? 0 : parseFloat(val) }));
                    }}
                />
            ) : (
                <span className="font-bold text-sm" style={{ color }}>
                    {value} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75rem' }}>{unit}</span>
                </span>
            )}
        </div>
    );

    return (
        <div className="page-container">

            {/* Header */}
            <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Профиль</h1>
                <button
                    onClick={() => { tapImpact(); editing ? handleSave() : setEditing(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all active:scale-95 font-semibold text-sm"
                    style={{
                        background: editing ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--accent-bg)',
                        color: editing ? '#fff' : 'var(--accent)',
                        boxShadow: editing ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                    }}
                >
                    {editing ? <><Save size={15} />Сохранить</> : <><Edit3 size={15} />Изменить</>}
                </button>
            </div>

            {/* Avatar + name */}
            <div className="mx-5 mb-5">
                <div className="card flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                    >
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                        {user?.username && (
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                            <Zap size={12} style={{ color: '#fbbf24' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                Базовый обмен ~{bmr} ккал/день
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Цели */}
            <div className="mx-5 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
                    Цели питания
                </p>
                <div className="card">
                    {renderFieldRow(<Target size={16} style={{ color: 'var(--accent)' }} />, "Калории", merged.calorieGoal, "ккал", "calorieGoal", "var(--accent)")}
                    {renderFieldRow(<span className="text-sm font-bold" style={{ color: '#60a5fa' }}>Б</span>, "Белки", merged.proteinGoal, "г", "proteinGoal", "#60a5fa")}
                    {renderFieldRow(<span className="text-sm font-bold" style={{ color: '#fbbf24' }}>У</span>, "Углеводы", merged.carbsGoal, "г", "carbsGoal", "#fbbf24")}
                    {renderFieldRow(<span className="text-sm font-bold" style={{ color: '#f87171' }}>Ж</span>, "Жиры", merged.fatGoal, "г", "fatGoal", "#f87171")}
                </div>
            </div>

            {/* Параметры */}
            <div className="mx-5 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
                    Параметры тела
                </p>
                <div className="card">
                    {renderFieldRow(<Scale size={16} style={{ color: 'var(--accent)' }} />, "Текущий вес", merged.weight, "кг", "weight", "var(--text-primary)")}
                    {renderFieldRow(<Ruler size={16} style={{ color: 'var(--accent)' }} />, "Рост", merged.height, "см", "height", "var(--text-primary)")}
                    {renderFieldRow(<Calendar size={16} style={{ color: 'var(--accent)' }} />, "Возраст", merged.age, "лет", "age", "var(--text-primary)")}
                </div>
            </div>

            {/* Тема */}
            <div className="mx-5 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
                    Оформление
                </p>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
                                {theme === 'dark' ? <Moon size={16} style={{ color: 'var(--accent)' }} /> : <Sun size={16} style={{ color: '#fbbf24' }} />}
                            </div>
                            <div>
                                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Тема</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</p>
                            </div>
                        </div>

                        {/* Toggle switch */}
                        <button
                            onClick={() => { tapImpact(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                            className="relative w-14 h-7 rounded-full transition-all duration-300 active:scale-90"
                            style={{ background: theme === 'dark' ? 'var(--accent)' : 'var(--track)' }}
                        >
                            <div
                                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
                                style={{ left: theme === 'dark' ? '30px' : '4px' }}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {editing && (
                <div className="mx-5 mb-5">
                    <button
                        onClick={() => { tapImpact(); setDraft(merged); setEditing(false); }}
                        className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                        style={{ background: 'var(--bg-card2)', color: 'var(--text-secondary)' }}
                    >
                        Отмена
                    </button>
                </div>
            )}
        </div>
    );
};
