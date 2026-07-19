import requests
from google import genai
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

# Вставь ключ
API_KEY = os.getenv("GEMINI_API_KEY")
print("🔍 ШАГ 1. Проверяем, какой IP видит Python...")
try:
    # Проверяем, через какую страну реально идет запрос
    response = requests.get("https://ipinfo.io/json", timeout=5)
    data = response.json()
    country = data.get('country', 'Неизвестно')
    ip = data.get('ip', 'Неизвестно')
    print(f"🌍 Твоя страна для Python: {country}")
    print(f"💻 Твой IP: {ip}")
    
    if country in ["RU", "BY"]:
        print("\n❌ ПРОБЛЕМА НАЙДЕНА: Python видит, что ты в РФ/РБ.")
        print("Твой VPN работает только для браузера, но не для консоли.")
        print("Решение: Нужен VPN, который туннелирует ВЕСЬ трафик системы (например, TunMode в программах типа Nekoray/V2Ray или обычный ProtonVPN).")
    else:
        print("\n✅ С VPN всё ок, страна подходит.")
        
except Exception as e:
    print(f"❌ Ошибка проверки IP: {e}")

print("\n" + "="*30 + "\n")

print("🔍 ШАГ 2. Спрашиваем у Google список моделей...")
if API_KEY == "ТВОЙ_КЛЮЧ_ЗДЕСЬ":
    print("⚠️ Ты забыл вставить API ключ в этот скрипт!")
else:
    try:
        client = genai.Client(api_key=API_KEY)
        # Получаем список моделей, доступных ИМЕННО ТЕБЕ
        models = client.models.list()
        
        found_any = False
        print("📋 Список доступных тебе моделей:")
        for m in models:
            # Ищем модели, которые умеют генерировать текст
            if "generateContent" in m.supported_actions:
                print(f"🔹 {m.name}")
                found_any = True
        
        if not found_any:
            print("\n❌ СПИСОК ПУСТ. Google блокирует запросы с этого IP (даже если страна ок).")
            print("Попробуй сменить сервер VPN.")
        else:
            print("\n✅ УРА! Бери любое название из списка выше (например, gemini-1.5-flash) и вставляй в бота.")

    except Exception as e:
        print(f"\n❌ ОШИБКА Google API: {e}")
        if "404" in str(e):
            print("👉 Это 100% блокировка по региону. Меняй VPN или страну в VPN.")