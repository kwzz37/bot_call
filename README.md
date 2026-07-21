<div align="center">

# 🥗 Calorie Tracker — Telegram Mini App

**Умный трекер калорий и БЖУ прямо в Telegram с ИИ-распознаванием, нечетким поиском и локальной базой продуктов.**

[![Live WebApp](https://img.shields.io/badge/Live_WebApp-GitHub_Pages-22c55e?style=for-the-badge&logo=github&logoColor=white)](https://kwzz37.github.io/bot_call/)
[![Live API](https://img.shields.io/badge/Live_API-Render.com-46e3b7?style=for-the-badge&logo=render&logoColor=white)](https://bot-call-wftl.onrender.com/docs)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Telegram](https://img.shields.io/badge/Telegram_Mini_App-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/webapps)

</div>

---

## 🌟 Ключевые фичи проекта

- 🔍 **Умный нечеткий поиск (Fuzzy Search)** — работает на алгоритмах `rapidfuzz` (`WRatio`). Находит продукты даже с 2-3 опечатками, автоматически исправляет случайную раскладку клавиатуры (например, `ghbdtn` ➔ `привет`) и нормализует буквы `е/ё`.
- 🇧🇾 **Расширенная база продуктов (1,675+ позиций)** — в базу включены популярные региональные бренды Беларуси (например, предприятия **Домочай**, хлебобулочные изделия, молочка, готовые блюда).
- 🤖 **ИИ-распознавание блюд (Google Gemini 2.5 Flash)**:
  - **По тексту**: напишите «тарелка борща и 200г гречки», ИИ моментально рассчитает калории, белки, жиры и углеводы.
  - **По фото**: сфотографируйте тарелку с едой — нейросеть распознает блюда и вернет детальный состав.
  - **По штрихкоду**: сканируйте штрихкод товара.
- 📐 **Расчет индивидуальных норм (КБЖУ и Воды)** — удобный Onboarding калькулятор формул Харриса-Бенедикта / Маффина-Джеора в зависимости от веса, роста, возраста, пола, уровня активности и цели (похудение, поддержание, набор).
- 🍳 **Категоризация по приемам пищи** — распределение блюд по категориям: **Завтрак 🍳, Обед 🍽️, Ужин 🌙, Перекус 🍎, Разное 🥗** с возможностью удаления любой позиции в 1 клик (или свайпом).
- 🛡️ **Двойная оффлайн-устойчивость (Zero Data Loss)** — профиль пользователя, цели, дневные логи еды и выпитой воды дублируются в `localStorage` устройства. Даже при перезапуске бесплатных серверов данные автоматически синхронизируются с бэкендом без потери.
- 🎨 **Glassmorphism UI & Нативная интеграция** — современный дизайн под iOS/Telegram (светлая и тёмная темы, Haptic Feedback при касаниях, корректные отступы под домашний индикатор).

---

## 🏗️ Архитектура проекта

```text
bot_call/
├── bot.py                  # Telegram-бот на aiogram 3 (выдает кнопку Mini App)
├── start.sh                # Единый скрипт запуска FastAPI + Bot для Cloud (Render)
├── backend/
│   ├── main.py             # FastAPI REST API (Search, AI, Stats, CRUD)
│   ├── database.py         # SQLite база данных (Users, FoodLogs, WaterLogs)
│   ├── generate_db.py     # Парсер и генератор базы продуктов
│   ├── local_db.json       # База из 1,675+ продуктов (включая белорусские бренды)
│   ├── schemas.py          # Pydantic модели запросов/ответов
│   └── requirements.txt    # Зависимости Python
├── frontend/               # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── screens/        # Dashboard, AddFood, Profile, ProgressScreen, Onboarding
│   │   ├── components/     # BottomNav, FoodCard, GramCalculatorSheet, CircularProgress
│   │   ├── hooks/          # useTelegram (интеграция с Telegram WebApp API)
│   │   └── api.ts          # HTTP клиент
│   └── vite.config.ts      # Конфигурация Vite с билдом в /docs
└── docs/                   # Скомпилированный продакшн-фронтенд для GitHub Pages
```

---

## 🛠️ Стек технологий

### Backend & AI
- **Python 3.11+**
- **FastAPI** — высокопроизводительный асинхронный веб-фреймворк
- **Aiogram 3** — асинхронная библиотека для работы с Telegram Bot API
- **Google GenAI SDK** (`gemini-2.5-flash`) — анализ фото и свободного текста
- **RapidFuzz** — C++ оптимизированный нечеткий поиск строк
- **SQLite** — встроенная реляционная БД

### Frontend
- **React 18** + **TypeScript**
- **Vite** — сверхбыстрый сборщик
- **Tailwind CSS** + Custom Vanilla CSS Variables (Glassmorphism design system)
- **Lucide React** — иконки
- **Telegram WebApp SDK** — HapticFeedback, ColorScheme, Swipes handling

---

## ⚡ Быстрый старт (Локальный запуск)

### 1. Клонировать репозиторий
```bash
git clone https://github.com/kwzz37/bot_call.git
cd bot_call
```

### 2. Запустить Бэкенд
```bash
cd backend
pip install -r requirements.txt
```

Создайте файл `.env` в папке `backend/` со следующими переменными:
```env
BOT_TOKEN=ваш_токен_бота_от_BotFather
GEMINI_API_KEY=ваш_ключ_gemini_api
```

Запустите FastAPI сервер:
```bash
uvicorn main:app --reload --port 8000
```
API будет доступно по адресу: `http://localhost:8000` (Документация Swagger: `http://localhost:8000/docs`)

### 3. Запустить Фронтенд
```bash
cd ../frontend
npm install
npm run dev
```
Приложение запустится по адресу: `http://localhost:5173`

---

## ☁️ Развертывание в Облаке (Deployment)

Проект полностью готов к дeплою 24/7:
1. **Frontend (GitHub Pages)**:
   Фронтенд автоматически собирается в директорию `docs/` при выполнении команды `npm run build`. В настройках репозитория GitHub Pages достаточно выбрать источник: `Branch: main, Folder: /docs`.
2. **Backend & Telegram Bot (Render.com)**:
   В репозитории подготовлен скрипт `start.sh`, который параллельно запускает веб-сервер Uvicorn и бота `bot.py` в рамках одного бесплатного сервиса на Render.

---

## 👨‍💻 Автор

**Максим (kwzz37)** — [GitHub Profile](https://github.com/kwzz37)
