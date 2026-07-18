<div align="center">

# 🥗 Calorie Tracker — Telegram Mini App

**Считай калории прямо в Telegram — текстом или фотографией блюда**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Telegram](https://img.shields.io/badge/Telegram_Mini_App-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/webapps)

</div>

---

## 📱 Что это?

Telegram Mini App, которое позволяет отслеживать калории и макросы (белки, жиры, углеводы) прямо внутри Telegram:

- **Текстом** — напишите «тарелка борща» или «гречка 200г», ИИ сам посчитает
- **Фото** — сфотографируйте блюдо, ИИ распознает его и оценит питательность
- **Статистика** — дневной дашборд с прогрессом по калориям и БЖУ
- **Профиль** — настройте цели: вес, рост, возраст, дневная норма калорий

---

## 🏗️ Архитектура

```
bot_call/
├── bot.py              # Telegram-бот на aiogram 3 (отправляет Mini App)
├── backend/
│   ├── main.py         # FastAPI REST API
│   ├── database.py     # SQLite (пользователи + логи еды)
│   ├── ai.py           # Gemini 2.5 Flash — анализ текста и фото
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── screens/    # Dashboard, AddFood, Profile
    │   ├── components/ # BottomNav, FoodCard, CircularProgress
    │   ├── hooks/      # useTelegram
    │   └── api.ts      # HTTP-клиент к бэкенду
    └── vite.config.ts
```

---

## ⚡ Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/kwzz37/bot_call.git
cd bot_call
```

### 2. Настроить бэкенд

```bash
cd backend
cp .env.example .env
```

Открыть `.env` и вставить ключ Gemini API:

```env
GEMINI_API_KEY=ваш_ключ_здесь
GEMINI_MODEL=gemini-2.5-flash-lite
```

> 🔑 Получить ключ: [aistudio.google.com](https://aistudio.google.com/app/apikey)

Установить зависимости и запустить:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API будет доступен на `http://localhost:8000` · Docs: `http://localhost:8000/docs`

### 3. Запустить фронтенд

```bash
cd ../frontend
npm install
npm run dev
```

Фронтенд запустится на `http://localhost:5173`

### 4. Настроить туннель (для Telegram)

Telegram Mini Apps требуют **HTTPS**. Используйте ngrok:

```bash
ngrok http 5173
```

Скопируйте URL вида `https://xxxx.ngrok-free.app` и вставьте его в `bot.py`:

```python
WEBAPP_URL = "https://xxxx.ngrok-free.app"
```

### 5. Запустить бота

```bash
cd ..
pip install aiogram
python bot.py
```

---

## 🔌 API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/init-user` | Создать/обновить пользователя |
| `GET` | `/api/stats?user_id=&date=` | Статистика за день |
| `PATCH` | `/api/user/{user_id}` | Обновить цели пользователя |
| `POST` | `/api/add-text` | Добавить еду по описанию (AI) |
| `POST` | `/api/analyze-photo` | Добавить еду по фото (AI Vision) |
| `DELETE` | `/api/food/{log_id}` | Удалить запись |
| `GET` | `/health` | Проверка состояния сервера |

---

## 🛠️ Технологии

| Слой | Технологии |
|------|------------|
| **Бот** | Python 3.11+, aiogram 3 |
| **Бэкенд** | FastAPI, SQLite, Pydantic v2 |
| **ИИ** | Google Gemini 2.5 Flash (текст + vision) |
| **Фронтенд** | React 18, TypeScript, Tailwind CSS, Vite |
| **Инфраструктура** | Telegram Mini Apps API |

---

## 📝 Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|-------------|
| `GEMINI_API_KEY` | API-ключ Google AI Studio | — |
| `GEMINI_MODEL` | Модель Gemini | `gemini-2.5-flash-lite` |

---

<div align="center">

Made with ❤️ for Telegram

</div>
