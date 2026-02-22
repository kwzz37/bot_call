import React, { useRef, useState } from 'react';
import { Camera, Send, Sparkles, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { FoodItem } from '../components/FoodCard';
import { useTelegram } from '../hooks/useTelegram';
import { addByText, analyzePhoto } from '../api';

type Tab = 'text' | 'photo';
type AIState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

interface AddFoodProps {
    onAdd: (item: FoodItem) => void;
    onBack: () => void;
}

const MEAL_EMOJIS = ['🍗', '🥗', '🍕', '🍜', '🥩', '🥣', '🍎', '🍌', '🧁', '🥤', '🍳', '🫐'];

export const AddFood: React.FC<AddFoodProps> = ({ onAdd, onBack, userId }) => {
    const { tapImpact, successFeedback, errorFeedback } = useTelegram();
    const [activeTab, setActiveTab] = useState<Tab>('text');

    // Text tab state
    const [foodName, setFoodName] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');

    // Photo tab state
    const [aiState, setAiState] = useState<AIState>('idle');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<Partial<FoodItem> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTextAdd = () => {
        if (!foodName.trim() || !calories.trim()) return;
        tapImpact();

        const item: FoodItem = {
            id: Date.now().toString(),
            name: foodName.trim(),
            calories: parseInt(calories, 10) || 0,
            protein: protein ? parseInt(protein, 10) : undefined,
            carbs: carbs ? parseInt(carbs, 10) : undefined,
            fat: fat ? parseInt(fat, 10) : undefined,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            emoji: MEAL_EMOJIS[Math.floor(Math.random() * MEAL_EMOJIS.length)],
        };
        successFeedback();
        onAdd(item);
        onBack();
    };

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        tapImpact();

        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
        reader.readAsDataURL(file);

        // Simulate AI analysis flow
        setAiState('uploading');
        await delay(800);
        setAiState('analyzing');
        await delay(2000);

        // Simulate AI response (replace with real API call)
        const mockResult: Partial<FoodItem> = {
            name: 'Куриный бургер',
            calories: 520,
            protein: 32,
            carbs: 48,
            fat: 18,
            emoji: '🍔',
        };

        setAiResult(mockResult);
        setAiState('done');
        successFeedback();
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

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white shadow-soft text-gray-600 active:scale-90 transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Добавить еду</h1>
                    <p className="text-sm text-gray-400">Опишите или сфотографируйте</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="mx-5 mb-5">
                <div className="bg-gray-100 rounded-2xl p-1 flex">
                    {(['text', 'photo'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { tapImpact(); setActiveTab(tab); }}
                            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${activeTab === tab
                                ? 'bg-white text-sky-500 shadow-soft'
                                : 'text-gray-400'
                                }`}
                        >
                            {tab === 'text' ? '✏️ Текст' : '📷 Фото'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'text' ? (
                <div className="px-5 tab-content">
                    <div className="card mb-4">
                        <p className="text-sm font-semibold text-gray-500 mb-3">Название блюда</p>
                        <input
                            type="text"
                            className="input-field mb-4"
                            placeholder="Например: Куриная грудка"
                            value={foodName}
                            onChange={(e) => setFoodName(e.target.value)}
                        />
                        <p className="text-sm font-semibold text-gray-500 mb-3">Калории (ккал) *</p>
                        <input
                            type="number"
                            inputMode="numeric"
                            className="input-field mb-4"
                            placeholder="350"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                        />

                        <p className="text-sm font-semibold text-gray-500 mb-3">Макронутриенты (необязательно)</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-blue-400 font-semibold mb-1 block">Белки, г</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="input-field text-sm"
                                    placeholder="0"
                                    value={protein}
                                    onChange={(e) => setProtein(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-amber-500 font-semibold mb-1 block">Углев., г</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="input-field text-sm"
                                    placeholder="0"
                                    value={carbs}
                                    onChange={(e) => setCarbs(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-rose-400 font-semibold mb-1 block">Жиры, г</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="input-field text-sm"
                                    placeholder="0"
                                    value={fat}
                                    onChange={(e) => setFat(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleTextAdd}
                        disabled={!foodName.trim() || !calories.trim()}
                        className={`btn-primary w-full flex items-center justify-center gap-2 ${!foodName.trim() || !calories.trim() ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                    >
                        <Send size={18} />
                        Добавить
                    </button>
                </div>
            ) : (
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
                                        Попробовать снова
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}
