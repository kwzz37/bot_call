import sys
import subprocess
import os

print("⏳ Начинаю обновление библиотек...")

try:
    # Эта команда заставит python найти свой pip и обновить библиотеку
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-U", "google-generativeai"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-U", "aiogram"])
    print("\n✅ УСПЕШНО! Все обновлено.")
    print("Теперь запускай бота.")
except Exception as e:
    print(f"\n❌ Ошибка: {e}")

input("\nНажми Enter, чтобы выйти...")