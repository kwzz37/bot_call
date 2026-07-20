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

    // If running outside Telegram or if user ID is missing, mock the user for testing
    const mockUser = {
        id: 999999,
        first_name: 'Тестовый',
        last_name: 'Пользователь',
        username: 'test_user'
    };
    const tgUser = tg?.initDataUnsafe?.user;
    const user = (tgUser && tgUser.id) ? tgUser : mockUser;
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
