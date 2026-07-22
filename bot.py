import asyncio
import logging
import os
import socket
import aiohttp
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)
from aiogram.client.session.aiohttp import AiohttpSession

load_dotenv("backend/.env")

# ─── Настройки ───────────────────────────────────────────────

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = "https://kwzz37.github.io/bot_call/"   # ← HTTPS обязателен для Telegram
BACKEND_URL = os.getenv("VITE_API_URL", "https://bot-call-wftl.onrender.com")

# ─── Bot & Dispatcher ────────────────────────────────────────

session = AiohttpSession()
# Force IPv4 to bypass aiohappyeyeballs WinError 121 timeouts
session._connector_init_kwargs = {"family": socket.AF_INET}

bot = Bot(token=BOT_TOKEN, session=session)
dp  = Dispatcher()

# ─── Background Ping / Keepalive ────────────────────────────

async def ping_backend() -> None:
    """Pre-wake / ping backend server to keep Render active."""
    try:
        async with aiohttp.ClientSession() as client:
            async with client.get(f"{BACKEND_URL}/health", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    logging.info("Backend health ping succeeded")
    except Exception as e:
        logging.warning(f"Backend health ping note: {e}")

async def keepalive_loop() -> None:
    """Periodically ping backend every 10 minutes so free Render instance never sleeps."""
    while True:
        await asyncio.sleep(600)  # 10 minutes
        await ping_backend()

# ─── Handlers ────────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    # Trigger background wake request immediately when user starts bot
    asyncio.create_task(ping_backend())

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

@dp.message()
async def wake_on_any_message(message: Message) -> None:
    asyncio.create_task(ping_backend())

# ─── Entry point ─────────────────────────────────────────────

async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    # Start background pinging to keep server awake
    asyncio.create_task(keepalive_loop())
    # Fire initial ping on bot launch
    asyncio.create_task(ping_backend())
    
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())