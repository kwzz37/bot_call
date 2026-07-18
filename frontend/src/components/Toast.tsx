import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

export interface ToastMessage {
    id: number;
    text: string;
    type?: 'success' | 'error' | 'info';
}

interface ToastProps {
    toasts: ToastMessage[];
    onDismiss: (id: number) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed bottom-28 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 3000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const bgColor = toast.type === 'error'
        ? 'bg-red-500'
        : toast.type === 'info'
            ? 'bg-blue-500'
            : 'bg-gray-900 dark:bg-gray-100';

    const textColor = toast.type === 'error' || toast.type === 'info' ? 'text-white' : 'text-white dark:text-gray-900';

    return (
        <div
            className={`animate-toast-in pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg ${bgColor} ${textColor}`}
            style={{ background: toast.type === 'error' ? 'var(--danger)' : toast.type === 'info' ? 'var(--water)' : 'var(--text-primary)' }}
        >
            <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span className="text-sm font-semibold flex-1" style={{ color: 'var(--bg-base)' }}>{toast.text}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                className="opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--bg-base)' }}
            >
                <X size={16} />
            </button>
        </div>
    );
};
