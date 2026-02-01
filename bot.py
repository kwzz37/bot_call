import asyncio
import logging
import sqlite3
from datetime import datetime
from PIL import Image

# Библиотеки Telegram
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.enums import ParseMode

# Библиотека Google
from google import genai

# ================= НАСТРОЙКИ =================

TELEGRAM_TOKEN = "7980220992:AAEgZyWHirJZBFSIAhVpQZikg6cs--ktJbA"
GEMINI_API_KEY = "AIzaSyAPnuJCUBA8QzxU8shSg96Rpf4qiB2exv8"

# 🔥 САМАЯ ВАЖНАЯ СТРОЧКА. 
# Если 2.5-flash выдает ошибки, используем lite версию или 2.0
MODEL_NAME = "gemini-2.5-flash-lite" 
# Запасные варианты (попробуй их, если lite не сработает):
# MODEL_NAME = "gemini-2.0-flash"
# MODEL_NAME = "gemini-2.0-flash-exp"

try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Ошибка ключа: {e}")

bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()

# ================= БАЗА ДАННЫХ =================

def init_db():
    conn = sqlite3.connect('diet_final.db')
    cur = conn.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS food_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, food_name TEXT, calories INTEGER, date TEXT)''')
    cur.execute('''CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY, weight REAL, height REAL, age INTEGER, gender TEXT, activity REAL, daily_goal INTEGER)''')
    conn.commit()
    conn.close()

def get_user(user_id):
    conn = sqlite3.connect('diet_final.db')
    cur = conn.cursor()
    cur.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
    return cur.fetchone()

def save_user(user_id, data):
    w, h, a = float(data['weight']), float(data['height']), int(data['age'])
    act = float(data['activity'])
    bmr = (10 * w + 6.25 * h - 5 * a + 5) if data['gender'] == 'male' else (10 * w + 6.25 * h - 5 * a - 161)
    goal = int(bmr * act)
    conn = sqlite3.connect('diet_final.db')
    cur = conn.cursor()
    cur.execute('INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?, ?, ?, ?)', (user_id, w, h, a, data['gender'], act, goal))
    conn.commit()
    conn.close()
    return goal

def add_food(user_id, food, cal):
    conn = sqlite3.connect('diet_final.db')
    cur = conn.cursor()
    cur.execute('INSERT INTO food_logs (user_id, food_name, calories, date) VALUES (?, ?, ?, ?)',
                (user_id, food, cal, datetime.now().strftime("%Y-%m-%d")))
    conn.commit()
    conn.close()

def get_today_food(user_id):
    conn = sqlite3.connect('diet_final.db')
    cur = conn.cursor()
    cur.execute('SELECT food_name, calories FROM food_logs WHERE user_id = ? AND date = ?', (user_id, datetime.now().strftime("%Y-%m-%d")))
    return cur.fetchall()

def clear_today(user_id):
    conn = sqlite3.connect('diet_final.db')
    cur = conn.cursor()
    cur.execute('DELETE FROM food_logs WHERE user_id = ? AND date = ?', (user_id, datetime.now().strftime("%Y-%m-%d")))
    conn.commit()
    conn.close()

# ================= ЛОГИКА БОТА =================

class Reg(StatesGroup):
    weight = State()
    height = State()
    age = State()
    gender = State()
    activity = State()

def main_kb():
    return ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="📊 Статистика"), KeyboardButton(text="🧠 Совет AI")],
        [KeyboardButton(text="🗑 Очистить день"), KeyboardButton(text="⚙️ Профиль")]
    ], resize_keyboard=True)

@dp.message(CommandStart())
async def start(message: Message, state: FSMContext):
    if get_user(message.from_user.id):
        await message.answer("Привет! Жду фото еды или текст.", reply_markup=main_kb())
    else:
        await message.answer("Введи вес (кг):")
        await state.set_state(Reg.weight)

@dp.message(Reg.weight)
async def r_weight(message: Message, state: FSMContext):
    await state.update_data(weight=message.text)
    await state.set_state(Reg.height)
    await message.answer("Рост (см):")

@dp.message(Reg.height)
async def r_height(message: Message, state: FSMContext):
    await state.update_data(height=message.text)
    await state.set_state(Reg.age)
    await message.answer("Возраст:")

@dp.message(Reg.age)
async def r_age(message: Message, state: FSMContext):
    await state.update_data(age=message.text)
    await state.set_state(Reg.gender)
    await message.answer("Пол:", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="М", callback_data="g_male"), InlineKeyboardButton(text="Ж", callback_data="g_female")]
    ]))

@dp.callback_query(Reg.gender)
async def r_gender(call: CallbackQuery, state: FSMContext):
    await state.update_data(gender=call.data.split("_")[1])
    await state.set_state(Reg.activity)
    await call.message.answer("Активность:", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Сидячая", callback_data="a_1.2"), InlineKeyboardButton(text="Спорт", callback_data="a_1.725")]
    ]))

@dp.callback_query(Reg.activity)
async def r_finish(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    data['activity'] = float(call.data.split("_")[1])
    save_user(call.from_user.id, data)
    await state.clear()
    await call.message.answer("Готово!", reply_markup=main_kb())

@dp.message(F.text == "📊 Статистика")
async def show_stats(message: Message):
    rows = get_today_food(message.from_user.id)
    total = sum(r[1] for r in rows)
    text = f"Всего: {total} ккал\n" + "\n".join([f"- {r[0]}: {r[1]}" for r in rows])
    await message.answer(text)

@dp.message(F.text == "🗑 Очистить день")
async def clear_stats(message: Message):
    clear_today(message.from_user.id)
    await message.answer("Очищено.")

@dp.message(F.text == "⚙️ Профиль")
async def reset_profile(message: Message, state: FSMContext):
    await state.set_state(Reg.weight)
    await message.answer("Вес:")

@dp.message(F.text == "🧠 Совет AI")
async def ask_ai(message: Message):
    wait = await message.answer("Думаю...")
    rows = get_today_food(message.from_user.id)
    food = ", ".join([f"{r[0]} ({r[1]})" for r in rows]) if rows else "ничего"
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=f"Я съел: {food}. Дай совет."
        )
        await wait.edit_text(response.text)
    except Exception as e:
        await wait.edit_text(f"Ошибка: {e}")

@dp.message(F.photo)
async def handle_photo(message: Message):
    msg = await message.answer("Смотрю...")
    try:
        file = await bot.get_file(message.photo[-1].file_id)
        downloaded = await bot.download_file(file.file_path)
        image = Image.open(downloaded)

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=["Определи блюдо и калории. Формат: Блюдо|100. Если не еда: Не еда|0", image]
        )
        
        text = response.text.strip()
        if "|" in text:
            name, cal = text.split("|")
            cal_int = int(''.join(filter(str.isdigit, cal)))
            add_food(message.from_user.id, name, cal_int)
            await msg.edit_text(f"✅ {name} — {cal_int} ккал")
        else:
            await msg.edit_text("Не разобрал.")
    except Exception as e:
        await msg.edit_text(f"Ошибка: {e}")

@dp.message(F.text)
async def handle_text(message: Message):
    try:
        name, cal = message.text.rsplit(' ', 1)
        add_food(message.from_user.id, name, int(cal))
        await message.answer(f"✅ {name} — {cal} ккал")
    except:
        try:
            response = client.models.generate_content(model=MODEL_NAME, contents=message.text)
            await message.answer(response.text)
        except Exception as e:
             await message.answer(f"Ошибка AI: {e}")

async def main():
    init_db()
    print(f"Бот запущен! Модель: {MODEL_NAME}")
    await dp.start_polling(bot)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass