# 🎰 GiftBot Casino

Telegram мини-апп казино с играми, кейсами и криптовыплатами.

## ✨ Особенности

### 🎮 Игры
- **Слоты** — классические 3-барабанные слоты с множителями до x50
- **Краш** — выбери множитель и успей забрать до краша
- **Монетка** — орёл или решка, x1.95 на выигрыш
- **Кости** — угадай число, x5 на победу

### 📦 Кейсы
- 4 уровня редкости: Стартовый, Премиум, Мега, Легендарный
- Уникальные предметы с разной ценностью
- Продажа предметов в звёзды

### 💰 Финансы
- **TON Wallet** — пополнение и вывод через TON Connect
- **Metamask** — поддержка ETH
- **Telegram Stars** — внутренняя валюта

### 🎁 Бонусная система
- **Daily Bonus** — ежедневный бонус с системой стриков (до 120⭐)
- **Джекпот** — живой счётчик с шансом выиграть
- **Достижения** — 6 достижений с наградами
- **Рефералы** — 25⭐ за каждого друга

## 📁 Структура проекта

```
TelegramGiftBot/
├── bot.py              # Основной бот
├── config.py           # Конфигурация
├── database.py         # Работа с БД
├── .env                # Переменные окружения
├── requirements.txt    # Зависимости Python
├── Procfile            # Для Railway/Heroku
├── Dockerfile          # Docker образ
├── docker-compose.yml  # Docker Compose
├── railway.json        # Конфиг Railway
├── render.yaml         # Конфиг Render
├── DEPLOYMENT.md       # Гайд по деплою
├── BOT_SETUP.md        # Настройка бота в Telegram
├── bot_avatar.png      # Аватарка бота
└── webapp/
    ├── index.html      # Главная страница
    ├── style.css       # Стили
    ├── app.js          # Логика приложения
    ├── server.py       # Локальный сервер
    ├── tonconnect-manifest.json
    └── vercel.json     # Конфиг Vercel
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 2. Настройка .env

```env
BOT_TOKEN=your_bot_token_from_botfather
ADMIN_ID=your_telegram_id
WEBAPP_URL=https://your-webapp-url.vercel.app
```

### 3. Запуск бота

```bash
python bot.py
```

### 4. Запуск WebApp (локально)

```bash
cd webapp
python server.py
# Используй ngrok для HTTPS: ngrok http 8080
```

## ☁️ Деплой

### Бот (Railway/Render)
См. [DEPLOYMENT.md](DEPLOYMENT.md)

### WebApp (Vercel)
1. Загрузи папку `webapp` на GitHub
2. Подключи к Vercel
3. Деплой автоматически!

## ⚙️ Настройка бота в Telegram

См. [BOT_SETUP.md](BOT_SETUP.md) для:
- Описание и About бота
- Команды
- Меню Web App
- Загрузка аватарки

## 📱 Скриншоты

### Главный экран
- Daily Bonus баннер
- Live Jackpot счётчик
- Карусель игр
- Кейсы по редкости

### Функции
- Инвентарь с продажей предметов
- История игр с фильтрами
- Лидерборд по профиту/победам/играм
- Профиль со статистикой

## 🔧 API для бота

WebApp отправляет данные боту через `tg.sendData()`:

```javascript
// Результат игры
{ action: 'game_result', game: 'slots', won: true, amount: 150 }

// Запрос на вывод
{ action: 'withdrawal_request', method: 'ton', amount: 1000 }

// Достижение
{ action: 'achievement', id: 'first_win', reward: 10 }
```

## 👨‍💻 Поддержка

По всем вопросам: [@valuueee](https://t.me/valuueee)

## 📄 Лицензия

MIT License
