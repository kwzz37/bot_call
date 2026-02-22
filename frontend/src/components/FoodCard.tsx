import React from 'react';
import { Trash2 } from 'lucide-react';

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

const mealEmojis: Record<string, string> = {
    default: '🍽️',
};

export const FoodCard: React.FC<FoodCardProps> = ({ item, onDelete }) => {
    return (
        <div className="card flex items-center gap-4 mb-3 animate-slide-up group">
            {/* Emoji */}
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-50 text-2xl flex-shrink-0">
                {item.emoji || '🍽️'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate text-sm">{item.name}</p>
                {item.time && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                )}
                {/* Macros */}
                {(item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                    <div className="flex gap-3 mt-1">
                        {item.protein !== undefined && (
                            <span className="text-xs text-blue-500 font-medium">Б {item.protein}г</span>
                        )}
                        {item.carbs !== undefined && (
                            <span className="text-xs text-amber-500 font-medium">У {item.carbs}г</span>
                        )}
                        {item.fat !== undefined && (
                            <span className="text-xs text-rose-400 font-medium">Ж {item.fat}г</span>
                        )}
                    </div>
                )}
            </div>

            {/* Calories + delete */}
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="font-bold text-sky-500 text-base">{item.calories}</p>
                    <p className="text-xs text-gray-400">ккал</p>
                </div>
                {onDelete && (
                    <button
                        onClick={() => onDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 active:scale-95"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};
