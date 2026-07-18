import { useEffect, useState } from 'react';

const tg = window.Telegram?.WebApp;

export function useTelegram() {
    const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(
        tg?.colorScheme ?? 'light'
    );

    useEffect(() => {
        if (tg) {
            tg.ready();
            tg.expand();
        }
    }, []);

    const user = tg?.initDataUnsafe?.user;
    const haptic = tg?.HapticFeedback;

    const tapImpact = () => {
        try { haptic?.impactOccurred('light'); } catch (_) { }
    };

    const successFeedback = () => {
        try { haptic?.notificationOccurred('success'); } catch (_) { }
    };

    const errorFeedback = () => {
        try { haptic?.notificationOccurred('error'); } catch (_) { }
    };

    return {
        tg,
        user,
        colorScheme,
        tapImpact,
        successFeedback,
        errorFeedback,
    };
}
