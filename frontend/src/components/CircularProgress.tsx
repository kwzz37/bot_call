import React from 'react';

interface CircularProgressProps {
    current: number;
    goal: number;
    size?: number;
    strokeWidth?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    current,
    goal,
    size = 200,
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

    const gradientId = isOver ? 'overGrad' : percentage > 90 ? 'warnGrad' : 'mainGrad';

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    style={{ transform: 'rotate(-90deg)', display: 'block' }}
                >
                    <defs>
                        <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--accent)" />
                            <stop offset="100%" stopColor="var(--accent-2)" />
                        </linearGradient>
                        <linearGradient id="warnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <linearGradient id="overGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--danger)" />
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
                        cx={center} cy={center} r={radius}
                        fill="none"
                        stroke="var(--track)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Progress arc */}
                    <circle
                        cx={center} cy={center} r={radius}
                        fill="none"
                        stroke={`url(#${gradientId})`}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                        {current.toLocaleString()}
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        из {goal.toLocaleString()} ккал
                    </span>
                    <span
                        className="text-sm font-bold mt-1"
                        style={{ color: isOver ? 'var(--danger)' : 'var(--accent)' }}
                    >
                        {isOver ? `+${overAmount} лишних` : `−${remaining} осталось`}
                    </span>
                </div>
            </div>
        </div>
    );
};
