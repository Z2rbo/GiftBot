# 🎰 Настройка бота в Telegram

## Шаг 1: Описание бота (BotFather)

Отправь @BotFather команду `/setdescription` и вставь:

```
🎰 GiftBot Casino — играй и выигрывай!

🎮 4 мини-игры: Слоты, Краш, Монетка, Кости
📦 Кейсы с уникальными подарками
💰 Мгновенный вывод в TON

🎁 Бонусы:
• 100 ⭐ новым игрокам
• Ежедневные бонусы до 120 ⭐
• Система достижений

🏆 Честная игра • Быстрые выплаты

💬 Поддержка: @valuueee
```

---

## Шаг 2: Короткое описание (About)

Отправь @BotFather команду `/setabouttext` и вставь:

```
🎰 Казино-бот с мини-играми и кейсами!
Слоты • Краш • Монетка • Кейсы
💎 Выводи выигрыши в TON
```

---

## Шаг 3: Команды бота

Отправь @BotFather команду `/setcommands` и вставь:

```
start - 🚀 Начать игру
profile - 👤 Мой профиль
referrals - 👥 Реферальная программа
rules - 📋 Правила
support - 💬 Поддержка
```

---

## Шаг 4: Меню веб-приложения

Отправь @BotFather команду `/setmenubutton` и выбери:
- Тип: `web_app`
- Название: `🎮 Играть`
- URL: `https://webapp-nine-navy.vercel.app`

---

## Шаг 5: Аватарка бота

### Вариант A: Сгенерировать с помощью AI

Используй этот промпт в Midjourney, DALL-E или другом генераторе:

```
A modern 3D casino game icon for Telegram bot, featuring a golden slot machine with stars and gifts around it, purple and gold gradient background, neon glow effects, cryptocurrency coins (TON) floating, minimalist style, app icon format, 1:1 aspect ratio, high quality, no text
```

### Вариант B: Создать в Canva

1. Открой canva.com
2. Создай дизайн 512x512 px
3. Используй:
   - Градиентный фон (фиолетовый → розовый)
   - Эмодзи 🎰 или иконку слот-машины
   - Звёзды ⭐ вокруг
   - Неоновое свечение

### Вариант C: Готовые ресурсы

- flaticon.com (иконки казино)
- icons8.com (3D иконки)
- freepik.com (готовые дизайны)

### Загрузка аватарки

Отправь @BotFather команду `/setuserpic` и прикрепи изображение (512x512 px, PNG/JPG).

---

## Шаг 6: Настройка платежей (опционально)

Для приёма Telegram Stars:
1. Напиши @BotFather `/mybots`
2. Выбери бота → Payments
3. Подключи провайдера (Stripe, ЮKassa и др.)

---

## ✅ Чеклист готовности

- [ ] Описание бота установлено
- [ ] About текст установлен
- [ ] Команды добавлены
- [ ] Web App кнопка настроена
- [ ] Аватарка загружена
- [ ] Бот задеплоен на сервер

---

## 📱 Полезные ссылки

- BotFather: @BotFather
- Документация: https://core.telegram.org/bots
- TON Connect: https://ton.org/dev/dapps/ton-connect
