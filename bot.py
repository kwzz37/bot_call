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

# ─── Настройки ───────────────────────────────────────────────

BOT_TOKEN = "7980220992:AAEgZyWHirJZBFSIAhVpQZikg6cs--ktJbA"
WEBAPP_URL = "https://kind-suits-stand.loca.lt"   # ← замените на ваш URL

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
        "Я помогу тебе следить за калориями.\n"
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