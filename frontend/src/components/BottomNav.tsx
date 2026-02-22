import React from 'react';
import { Home, Plus, User } from 'lucide-react';

type Screen = 'dashboard' | 'add' | 'profile';

interface BottomNavProps {
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, onNavigate }) => {
    return (
        <div className="floating-dock">
            <div className="flex items-center justify-around px-4 pt-3 pb-4">
                {/* Home */}
                <button
                    onClick={() => onNavigate('dashboard')}
                    className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all duration-200 active:scale-90 ${activeScreen === 'dashboard'
                            ? 'text-sky-500'
                            : 'text-gray-400'
                        }`}
                >
                    <div className={`relative p-2 rounded-2xl transition-all duration-200 ${activeScreen === 'dashboard' ? 'bg-sky-50' : ''
                        }`}>
                        <Home size={22} strokeWidth={activeScreen === 'dashboard' ? 2.5 : 1.8} />
                        {activeScreen === 'dashboard' && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1 h-1 rounded-full bg-sky-500" />
                        )}
                    </div>
                    <span className={`text-xs font-medium ${activeScreen === 'dashboard' ? 'text-sky-500' : 'text-gray-400'
                        }`}>
                        Главная
                    </span>
                </button>

                {/* Add Button — big center */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => onNavigate('add')}
                        className={`relative flex items-center justify-center w-16 h-16 rounded-3xl
              transition-all duration-200 active:scale-90 shadow-lg
              ${activeScreen === 'add'
                                ? 'bg-sky-600 shadow-sky-300'
                                : 'bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-200'
                            }`}
                    >
                        <Plus
                            size={28}
                            strokeWidth={2.5}
                            className={`text-white transition-transform duration-200 ${activeScreen === 'add' ? 'rotate-45' : 'rotate-0'
                                }`}
                        />
                        <span className="absolute inset-0 rounded-3xl bg-white opacity-0 active:opacity-10 transition-opacity" />
                    </button>
                    <span className={`text-xs font-medium ${activeScreen === 'add' ? 'text-sky-500' : 'text-gray-400'
                        }`}>
                        Добавить
                    </span>
                </div>

                {/* Profile */}
                <button
                    onClick={() => onNavigate('profile')}
                    className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all duration-200 active:scale-90 ${activeScreen === 'profile'
                            ? 'text-sky-500'
                            : 'text-gray-400'
                        }`}
                >
                    <div className={`relative p-2 rounded-2xl transition-all duration-200 ${activeScreen === 'profile' ? 'bg-sky-50' : ''
                        }`}>
                        <User size={22} strokeWidth={activeScreen === 'profile' ? 2.5 : 1.8} />
                        {activeScreen === 'profile' && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1 h-1 rounded-full bg-sky-500" />
                        )}
                    </div>
                    <span className={`text-xs font-medium ${activeScreen === 'profile' ? 'text-sky-500' : 'text-gray-400'
                        }`}>
                        Профиль
                    </span>
                </button>
            </div>
        </div>
    );
};
