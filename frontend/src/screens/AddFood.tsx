import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Sparkles, CheckCircle, AlertCircle, ChevronLeft, Barcode, Search, Mic, MicOff, Plus, Star } from 'lucide-react';
import { FoodItem } from '../components/FoodCard';
import { GramCalculatorSheet } from '../components/GramCalculatorSheet';
import { RecipeCalculator } from './RecipeCalculator';
import { useTelegram } from '../hooks/useTelegram';
import { addByText, analyzePhoto, scanBarcode, searchFood, FoodSearchResult, addManual, getRecentFoods, RecentFoodResult, getFavorites, addFavorite, removeFavorite, FavoriteItem } from '../api';

type Tab = 'search' | 'text' | 'photo' | 'barcode' | 'recipe' | 'favorites';
type AIState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

interface AddFoodProps {
    onAdd: (item: FoodItem) => void;
    onBack: () => void;
    selectedDate?: string;
    selectedMealType?: string;
    setSelectedMealType?: (meal: string) => void;
}

const MEAL_EMOJIS = ['🍗', '🥗', '🍕', '🍜', '🥩', '🥣', '🍎', '🍌', '🧁', '🥤', '🍳', '🫐'];

export const AddFood: React.FC<AddFoodProps> = ({ onAdd, onBack, selectedDate, selectedMealType = 'any', setSelectedMealType }) => {
    const { tapImpact, successFeedback, errorFeedback, user } = useTelegram();
    const [activeTab, setActiveTab] = useState<Tab>('search');

    // Search tab state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
    const [recentFoods, setRecentFoods] = useState<RecentFoodResult[]>([]);
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user?.id) {
            getRecentFoods(user.id).then(setRecentFoods).catch(console.error);
            getFavorites(user.id).then(favs => {
                setFavorites(favs);
                setFavoriteIds(new Set(favs.map(f => f.food_name)));
            }).catch(console.error);
        }
    }, [user?.id]);

    // Scroll input into view on focus (keyboard avoidance)
    const handleSearchFocus = () => {
        setTimeout(() => {
            searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handleToggleFavorite = useCallback(async (food: FoodSearchResult | RecentFoodResult, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.id) return;
        tapImpact();
        const fname = (food as any).food_name;
        if (favoriteIds.has(fname)) {
            const fav = favorites.find(f => f.food_name === fname);
            if (fav) {
                await removeFavorite(fav.id, user.id).catch(console.error);
                setFavoriteIds(prev => { const s = new Set(prev); s.delete(fname); return s; });
                setFavorites(prev => prev.filter(f => f.food_name !== fname));
            }
        } else {
            const res = await addFavorite(user.id, {
                food_name: fname,
                calories: food.calories,
                protein: food.protein || 0,
                carbs: food.carbs || 0,
                fat: food.fat || 0,
            }).catch(console.error);
            if (res) {
                setFavoriteIds(prev => new Set([...prev, fname]));
                setFavorites(prev => [...prev, { id: res.favorite_id, food_name: fname, calories: food.calories, protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0, emoji: '🍽️' }]);
            }
        }
    }, [user?.id, favorites, favoriteIds, tapImpact]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const results = await searchFood(searchQuery.trim());
                    setSearchResults(results);
                } catch (e) {
                    console.error('Search error', e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Text tab state (now Smart Text / Voice)
    const [smartText, setSmartText] = useState('');
    const [isListening, setIsListening] = useState(false);

    // Barcode tab state
    const [barcodeStr, setBarcodeStr] = useState('');

    // Photo tab state
    const [aiState, setAiState] = useState<AIState>('idle');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<Partial<FoodItem> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }
        
        if (isListening) {
            setIsListening(false);
            return;
        }

        tapImpact();
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSmartText(prev => prev ? prev + ' ' + transcript : transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleSmartTextAdd = async () => {
        if (!smartText.trim() || !user?.id) return;
        tapImpact();
        setAiState('analyzing');
        try {
            const res = await addByText(user.id, smartText.trim(), selectedMealType, selectedDate);
            const realResult: Partial<FoodItem> = {
                id: res.log_id.toString(),
                name: res.food,
                calories: res.calories,
                protein: res.protein || undefined,
                carbs: res.carbs || undefined,
                fat: res.fat || undefined,
                emoji: res.emoji || '🍽️',
            };
            setAiResult(realResult);
            setAiState('done');
            successFeedback();
        } catch (err) {
            console.error('Smart text error:', err);
            setAiState('error');
            errorFeedback();
        }
    };

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        tapImpact();

        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
        reader.readAsDataURL(file);

        setAiState('uploading');
        try {
            setAiState('analyzing');
            const res = await analyzePhoto(user.id, file, selectedMealType, selectedDate);
            
            const realResult: Partial<FoodItem> = {
                id: res.log_id.toString(),
                name: res.food,
                calories: res.calories,
                protein: res.protein || undefined,
                carbs: res.carbs || undefined,
                fat: res.fat || undefined,
                emoji: res.emoji || '🍽️',
            };

            setAiResult(realResult);
            setAiState('done');
            successFeedback();
        } catch (err) {
            console.error('Photo analysis error:', err);
            setAiState('error');
            errorFeedback();
        }
    };

    const handleBarcodeScan = async () => {
        if (!barcodeStr.trim() || !user?.id) return;
        tapImpact();
        setAiState('analyzing');
        try {
            const res = await scanBarcode(barcodeStr.trim());
            // scanBarcode returns FoodSearchResult
            const realResult: Partial<FoodItem> = {
                id: Date.now().toString(),
                name: res.food_name,
                calories: res.calories,
                protein: res.protein || undefined,
                carbs: res.carbs || undefined,
                fat: res.fat || undefined,
                emoji: '🍽️',
            };
            setAiResult(realResult);
            setAiState('done');
            successFeedback();
        } catch (err) {
            console.error('Barcode error:', err);
            setAiState('error');
            errorFeedback();
        }
    };

    const handleAddSearchResult = async (food: FoodSearchResult, grams: number = 100, mealType?: string) => {
        if (!user?.id) return;
        setSelectedFood(null);
        tapImpact();

        const h = new Date().getHours();
        const defaultMeal = (h >= 5 && h < 12) ? 'breakfast' : (h >= 12 && h < 17) ? 'lunch' : (h >= 17 && h < 22) ? 'dinner' : 'snack';
        const targetMeal = (mealType && mealType !== 'any') ? mealType : (selectedMealType !== 'any' ? selectedMealType : defaultMeal);

        // Scale nutrition by grams
        const f = grams / 100;
        const scaledFood = {
            ...food,
            calories: Math.round(food.calories * f),
            protein: parseFloat((food.protein * f).toFixed(1)),
            carbs: parseFloat((food.carbs * f).toFixed(1)),
            fat: parseFloat((food.fat * f).toFixed(1)),
            food_name: `${food.food_name} (${grams}г)`,
        };
        try {
            const res = await addManual(user.id, scaledFood, targetMeal, selectedDate);
            const item: FoodItem = {
                id: res.log_id.toString(),
                name: res.food,
                calories: res.calories,
                protein: res.protein || undefined,
                carbs: res.carbs || undefined,
                fat: res.fat || undefined,
                emoji: res.emoji || '🍽️',
                time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                meal_type: targetMeal,
            };
            onAdd(item);
            successFeedback();
            onBack();
        } catch (e) {
            console.error('Manual add error:', e);
            errorFeedback();
        }
    };

    const handleAddFromAI = () => {
        if (!aiResult) return;
        tapImpact();
        const item: FoodItem = {
            id: Date.now().toString(),
            name: aiResult.name || 'Блюдо из фото',
            calories: aiResult.calories || 0,
            protein: aiResult.protein,
            carbs: aiResult.carbs,
            fat: aiResult.fat,
            emoji: aiResult.emoji,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            meal_type: selectedMealType,
        };
        successFeedback();
        onAdd(item);
        onBack();
    };

    const resetPhoto = () => {
        setCapturedImage(null);
        setAiState('idle');
        setAiResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const [showRecipeCalc, setShowRecipeCalc] = useState(false);

    if (showRecipeCalc) {
        return <RecipeCalculator onBack={() => setShowRecipeCalc(false)} />;
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { tapImpact(); onBack(); }}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                        <ChevronLeft size={20} style={{ color: 'var(--text-primary)' }} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Добавить</h1>
                    </div>
                </div>
                
                {setSelectedMealType && (
                    <select 
                        value={selectedMealType} 
                        onChange={(e) => setSelectedMealType(e.target.value)}
                        className="bg-black/5 dark:bg-white/10 text-sm font-bold px-3 py-2 rounded-xl outline-none appearance-none"
                    >
                        <option value="breakfast">Завтрак</option>
                        <option value="lunch">Обед</option>
                        <option value="dinner">Ужин</option>
                        <option value="snack">Перекус</option>
                        <option value="any">Разное</option>
                    </select>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="mx-5 mb-5 overflow-x-auto pb-1">
                <div className="tab-switcher" style={{ gap: '0.25rem' }}>
                    {([['search','🔍 Поиск'],['favorites','⭐ Избранное'],['text','🤖 ИИ'],['photo','📷 Фото'],['barcode','📊 Код']] as [Tab,string][]).map(([tab, label]) => (
                        <button
                            key={tab}
                            onClick={() => { tapImpact(); setActiveTab(tab); setAiState('idle'); }}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'favorites' ? (
                <div className="px-5 tab-content animate-fade-in">
                    {favorites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12" style={{ opacity: 0.5 }}>
                            <Star size={48} className="mb-3" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Нет избранных продуктов.<br/>Нажми ⭐ рядом с продуктом</p>
                        </div>
                    ) : (
                        <div className="space-y-2 pb-8">
                            {favorites.map((fav, i) => (
                                <button
                                    key={fav.id}
                                    onClick={() => { tapImpact(); setSelectedFood({ food_name: fav.food_name, calories: fav.calories, protein: fav.protein, carbs: fav.carbs, fat: fav.fat, brand: '', image_url: '' }); }}
                                    className="glass-card w-full p-3 flex items-center justify-between gap-3 active:scale-[0.98] transition-all text-left"
                                >
                                    <span className="text-2xl">{fav.emoji || '🍽️'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{fav.food_name}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs">
                                            <span className="font-bold" style={{ color: 'var(--accent)' }}>{fav.calories} ккал/100г</span>
                                            {fav.protein > 0 && <span style={{ color: '#60a5fa' }}>Б:{fav.protein}</span>}
                                            {fav.fat > 0 && <span style={{ color: '#f87171' }}>Ж:{fav.fat}</span>}
                                            {fav.carbs > 0 && <span style={{ color: '#fbbf24' }}>У:{fav.carbs}</span>}
                                        </div>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                                        <CheckCircle size={18} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'search' ? (
                <div className="px-5 tab-content animate-fade-in">
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="input-field pl-10 w-full"
                            placeholder="Найти продукт в базе (от 3 букв)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={handleSearchFocus}
                        />
                        {isSearching && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <div className="w-4 h-4 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Create Recipe Button */}
                    <button
                        onClick={() => { tapImpact(); setShowRecipeCalc(true); }}
                        className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border-2 border-dashed border-blue-300 text-blue-500 font-semibold active:scale-95 transition-all bg-blue-50"
                    >
                        <Plus size={18} />
                        Собрать свой рецепт
                    </button>

                    <div className="space-y-2 pb-8">
                        {searchResults.length > 0 ? (
                            searchResults.map((res, i) => (
                                <div
                                    key={i}
                                    className="glass-card flex items-center gap-3 active:scale-[0.98] transition-all"
                                    style={{ padding: '10px 12px' }}
                                >
                                    <button
                                        onClick={() => { tapImpact(); setSelectedFood(res); }}
                                        style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 0 }}
                                    >
                                        <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{res.food_name}</p>
                                        {res.brand && <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>{res.brand}</p>}
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-bold" style={{ color: 'var(--accent)' }}>{res.calories} ккал/100г</span>
                                            {res.protein > 0 && <span style={{ color: '#60a5fa' }}>Б:{res.protein}</span>}
                                            {res.fat > 0 && <span style={{ color: '#f87171' }}>Ж:{res.fat}</span>}
                                            {res.carbs > 0 && <span style={{ color: '#fbbf24' }}>У:{res.carbs}</span>}
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => handleToggleFavorite(res, e)}
                                        className="star-btn"
                                        style={{ color: favoriteIds.has(res.food_name) ? '#fbbf24' : 'var(--text-muted)' }}
                                    >
                                        <Star size={18} fill={favoriteIds.has(res.food_name) ? '#fbbf24' : 'none'} />
                                    </button>
                                    <button
                                        onClick={() => { tapImpact(); setSelectedFood(res); }}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: 'none', cursor: 'pointer' }}
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                </div>
                            ))
                        ) : searchQuery.length > 2 && !isSearching ? (
                            <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Ничего не найдено</p>
                        ) : searchQuery.length <= 2 ? (
                            recentFoods.length > 0 ? (
                                <div className="space-y-2 mt-4">
                                    <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Недавние</h3>
                                    {recentFoods.map((res, i) => (
                                        <button
                                            key={`recent-${i}`}
                                            onClick={() => { tapImpact(); setSelectedFood(res as any); }}
                                            className="glass-card w-full p-3 flex items-center justify-between gap-3 active:scale-[0.98] transition-all text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                                                {res.emoji || '🍽️'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{res.food_name}</p>
                                                <div className="flex items-center gap-2 mt-1 text-xs">
                                                    <span className="font-bold" style={{ color: 'var(--accent)' }}>{res.calories} ккал</span>
                                                    {res.protein > 0 && <span style={{ color: '#60a5fa' }}>Б:{res.protein}</span>}
                                                    {res.fat > 0 && <span style={{ color: '#f87171' }}>Ж:{res.fat}</span>}
                                                    {res.carbs > 0 && <span style={{ color: '#fbbf24' }}>У:{res.carbs}</span>}
                                                </div>
                                            </div>
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                                            >
                                                <CheckCircle size={18} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8" style={{ opacity: 0.5 }}>
                                    <Search size={48} className="mb-3" style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Введи название продукта,<br/>чтобы найти его КБЖУ</p>
                                </div>
                            )
                        ) : null}
                    </div>
                </div>
            ) : activeTab === 'text' ? (
                <div className="px-5 tab-content animate-fade-in">
                    {aiState === 'idle' || aiState === 'error' ? (
                        <>
                            <div className="card mb-4">
                                <h2 className="text-lg font-bold text-gray-800 mb-2">Напиши или продиктуй 🎙️</h2>
                                <p className="text-sm text-gray-400 mb-4">
                                    Например: "Съел тарелку борща со сметаной и два куска черного хлеба"
                                </p>
                                
                                <div className="relative mb-4">
                                    <textarea
                                        className="input-field w-full min-h-[120px] resize-none py-3"
                                        placeholder="Опиши свой приём пищи..."
                                        value={smartText}
                                        onChange={(e) => setSmartText(e.target.value)}
                                    />
                                    <button
                                        onClick={toggleListening}
                                        className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                            isListening 
                                                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                    </button>
                                </div>
                                
                                {aiState === 'error' && (
                                    <p className="text-sm text-red-500 mb-4 text-center bg-red-50 py-2 px-3 rounded-xl">
                                        Не удалось распознать еду. Опиши подробнее.
                                    </p>
                                )}

                                <button
                                    onClick={handleSmartTextAdd}
                                    disabled={!smartText.trim()}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={18} />
                                    Распознать через ИИ
                                </button>
                            </div>
                        </>
                    ) : aiState === 'analyzing' ? (
                        <div className="card flex flex-col items-center justify-center py-12 mb-4">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={24} className="text-sky-500 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">
                                ИИ анализирует текст...
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">Определяем калории и состав</p>
                        </div>
                    ) : aiState === 'done' && aiResult ? (
                        <div className="card mb-4 animate-slide-up">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle size={20} className="text-emerald-500" />
                                <p className="font-bold text-gray-800">ИИ определил блюдо</p>
                            </div>

                            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-2xl">
                                <span className="text-3xl">{aiResult.emoji}</span>
                                <div>
                                    <p className="font-bold text-gray-800">{aiResult.name}</p>
                                    <p className="text-2xl font-bold text-sky-500">{aiResult.calories} <span className="text-sm font-medium text-gray-400">ккал</span></p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-5">
                                <div className="text-center p-2 bg-blue-50 rounded-xl">
                                    <p className="text-sm font-bold text-blue-600">{aiResult.protein ?? 0}г</p>
                                    <p className="text-xs text-blue-400">Белки</p>
                                </div>
                                <div className="text-center p-2 bg-amber-50 rounded-xl">
                                    <p className="text-sm font-bold text-amber-600">{aiResult.carbs ?? 0}г</p>
                                    <p className="text-xs text-amber-400">Углеводы</p>
                                </div>
                                <div className="text-center p-2 bg-rose-50 rounded-xl">
                                    <p className="text-sm font-bold text-rose-500">{aiResult.fat ?? 0}г</p>
                                    <p className="text-xs text-rose-400">Жиры</p>
                                </div>
                            </div>

                            <button onClick={handleAddFromAI} className="btn-primary w-full flex items-center justify-center gap-2 mb-2">
                                <CheckCircle size={18} />
                                Добавить в дневник
                            </button>
                            <button onClick={() => setAiState('idle')} className="btn-secondary w-full text-center">
                                Изменить текст
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : activeTab === 'photo' ? (
                <div className="px-5 tab-content">
                    {aiState === 'idle' && !capturedImage && (
                        <>
                            {/* Camera Upload Area */}
                            <label
                                htmlFor="food-photo"
                                className="card flex flex-col items-center justify-center py-12 mb-4 cursor-pointer
                  border-2 border-dashed border-sky-200 bg-sky-50/50
                  active:scale-98 transition-all duration-150 hover:bg-sky-50"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center mb-4 shadow-lg shadow-sky-200">
                                    <Camera size={36} className="text-white" />
                                </div>
                                <p className="font-bold text-gray-700 text-lg">Сфотографировать еду</p>
                                <p className="text-sm text-gray-400 mt-1 text-center px-4">
                                    Наш ИИ определит калории<br />и состав блюда автоматически
                                </p>
                                <div className="flex items-center gap-1 mt-4">
                                    <Sparkles size={14} className="text-sky-400" />
                                    <span className="text-xs text-sky-500 font-semibold">Powered by AI</span>
                                </div>
                            </label>
                            <input
                                ref={fileInputRef}
                                id="food-photo"
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handlePhotoCapture}
                            />
                        </>
                    )}

                    {/* Image preview + AI states */}
                    {capturedImage && (
                        <div className="mb-4 animate-fade-in">
                            <div className="relative rounded-3xl overflow-hidden shadow-card mb-4">
                                <img
                                    src={capturedImage}
                                    alt="Фото блюда"
                                    className="w-full object-cover"
                                    style={{ maxHeight: 260 }}
                                />
                                {(aiState === 'uploading' || aiState === 'analyzing') && (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                        <p className="text-white font-semibold text-sm">
                                            {aiState === 'uploading' ? 'Загружаем фото...' : 'ИИ анализирует блюдо...'}
                                        </p>
                                        {aiState === 'analyzing' && (
                                            <div className="flex items-center gap-1">
                                                <Sparkles size={14} className="text-sky-300" />
                                                <span className="text-sky-300 text-xs">Определяем калории</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* AI Result */}
                            {aiState === 'done' && aiResult && (
                                <div className="card mb-4 animate-slide-up">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle size={20} className="text-emerald-500" />
                                        <p className="font-bold text-gray-800">ИИ определил блюдо</p>
                                    </div>

                                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-2xl">
                                        <span className="text-3xl">{aiResult.emoji}</span>
                                        <div>
                                            <p className="font-bold text-gray-800">{aiResult.name}</p>
                                            <p className="text-2xl font-bold text-sky-500">{aiResult.calories} <span className="text-sm font-medium text-gray-400">ккал</span></p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-5">
                                        <div className="text-center p-2 bg-blue-50 rounded-xl">
                                            <p className="text-sm font-bold text-blue-600">{aiResult.protein}г</p>
                                            <p className="text-xs text-blue-400">Белки</p>
                                        </div>
                                        <div className="text-center p-2 bg-amber-50 rounded-xl">
                                            <p className="text-sm font-bold text-amber-600">{aiResult.carbs}г</p>
                                            <p className="text-xs text-amber-400">Углеводы</p>
                                        </div>
                                        <div className="text-center p-2 bg-rose-50 rounded-xl">
                                            <p className="text-sm font-bold text-rose-500">{aiResult.fat}г</p>
                                            <p className="text-xs text-rose-400">Жиры</p>
                                        </div>
                                    </div>

                                    <button onClick={handleAddFromAI} className="btn-primary w-full flex items-center justify-center gap-2 mb-2">
                                        <CheckCircle size={18} />
                                        Добавить в дневник
                                    </button>
                                    <button onClick={resetPhoto} className="btn-secondary w-full text-center">
                                        Переснять фото
                                    </button>
                                </div>
                            )}

                            {aiState === 'error' && (
                                <div className="card flex flex-col items-center py-6 mb-4 animate-slide-up">
                                    <AlertCircle size={40} className="text-red-400 mb-3" />
                                    <p className="font-bold text-gray-700">Не удалось распознать</p>
                                    <p className="text-sm text-gray-400 mt-1 text-center">Попробуйте сфотографировать под другим углом</p>
                                    <button onClick={resetPhoto} className="btn-primary mt-5 px-8">
                                        Сохранить
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Barcode Tab Content */
                <div className="animate-fade-in mx-5 mt-4">
                    <div className="card">
                        {aiState === 'idle' || aiState === 'error' ? (
                            <>
                                <div className="flex flex-col items-center py-6">
                                    <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
                                        <Barcode size={32} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-800 text-center mb-1">
                                        Поиск по штрихкоду
                                    </h2>
                                    <p className="text-sm text-gray-400 text-center mb-6">
                                        Введите штрихкод с упаковки продукта
                                    </p>
                                    <div className="w-full">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="input-field w-full mb-4 text-center"
                                            placeholder="Например: 4601234567890"
                                            value={barcodeStr}
                                            onChange={(e) => setBarcodeStr(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                    {aiState === 'error' && (
                                        <p className="text-sm text-red-500 mt-2 mb-4 text-center bg-red-50 py-2 px-3 rounded-xl">
                                            Не удалось найти продукт или ошибка сервера
                                        </p>
                                    )}
                                    <button
                                        onClick={handleBarcodeScan}
                                        disabled={!barcodeStr.trim()}
                                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold text-lg active:scale-95 transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        Найти
                                    </button>
                                </div>
                            </>
                        ) : aiState === 'analyzing' || aiState === 'uploading' ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Barcode size={24} className="text-blue-500 animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    Поиск в базе...
                                </h3>
                                <p className="text-sm text-gray-400 mt-1 animate-pulse">
                                    OpenFoodFacts
                                </p>
                            </div>
                        ) : (
                            <div className="py-2">
                                <div className="flex flex-col items-center mb-6">
                                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-500 mb-3">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 text-center">Продукт найден!</h3>
                                </div>

                                {aiResult && (
                                    <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-4xl">{aiResult.emoji}</span>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 leading-tight mb-1">{aiResult.name}</p>
                                                <p className="text-sm font-semibold text-sky-500">{aiResult.calories} ккал</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-4">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400">Белки</p>
                                                <p className="font-semibold text-gray-700">{aiResult.protein ?? 0}г</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400">Жиры</p>
                                                <p className="font-semibold text-gray-700">{aiResult.fat ?? 0}г</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400">Углеводы</p>
                                                <p className="font-semibold text-gray-700">{aiResult.carbs ?? 0}г</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setAiState('idle')}
                                        className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold active:scale-95 transition-all"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleAddFromAI}
                                        className="flex-1 py-4 rounded-2xl bg-sky-500 text-white font-bold active:scale-95 transition-all shadow-md shadow-sky-200"
                                    >
                                        Добавить
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Gram Calculator Bottom Sheet */}
            {selectedFood && (
                <GramCalculatorSheet
                    food={selectedFood}
                    onAdd={handleAddSearchResult}
                    onClose={() => setSelectedFood(null)}
                    initialMealType={selectedMealType}
                />
            )}
        </div>
    );
};

function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

