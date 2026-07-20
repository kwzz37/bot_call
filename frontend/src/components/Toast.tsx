import React from 'react';

export interface ToastMessage {
    id: number;
    text: string;
    type: 'success' | 'error' | 'info';
}

interface ToastProps {
    toasts: ToastMessage[];
    onDismiss: (id: number) => void;
}

const COLORS: Record<ToastMessage['type'], { bg: string; border: string; color: string }> = {
    success: { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', color: '#22c55e' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', color: '#ef4444' },
    info:    { bg: 'rgba(99,102,241,0.12)', border: 'var(--accent)', color: 'var(--accent)' },
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
    if (!toasts.length) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
            left: 16,
            right: 16,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 8,
            pointerEvents: 'none',
        }}>
            {toasts.map(t => {
                const c = COLORS[t.type];
                return (
                    <div
                        key={t.id}
                        className="animate-toast-in"
                        onClick={() => onDismiss(t.id)}
                        style={{
                            background: 'var(--bg-card)',
                            border: `1.5px solid ${c.border}`,
                            borderRadius: 16,
                            padding: '12px 16px',
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                            pointerEvents: 'all',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <span style={{ color: c.color, fontSize: 16 }}>
                            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        {t.text}
                    </div>
                );
            })}
        </div>
    );
};
