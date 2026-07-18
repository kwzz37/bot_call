import React, { useRef, useState } from 'react';

export interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    time?: string;
    emoji?: string;
}

interface FoodCardProps {
    item: FoodItem;
    onDelete?: (id: string) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onDelete }) => {
    const [swipeX, setSwipeX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const DELETE_THRESHOLD = -80;

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientX - startX.current;
        setSwipeX(Math.min(0, Math.max(delta, -120)));
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (swipeX < DELETE_THRESHOLD && onDelete) {
            onDelete(item.id);
        } else {
            setSwipeX(0);
        }
    };

    const bgColor = swipeX < DELETE_THRESHOLD / 2 ? 'var(--danger)' : 'transparent';

    return (
        <div className="relative overflow-hidden rounded-3xl mb-3">
            {/* Delete hint bg */}
            <div
                className="absolute inset-0 flex items-center justify-end pr-5 rounded-3xl transition-colors duration-200"
                style={{ background: bgColor }}
            >
                <span className="text-white text-sm font-bold opacity-90">Удалить</span>
            </div>

            {/* Card */}
            <div
                className="card flex items-center gap-3 relative"
                style={{
                    transform: `translateX(${swipeX}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Emoji */}
                <div
                    className="flex items-center justify-center w-11 h-11 rounded-2xl text-xl flex-shrink-0"
                    style={{ background: 'var(--accent-bg)' }}
                >
                    {item.emoji || '🍽️'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                    </p>
                    {item.time && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.time}</p>
                    )}
                    {(item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                        <div className="flex gap-2 mt-1">
                            {item.protein !== undefined && (
                                <span className="text-xs font-medium" style={{ color: '#60a5fa' }}>Б {item.protein}г</span>
                            )}
                            {item.carbs !== undefined && (
                                <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>У {item.carbs}г</span>
                            )}
                            {item.fat !== undefined && (
                                <span className="text-xs font-medium" style={{ color: '#f87171' }}>Ж {item.fat}г</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Calories */}
                <div className="text-right flex-shrink-0">
                    <p className="font-bold text-base" style={{ color: 'var(--accent)' }}>{item.calories}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ккал</p>
                </div>
            </div>
        </div>
    );
};
