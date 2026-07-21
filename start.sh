#!/bin/bash
# Запуск Telegram-бота в фоновом режиме
python bot.py &

# Переход в папку бэкенда и запуск FastAPI сервера на порту, который выдаст Render
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
