import React, { useEffect, useRef } from 'react';

interface CircularProgressProps {
    current: number;
    goal: number;
    size?: number;
    strokeWidth?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    current,
    goal,
    size = 220,
    strokeWidth = 14,
}) => {
    const percentage = Math.min((current / goal) * 100, 100);
    const radius = (size - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const center = size / 2;

    const remaining = Math.max(goal - current, 0);
    const isOver = current > goal;
    const overAmount = current - goal;

    // Color shift: sky blue → orange when close to limit
    const progressColor = isOver
        ? 'url(#overGradient)'
        : percentage > 90
            ? 'url(#warnGradient)'
            : 'url(#progressGradient)';

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    className="circular-progress-svg"
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                        <linearGradient id="warnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fb923c" />
                            <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                        <linearGradient id="overGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#e0f2fe"
                        strokeWidth={strokeWidth}
                    />

                    {/* Progress arc */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={progressColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            filter: 'url(#glow)',
                        }}
                    />
                </svg>

                {/* Center content */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ transform: 'none' }}
                >
                    <span className="text-3xl font-bold text-gray-800 leading-none">
                        {current.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-sm text-gray-400 font-medium">из</span>
                        <span className="text-sm font-semibold text-sky-500">
                            {goal.toLocaleString()}
                        </span>
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5">ккал</span>
                </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-4">
                <div className="text-center">
                    <p className={`text-lg font-bold ${isOver ? 'text-red-500' : 'text-sky-500'}`}>
                        {isOver ? `+${overAmount}` : remaining}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                        {isOver ? 'превышено' : 'осталось'}
                    </p>
                </div>
                <div className="w-px h-8 bg-gray-100" />
                <div className="text-center">
                    <p className="text-lg font-bold text-gray-700">{Math.round(percentage)}%</p>
                    <p className="text-xs text-gray-400 font-medium">выполнено</p>
                </div>
            </div>
        </div>
    );
};
