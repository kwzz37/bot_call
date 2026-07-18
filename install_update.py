import sys
import subprocess

print("⏳ Удаляем старую библиотеку и ставим новую (google-genai)...")

packages = [
    "google-generativeai", # Удаляем старую, если получится, или обновляем
    "google-genai",        # Ставим НОВУЮ
    "aiogram",
    "pillow"               # Нужна для обработки картинок в новой версии
]

try:
    # Обновляем pip
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    
    # Ставим нужные пакеты
    for package in packages:
        print(f"📦 Обработка {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-U", package])
        
    print("\n✅ УСПЕШНО! Все библиотеки обновлены.")
    print("Теперь обновляй код бота (шаг 2) и запускай.")
except Exception as e:
    print(f"\n❌ Ошибка: {e}")

input("\nНажми Enter, чтобы выйти...")