import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Flame, Calendar } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { getWeeklyStats, WeeklyStatsResponse, getWeightHistory, WeightEntry, updateUser } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressScreenProps {
    calorieGoal: number;
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ calorieGoal }) => {
    const { user, tapImpact } = useTelegram();
    const [stats, setStats] = useState<WeeklyStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
    const [isEditingWeight, setIsEditingWeight] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [isSavingWeight, setIsSavingWeight] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        setLoading(true);
        Promise.all([
            getWeeklyStats(user.id).then(setStats),
            getWeightHistory(user.id).then(setWeightHistory)
        ]).catch(console.error).finally(() => setLoading(false));
    }, [user?.id]);

    const handleSaveWeight = async () => {
        if (!newWeight || !user?.id) return;
        tapImpact();
        setIsSavingWeight(true);
        try {
            await updateUser(user.id, { weight: parseFloat(newWeight) });
            const history = await getWeightHistory(user.id);
            setWeightHistory(history);
            setIsEditingWeight(false);
            setNewWeight('');
        } catch (e) {
            console.error('Failed to update weight', e);
        } finally {
            setIsSavingWeight(false);
        }
    };

    const maxCal = stats
        ? Math.max(...stats.weekly_calories, calorieGoal, 1)
        : calorieGoal;

    const totalWeek = stats?.weekly_calories.reduce((s, c) => s + c, 0) ?? 0;
    const avgDay = stats ? Math.round(totalWeek / 7) : 0;
    const daysOnGoal = stats
        ? stats.weekly_calories.filter(c => c > 0 && c <= calorieGoal).length
        : 0;

    return (
        <div className="page-container">

            {/* Header */}
            <div className="px-5 pt-6 pb-4">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Прогресс</h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Последние 7 дней</p>
            </div>

            {/* Summary cards */}
            <div className="px-5 mb-5">
                <div className="grid grid-cols-3 gap-3">
                    <div className="card flex flex-col items-center py-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: 'var(--accent-bg)' }}>
                            <BarChart2 size={18} style={{ color: 'var(--accent)' }} />
                        </div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{avgDay}</p>
                        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>ккал/день</p>
                    </div>
                    <div className="card flex flex-col items-center py-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(249,115,22,0.12)' }}>
                            <Flame size={18} style={{ color: '#f97316' }} />
                        </div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.streak ?? 0}</p>
                        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>дней подряд</p>
                    </div>
                    <div className="card flex flex-col items-center py-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(34,197,94,0.12)' }}>
                            <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                        </div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{daysOnGoal}/7</p>
                        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>в норме</p>
                    </div>
                </div>
            </div>

            {/* Weekly bar chart */}
            <div className="mx-5 mb-5">
                <div className="card">
                    <div className="flex items-center gap-2 mb-5">
                        <Calendar size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Калории за неделю</h2>
                    </div>
                    {loading ? (
                        <div className="flex items-end justify-between h-32 gap-1">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="flex flex-col items-center flex-1 gap-2">
                                    <div
                                        className="w-full rounded-t-lg animate-pulse"
                                        style={{
                                            height: `${40 + Math.random() * 50}px`,
                                            background: 'var(--track)',
                                        }}
                                    />
                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>--</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-end justify-between h-32 gap-1">
                                {(stats?.weekly_calories ?? Array(7).fill(0)).map((cal, i) => {
                                    const heightPct = (cal / maxCal) * 100;
                                    const isToday = i === 6;
                                    const onGoal = cal > 0 && cal <= calorieGoal;
                                    const over = cal > calorieGoal;
                                    const color = over
                                        ? 'var(--danger)'
                                        : onGoal
                                            ? 'var(--success)'
                                            : isToday
                                                ? 'var(--accent)'
                                                : 'var(--text-muted)';

                                    const dateStr = stats?.dates[i]?.slice(5, 10) ?? DAY_NAMES[i];

                                    return (
                                        <div key={i} className="flex flex-col items-center flex-1">
                                            <div
                                                className="w-full rounded-t-xl flex flex-col justify-end transition-all duration-700"
                                                style={{ height: '100px', background: 'var(--track)', position: 'relative' }}
                                            >
                                                {/* Goal line */}
                                                <div
                                                    className="absolute w-full border-t-2 border-dashed"
                                                    style={{
                                                        bottom: `${(calorieGoal / maxCal) * 100}%`,
                                                        borderColor: 'var(--accent)',
                                                        opacity: 0.3,
                                                    }}
                                                />
                                                <div
                                                    className="w-full rounded-t-xl"
                                                    style={{
                                                        height: `${Math.max(heightPct, cal > 0 ? 5 : 0)}%`,
                                                        background: `linear-gradient(180deg, ${color}cc, ${color})`,
                                                        transition: 'height 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-semibold mt-1.5" style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                {dateStr}
                                            </p>
                                            {cal > 0 && (
                                                <p className="text-[9px]" style={{ color }}>
                                                    {cal >= 1000 ? `${(cal / 1000).toFixed(1)}к` : cal}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--success)' }} />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>В норме</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--danger)' }} />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Превышение</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent)' }} />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Сегодня</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Weekly total */}
            <div className="mx-5 mb-5">
                <div className="card flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Итого за неделю</p>
                        <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                            {totalWeek.toLocaleString()}
                            <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-muted)' }}>ккал</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Норма на неделю</p>
                        <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--accent)' }}>
                            {(calorieGoal * 7).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Weight Chart */}
            <div className="mx-5 mb-5 pb-5">
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} style={{ color: '#8b5cf6' }} />
                            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Изменение веса</h2>
                        </div>
                        <button 
                            onClick={() => setIsEditingWeight(!isEditingWeight)}
                            className="text-xs font-bold px-2 py-1 bg-violet-100 text-violet-600 rounded-lg"
                        >
                            {isEditingWeight ? 'Отмена' : 'Обновить'}
                        </button>
                    </div>

                    {isEditingWeight && (
                        <div className="flex gap-2 mb-4 animate-fade-in">
                            <input 
                                type="text"
                                inputMode="numeric"
                                className="input-field flex-1 py-2 text-sm" 
                                placeholder="Новый вес (кг)..."
                                value={newWeight}
                                onChange={(e) => setNewWeight(e.target.value.replace(/[^\d.]/g, ''))}
                            />
                            <button 
                                onClick={handleSaveWeight}
                                disabled={!newWeight || isSavingWeight}
                                className="btn-primary py-2 px-4 text-sm whitespace-nowrap"
                            >
                                Сохранить
                            </button>
                        </div>
                    )}

                    <div className="h-48 w-full mt-2" style={{ marginLeft: '-15px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightHistory}>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => val.slice(5, 10)} 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <YAxis 
                                    domain={['dataMin - 1', 'dataMax + 1']} 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    width={40}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [`${value} кг`, 'Вес']}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="weight" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} 
                                    activeDot={{ r: 6 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
};
