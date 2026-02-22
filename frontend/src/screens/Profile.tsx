import React, { useState } from 'react';
import {
    User, Target, TrendingUp, Edit3, Save, X, ChevronRight, Award
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface UserGoals {
    calorieGoal: number;
    proteinGoal: number;
    carbsGoal: number;
    fatGoal: number;
    weight: number;
    targetWeight: number;
}

const DEFAULT_GOALS: UserGoals = {
    calorieGoal: 2500,
    proteinGoal: 160,
    carbsGoal: 300,
    fatGoal: 80,
    weight: 80,
    targetWeight: 72,
};

export const Profile: React.FC = () => {
    const { user } = useTelegram();
    const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<UserGoals>(DEFAULT_GOALS);

    const displayName = user
        ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
        : 'Пользователь';

    const avatarChar = (user?.first_name?.[0] ?? 'U').toUpperCase();

    const handleEdit = () => {
        setDraft({ ...goals });
        setEditing(true);
    };

    const handleSave = () => {
        setGoals({ ...draft });
        setEditing(false);
    };

    const handleCancel = () => {
        setDraft({ ...goals });
        setEditing(false);
    };

    const weightDiff = goals.weight - goals.targetWeight;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
            {/* Header */}
            <div className="px-5 pt-6 pb-4">
                <h1 className="text-2xl font-bold text-gray-800">Профиль</h1>
                <p className="text-sm text-gray-400">Ваши данные и цели</p>
            </div>

            {/* User Card */}
            <div className="mx-5 mb-5">
                <div className="card flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-200 flex-shrink-0">
                        {user?.photo_url ? (
                            <img
                                src={user.photo_url}
                                alt={displayName}
                                className="w-full h-full rounded-3xl object-cover"
                            />
                        ) : (
                            <span className="text-2xl font-bold text-white">{avatarChar}</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-lg font-bold text-gray-800">{displayName}</p>
                        {user?.username && (
                            <p className="text-sm text-gray-400">@{user.username}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                            <Award size={14} className="text-sky-400" />
                            <span className="text-xs text-sky-500 font-semibold">Активный трекер</span>
                        </div>
                    </div>
                    <button
                        onClick={editing ? handleCancel : handleEdit}
                        className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all active:scale-90 ${editing ? 'bg-red-50 text-red-400' : 'bg-sky-50 text-sky-500'
                            }`}
                    >
                        {editing ? <X size={18} /> : <Edit3 size={18} />}
                    </button>
                </div>
            </div>

            {/* Weight Progress */}
            <div className="mx-5 mb-5">
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={18} className="text-sky-500" />
                        <h2 className="font-bold text-gray-800">Прогресс веса</h2>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{goals.weight}</p>
                            <p className="text-xs text-gray-400">текущий, кг</p>
                        </div>
                        <div className="flex-1 mx-4">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.min(
                                            ((goals.weight - goals.targetWeight) / goals.weight) * 100 * 3,
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-1">
                                {weightDiff > 0 ? `Осталось сбросить ${weightDiff} кг` : '🎉 Цель достигнута!'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-sky-500">{goals.targetWeight}</p>
                            <p className="text-xs text-gray-400">цель, кг</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Goals */}
            <div className="mx-5 mb-5">
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Target size={18} className="text-sky-500" />
                            <h2 className="font-bold text-gray-800">Ежедневные цели</h2>
                        </div>
                        {editing && (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all"
                            >
                                <Save size={14} />
                                Сохранить
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <GoalRow
                            label="Калории"
                            value={editing ? draft.calorieGoal : goals.calorieGoal}
                            unit="ккал"
                            color="text-sky-500"
                            bgColor="bg-sky-50"
                            editing={editing}
                            onChange={(v) => setDraft((d) => ({ ...d, calorieGoal: v }))}
                        />
                        <GoalRow
                            label="Белки"
                            value={editing ? draft.proteinGoal : goals.proteinGoal}
                            unit="г"
                            color="text-blue-500"
                            bgColor="bg-blue-50"
                            editing={editing}
                            onChange={(v) => setDraft((d) => ({ ...d, proteinGoal: v }))}
                        />
                        <GoalRow
                            label="Углеводы"
                            value={editing ? draft.carbsGoal : goals.carbsGoal}
                            unit="г"
                            color="text-amber-500"
                            bgColor="bg-amber-50"
                            editing={editing}
                            onChange={(v) => setDraft((d) => ({ ...d, carbsGoal: v }))}
                        />
                        <GoalRow
                            label="Жиры"
                            value={editing ? draft.fatGoal : goals.fatGoal}
                            unit="г"
                            color="text-rose-400"
                            bgColor="bg-rose-50"
                            editing={editing}
                            onChange={(v) => setDraft((d) => ({ ...d, fatGoal: v }))}
                        />
                    </div>
                </div>
            </div>

            {/* Weight edit */}
            {editing && (
                <div className="mx-5 mb-5 animate-fade-in">
                    <div className="card">
                        <h2 className="font-bold text-gray-800 mb-4">Веса</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Текущий вес, кг</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className="input-field"
                                    value={draft.weight}
                                    onChange={(e) => setDraft((d) => ({ ...d, weight: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Целевой вес, кг</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className="input-field"
                                    value={draft.targetWeight}
                                    onChange={(e) => setDraft((d) => ({ ...d, targetWeight: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface GoalRowProps {
    label: string;
    value: number;
    unit: string;
    color: string;
    bgColor: string;
    editing: boolean;
    onChange: (v: number) => void;
}

const GoalRow: React.FC<GoalRowProps> = ({
    label, value, unit, color, bgColor, editing, onChange,
}) => (
    <div className="flex items-center gap-3">
        <div className={`flex-1 flex items-center justify-between p-3 ${bgColor} rounded-2xl`}>
            <span className="text-sm font-medium text-gray-600">{label}</span>
            {editing ? (
                <input
                    type="number"
                    inputMode="numeric"
                    className={`w-20 text-right bg-transparent font-bold ${color} focus:outline-none text-base`}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
                />
            ) : (
                <span className={`font-bold ${color}`}>{value} {unit}</span>
            )}
        </div>
    </div>
);
