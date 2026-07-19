import React from 'react';
import { Home, BarChart2, Plus, User } from 'lucide-react';

type Screen = 'dashboard' | 'progress' | 'add' | 'profile';

interface BottomNavProps {
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, onNavigate }) => {
    return (
        <div className="floating-dock">
            <div className="flex items-center justify-around px-2 pt-2 pb-3">

                {/* Home */}
                <button className={`nav-btn ${activeScreen === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
                    <div className="nav-icon-wrap">
                        <Home size={22} strokeWidth={activeScreen === 'dashboard' ? 2.5 : 1.8} />
                    </div>
                    <span className="text-[10px] font-semibold">Главная</span>
                </button>

                {/* Add — big center */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => onNavigate('add')}
                        className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 active:scale-90 shadow-lg"
                        style={{
                            background: activeScreen === 'add'
                                ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                                : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.45)',
                        }}
                    >
                        <Plus
                            size={26}
                            strokeWidth={2.5}
                            className="text-white transition-transform duration-200"
                            style={{ transform: activeScreen === 'add' ? 'rotate(45deg)' : 'rotate(0deg)' }}
                        />
                    </button>
                    <span className="text-[10px] font-semibold" style={{ color: activeScreen === 'add' ? 'var(--accent)' : 'var(--text-muted)' }}>
                        Добавить
                    </span>
                </div>

                {/* Stats (Progress) */}
                <button className={`nav-btn ${activeScreen === 'progress' ? 'active' : ''}`} onClick={() => onNavigate('progress')}>
                    <div className="nav-icon-wrap">
                        <BarChart2 size={22} strokeWidth={activeScreen === 'progress' ? 2.5 : 1.8} />
                    </div>
                    <span className="text-[10px] font-semibold">Статистика</span>
                </button>

            </div>
        </div>
    );
};
