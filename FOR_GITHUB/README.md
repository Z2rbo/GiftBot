# 📦 ПАПКА ДЛЯ GITHUB

## 📋 Что здесь?

Эта папка содержит ВСЕ файлы проекта, которые нужно загрузить на GitHub.

---

## 🚀 Как использовать:

### Вариант 1: Через GitHub Desktop (проще)

1. Скачай GitHub Desktop: https://desktop.github.com
2. Установи и войди в аккаунт GitHub
3. File → Add Local Repository
4. Выбери папку **TelegramGiftBot** (родительскую, не эту!)
5. Нажми "Publish repository"
6. Готово! ✅

### Вариант 2: Через терминал

1. Открой PowerShell в папке **TelegramGiftBot**
2. Выполни команды:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ТВОЙ_ЛОГИН/GiftBot.git
git push -u origin main
```

*(замени ТВОЙ_ЛОГИН на свой логин GitHub)*

---

## ⚠️ ВАЖНО!

**НЕ загружай папку FOR_TELEGRAM на GitHub!**
Она только для тебя, чтобы загрузить в Telegram.

**НЕ загружай файл .env на GitHub!**
В нём твои секретные токены!

---

## ✅ Что будет на GitHub:

- ✅ Весь код бота (bot.py, database.py и т.д.)
- ✅ Веб-апп (папка webapp/)
- ✅ Файлы для деплоя (Dockerfile, Procfile и т.д.)
- ✅ Документация (README.md, DEPLOYMENT.md)

---

## 🔒 Безопасность:

Файл `.env` НЕ загрузится благодаря `.gitignore` ✅
