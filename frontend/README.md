# Calorie Tracker — Telegram Mini App Frontend

## Запуск проекта

Убедитесь, что у вас установлен [Node.js 18+](https://nodejs.org/).

```bash
cd c:\projects\bot_call\frontend

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev

# Сборка для продакшена
npm run build
```

Dev-сервер будет доступен по адресу: **http://localhost:5173**

---

## Структура проекта

```
frontend/
├── index.html              # HTML-точка входа (содержит Telegram WebApp JS)
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Корневой компонент (маршрутизация между экранами)
│   ├── index.css           # Глобальные стили (Tailwind + кастомные)
│   ├── hooks/
│   │   └── useTelegram.ts  # Хук для Telegram WebApp API
│   ├── types/
│   │   └── telegram.d.ts   # TypeScript типы для window.Telegram.WebApp
│   ├── components/
│   │   ├── CircularProgress.tsx  # SVG круговой прогресс-бар
│   │   ├── FoodCard.tsx          # Карточка приёма пищи
│   │   └── BottomNav.tsx         # Нижняя плавающая навигация
│   └── screens/
│       ├── Dashboard.tsx   # Главный экран
│       ├── AddFood.tsx     # Добавление еды (текст + фото + ИИ)
│       └── Profile.tsx     # Профиль и цели пользователя
```

---

## Интеграция с Telegram

Файл `src/hooks/useTelegram.ts` автоматически:
- Вызывает `tg.ready()` и `tg.expand()` при инициализации
- Предоставляет данные пользователя (`user`)
- Предоставляет haptic-функции (`tapImpact`, `successFeedback`, `errorFeedback`)

### Подключение к боту

Для подключения Mini App к боту добавьте в `bot.py`:
```python
# Укажите URL вашего задеплоенного фронтенда
WEB_APP_URL = "https://your-domain/frontend/dist"
```

---

## Замена мок-данных ИИ на реальный API

В файле `src/screens/AddFood.tsx` найдите блок:
```typescript
// Simulate AI response (replace with real API call)
const mockResult: Partial<FoodItem> = { ... }
```

Замените на реальный `fetch`-запрос к вашему бэкенду:
```typescript
const formData = new FormData();
formData.append('image', file);
const response = await fetch('/api/analyze-food', { method: 'POST', body: formData });
const result = await response.json();
setAiResult(result);
```
