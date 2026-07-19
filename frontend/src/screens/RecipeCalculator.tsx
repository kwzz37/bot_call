import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Search, Plus, Trash2, Save, Utensils, AlertCircle } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { searchFood, FoodSearchResult, createCustomFood } from '../api';

interface RecipeIngredient {
    id: string;
    food: FoodSearchResult;
    grams: number;
}

interface RecipeCalculatorProps {
    onBack: () => void;
}

export const RecipeCalculator: React.FC<RecipeCalculatorProps> = ({ onBack }) => {
    const { user, tapImpact, successFeedback, errorFeedback } = useTelegram();
    
    const [recipeName, setRecipeName] = useState('');
    const [finalWeightStr, setFinalWeightStr] = useState('');
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchQuery.trim().length >= 2) {
            setIsSearching(true);
            searchTimeout.current = setTimeout(async () => {
                try {
                    const res = await searchFood(searchQuery);
                    setSearchResults(res);
                } catch (e) {
                    console.error('Search error', e);
                } finally {
                    setIsSearching(false);
                }
            }, 500);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleAddIngredient = (food: FoodSearchResult) => {
        tapImpact();
        setIngredients(prev => [...prev, { id: crypto.randomUUID(), food, grams: 100 }]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemoveIngredient = (id: string) => {
        tapImpact();
        setIngredients(prev => prev.filter(i => i.id !== id));
    };

    const handleUpdateGrams = (id: string, newGramsStr: string) => {
        const val = newGramsStr.replace(/\D/g, '');
        const grams = val === '' ? 0 : parseInt(val);
        setIngredients(prev => prev.map(i => i.id === id ? { ...i, grams } : i));
    };

    // Calculate totals
    const rawWeight = ingredients.reduce((sum, i) => sum + i.grams, 0);
    const totalCals = ingredients.reduce((sum, i) => sum + (i.food.calories * i.grams / 100), 0);
    const totalProt = ingredients.reduce((sum, i) => sum + ((i.food.protein || 0) * i.grams / 100), 0);
    const totalCarbs = ingredients.reduce((sum, i) => sum + ((i.food.carbs || 0) * i.grams / 100), 0);
    const totalFat = ingredients.reduce((sum, i) => sum + ((i.food.fat || 0) * i.grams / 100), 0);

    const finalWeight = parseInt(finalWeightStr) || rawWeight;

    // Calculate per 100g of final cooked dish
    const finalRatio = finalWeight > 0 ? 100 / finalWeight : 0;
    const finalCals100g = totalCals * finalRatio;
    const finalProt100g = totalProt * finalRatio;
    const finalCarbs100g = totalCarbs * finalRatio;
    const finalFat100g = totalFat * finalRatio;

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!user?.id || !recipeName.trim() || ingredients.length === 0 || finalWeight <= 0) return;
        tapImpact();
        setIsSaving(true);
        try {
            await createCustomFood(user.id, {
                food_name: recipeName.trim(),
                calories: Math.round(finalCals100g),
                protein: Number(finalProt100g.toFixed(1)),
                carbs: Number(finalCarbs100g.toFixed(1)),
                fat: Number(finalFat100g.toFixed(1)),
            });
            successFeedback();
            onBack();
        } catch (e) {
            console.error('Create custom food error', e);
            errorFeedback();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-container flex flex-col h-screen bg-gray-50 pb-20 animate-fade-in z-50">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-white shadow-sm z-10 sticky top-0">
                <button
                    onClick={() => { tapImpact(); onBack(); }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                    <ChevronLeft size={20} style={{ color: 'var(--text-primary)' }} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Калькулятор рецепта</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                
                {/* 1. Recipe Name */}
                <div className="card shadow-sm">
                    <label className="block text-sm font-bold text-gray-500 mb-2">Название блюда</label>
                    <input
                        type="text"
                        placeholder="Например: Сырники домашние"
                        className="input-field w-full text-lg font-bold"
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                    />
                </div>

                {/* 2. Add Ingredients */}
                <div className="card shadow-sm">
                    <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Добавить ингредиенты</h2>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск продуктов..."
                            className="input-field w-full pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-xl p-2 space-y-2 border border-gray-100 shadow-inner">
                            {searchResults.map((res, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAddIngredient(res)}
                                    className="w-full flex items-center justify-between p-3 bg-white rounded-xl shadow-sm active:scale-95 transition-all"
                                >
                                    <div className="flex flex-col text-left">
                                        <span className="font-bold text-gray-800 text-sm leading-tight line-clamp-1">{res.food_name}</span>
                                        <span className="text-xs text-gray-400">{res.brand || 'База'} • {res.calories} ккал/100г</span>
                                    </div>
                                    <Plus size={18} className="text-blue-500 flex-shrink-0 ml-2" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Ingredients List */}
                {ingredients.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1">Состав рецепта</h2>
                        {ingredients.map((ing) => (
                            <div key={ing.id} className="card shadow-sm flex items-center gap-3">
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-800 leading-tight line-clamp-1 mb-1">{ing.food.food_name}</p>
                                    <p className="text-xs text-gray-400">{Math.round(ing.food.calories * ing.grams / 100)} ккал</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-16 text-center font-bold text-sm bg-gray-100 rounded-lg py-1 outline-none"
                                        value={ing.grams || ''}
                                        onChange={(e) => handleUpdateGrams(ing.id, e.target.value)}
                                    />
                                    <span className="text-xs text-gray-500 font-medium">г</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveIngredient(ing.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 active:scale-90 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. Totals and Cooked Weight */}
                {ingredients.length > 0 && (
                    <div className="card shadow-sm border-2 border-blue-50">
                        <div className="flex items-center gap-2 mb-4">
                            <Utensils size={18} className="text-blue-500" />
                            <h2 className="text-sm font-bold text-gray-800">Итоговые параметры</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="bg-gray-50 p-3 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Сырой вес</p>
                                <p className="font-bold text-lg">{rawWeight} г</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <p className="text-xs text-blue-400 mb-1 font-medium">Финальный вес (г)</p>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-lg font-bold bg-transparent outline-none text-blue-600 placeholder-blue-300"
                                        placeholder={String(rawWeight)}
                                        value={finalWeightStr}
                                        onChange={(e) => setFinalWeightStr(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Пищевая ценность (на 100г готового блюда)</p>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <p className="font-bold text-lg text-gray-800">{Math.round(finalCals100g)}</p>
                                    <p className="text-[10px] text-gray-500">ККАЛ</p>
                                </div>
                                <div>
                                    <p className="font-bold text-blue-500">{finalProt100g.toFixed(1)}</p>
                                    <p className="text-[10px] text-gray-500">БЕЛКИ</p>
                                </div>
                                <div>
                                    <p className="font-bold text-yellow-500">{finalCarbs100g.toFixed(1)}</p>
                                    <p className="text-[10px] text-gray-500">УГЛЕВОДЫ</p>
                                </div>
                                <div>
                                    <p className="font-bold text-red-400">{finalFat100g.toFixed(1)}</p>
                                    <p className="text-[10px] text-gray-500">ЖИРЫ</p>
                                </div>
                            </div>
                        </div>
                        
                        {finalWeight < rawWeight * 0.5 && finalWeight > 0 && (
                            <div className="mt-4 flex items-start gap-2 bg-yellow-50 p-3 rounded-xl text-yellow-700 text-xs">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <p>Финальный вес сильно меньше сырого. Убедитесь, что вы верно указали вес готового блюда.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Save Button */}
            {ingredients.length > 0 && (
                <div className="px-5 pb-[100px] pt-4 bg-white border-t border-gray-100 sticky bottom-0 z-10">
                    <button
                        onClick={handleSave}
                        disabled={!recipeName.trim() || isSaving}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isSaving ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                Сохранить рецепт
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
