/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                sky: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
            },
            fontFamily: {
                sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            boxShadow: {
                'soft': '0 2px 20px rgba(0,0,0,0.06)',
                'card': '0 4px 24px rgba(0,0,0,0.08)',
                'dock': '0 -4px 32px rgba(0,0,0,0.10)',
                'dark-card': '0 4px 32px rgba(0,0,0,0.4)',
                'glow': '0 0 24px rgba(139, 92, 246, 0.45)',
            },
            animation: {
                'spin-slow': 'spin 2s linear infinite',
                'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'slide-down': 'slideDown 0.3s ease-out',
                'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'toast-in': 'toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(24px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-16px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                bounceIn: {
                    '0%': { transform: 'scale(0.8)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                toastIn: {
                    '0%': { transform: 'translateY(80px) scale(0.9)', opacity: '0' },
                    '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
