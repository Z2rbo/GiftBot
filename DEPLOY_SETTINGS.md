# ⚙️ Настройки деплоя

## 🚂 Railway (для бота)

### Настройки проекта:

**Application Preset:** Не требуется (автоопределение)

**Build Command:** Оставь пустым
- Railway сам определит что это Python проект

**Start Command:** 
```
python bot.py
```

**Python Version:** 
- Оставь по умолчанию (Railway выберет автоматически)
- Или укажи: `3.11`

**Environment Variables:**
```
BOT_TOKEN=8540839249:AAHjvnJ2GREJLK9DqsQgMfQbOk_9P-2MA7M
ADMIN_ID=5637106500
WEBAPP_URL=https://gift-bot-pi.vercel.app
```

---

## 🌐 Vercel (для WebApp)

### Настройки проекта:

**Framework Preset:** 
```
Other
```

**Root Directory:** 
```
webapp
```

**Build Command:** 
```
(оставь пустым - статический сайт)
```

**Output Directory:** 
```
(оставь пустым)
```

**Install Command:** 
```
(оставь пустым)
```

**Environment Variables:** 
```
(не требуются для статического сайта)
```

---

## 📋 Пошаговая инструкция

### Railway:

1. Зайди на railway.app
2. New Project → Deploy from GitHub
3. Выбери репозиторий `Z2rbo/GiftBot`
4. Railway автоматически определит настройки
5. Перейди в Variables → добавь переменные окружения
6. Готово! Бот запустится автоматически

### Vercel:

1. Зайди на vercel.com
2. Add New → Project
3. Выбери репозиторий `Z2rbo/GiftBot`
4. В разделе "Configure Project":
   - **Root Directory:** `webapp`
   - **Framework Preset:** `Other`
5. Нажми Deploy
6. Готово!

---

## ✅ Проверка

После деплоя проверь:

**Railway:**
- Вкладка "Deployments" → статус должен быть зелёный ✅
- Вкладка "Logs" → должны быть логи запуска бота

**Vercel:**
- Должен появиться URL вида: `https://giftbot-xxx.vercel.app`
- Открой URL в браузере → должен открыться веб-апп

---

## 🔧 Если что-то не работает

**Railway:**
- Проверь логи в разделе "Logs"
- Убедись что все переменные окружения добавлены
- Проверь что `requirements.txt` есть в проекте

**Vercel:**
- Убедись что Root Directory указан как `webapp`
- Проверь что файлы `index.html`, `app.js`, `style.css` есть в папке webapp
