import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

# ─── Настройки ───────────────────────────────────────────────

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = "https://distinguished-producers-leaving-brings.trycloudflare.com"   # ← HTTPS обязателен для Telegram

# ─── Bot & Dispatcher ────────────────────────────────────────

bot = Bot(token=BOT_TOKEN)
dp  = Dispatcher()

# ─── Handlers ────────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="Открыть Трекер 📱",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])

    await message.answer(
        f"Привет, <b>{message.from_user.first_name}</b>! 👋\n\n"
        f"Ссылка: {WEBAPP_URL}\n\n"
        "Нажми кнопку ниже, чтобы открыть трекер:",
        parse_mode="HTML",
        reply_markup=keyboard,
    )

# ─── Entry point ─────────────────────────────────────────────

async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())