import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, CheckCircle } from 'lucide-react';
import { FoodSearchResult } from '../api';

interface GramCalculatorSheetProps {
    food: FoodSearchResult;
    onAdd: (food: FoodSearchResult, grams: number) => void;
    onClose: () => void;
}

const QUICK_AMOUNTS = [50, 100, 150, 200, 300];

export const GramCalculatorSheet: React.FC<GramCalculatorSheetProps> = ({ food, onAdd, onClose }) => {
    const [gramsStr, setGramsStr] = useState('100');

    const grams = parseInt(gramsStr) || 0;
    const factor = grams / 100;
    const cal = Math.round(food.calories * factor);
    const prot = +(food.protein * factor).toFixed(1);
    const carbs = +(food.carbs * factor).toFixed(1);
    const fat = +(food.fat * factor).toFixed(1);

    const changeGrams = (delta: number) => {
        const newGrams = Math.max(1, Math.min(2000, grams + delta));
        setGramsStr(newGrams.toString());
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setGramsStr('');
            return;
        }
        const parsed = parseInt(val);
        if (!isNaN(parsed) && parsed <= 2000) {
            setGramsStr(parsed.toString());
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="sheet-overlay" onClick={onClose} />

            {/* Sheet */}
            <div
                className="glass-sheet fixed bottom-0 left-0 right-0 z-50 px-5 pt-4 pb-[100px]"
            >
                {/* Handle */}
                <div className="flex justify-center mb-4">
                    <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--border)' }} />
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex-1 min-w-0 pr-3">
                        <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {food.food_name}
                        </h3>
                        {food.brand && food.brand !== 'Локальная база' && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{food.brand}</p>
                        )}
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>на 100г: {food.calories} ккал</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="glass-btn w-9 h-9 flex items-center justify-center"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Gram input */}
                <div className="flex items-center gap-4 mb-5">
                    <button
                        onClick={() => changeGrams(-10)}
                        className="glass-btn w-12 h-12 flex items-center justify-center"
                        style={{ color: 'var(--accent)' }}
                    >
                        <Minus size={20} />
                    </button>

                    <div className="flex-1 flex flex-col items-center">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={gramsStr}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                handleInputChange({ ...e, target: { ...e.target, value: val } });
                            }}
                            className="input-field text-center text-3xl font-bold"
                            style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                        />
                        <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>грамм</span>
                    </div>

                    <button
                        onClick={() => changeGrams(10)}
                        className="glass-btn w-12 h-12 flex items-center justify-center"
                        style={{ color: 'var(--accent)' }}
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2 mb-5">
                    {QUICK_AMOUNTS.map(g => (
                        <button
                            key={g}
                            onClick={() => setGramsStr(g.toString())}
                            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                            style={{
                                background: grams === g ? 'var(--accent)' : 'var(--bg-card2)',
                                color: grams === g ? '#fff' : 'var(--text-secondary)',
                                boxShadow: grams === g ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                            }}
                        >
                            {g}г
                        </button>
                    ))}
                </div>

                {/* Nutrition preview */}
                <div
                    className="glass-card p-4 mb-5 grid grid-cols-4 gap-2 text-center"
                >
                    <div>
                        <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{cal}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ккал</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold" style={{ color: '#60a5fa' }}>{prot}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>белки г</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold" style={{ color: '#fbbf24' }}>{carbs}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>угл. г</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold" style={{ color: '#f87171' }}>{fat}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>жиры г</p>
                    </div>
                </div>

                {/* Add button */}
                <button
                    onClick={() => onAdd(food, grams)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    <CheckCircle size={20} />
                    Добавить {grams}г · {cal} ккал
                </button>
            </div>
        </>
    );
};
