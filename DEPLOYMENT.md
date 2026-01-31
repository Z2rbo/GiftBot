# 🚀 Деплой GiftBot - Автономная работа 24/7

## Вариант 1: Railway (Рекомендуется - бесплатно)

### Шаги:
1. Зарегистрируйся на [railway.app](https://railway.app)
2. Нажми "New Project" → "Deploy from GitHub repo"
3. Подключи свой GitHub репозиторий
4. Добавь переменные окружения:
   - `BOT_TOKEN` = твой токен бота
   - `ADMIN_ID` = твой Telegram ID
   - `WEBAPP_URL` = https://webapp-nine-navy.vercel.app
5. Railway автоматически задеплоит бота!

### Команды для загрузки на GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

---

## Вариант 2: Render (Бесплатно)

### Шаги:
1. Зарегистрируйся на [render.com](https://render.com)
2. Создай "New Web Service"
3. Подключи GitHub репозиторий
4. Настройки:
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python bot.py`
5. Добавь Environment Variables (BOT_TOKEN, ADMIN_ID, WEBAPP_URL)
6. Деплой!

---

## Вариант 3: VPS (Ubuntu Server)

### Установка:
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Python
sudo apt install python3 python3-pip python3-venv -y

# Клонирование проекта
git clone https://github.com/USERNAME/REPO.git
cd REPO

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Создание .env файла
nano .env
# Вставь: BOT_TOKEN=xxx, ADMIN_ID=xxx, WEBAPP_URL=xxx
```

### Запуск через systemd (автозапуск):
```bash
sudo nano /etc/systemd/system/giftbot.service
```

Вставь:
```ini
[Unit]
Description=GiftBot Telegram Bot
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/REPO
Environment=PATH=/home/ubuntu/REPO/venv/bin
ExecStart=/home/ubuntu/REPO/venv/bin/python bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запуск:
```bash
sudo systemctl daemon-reload
sudo systemctl enable giftbot
sudo systemctl start giftbot
sudo systemctl status giftbot  # Проверка статуса
```

---

## Вариант 4: Docker

```bash
# Сборка образа
docker build -t giftbot .

# Запуск
docker run -d \
  --name giftbot \
  --restart unless-stopped \
  -e BOT_TOKEN=your_token \
  -e ADMIN_ID=your_id \
  -e WEBAPP_URL=your_url \
  -v $(pwd)/bot_database.db:/app/bot_database.db \
  giftbot
```

Или через docker-compose:
```bash
docker-compose up -d
```

---

## ⚠️ Важно

1. **Никогда не публикуй .env файл** - добавь его в .gitignore
2. **Создай .gitignore:**
```
.env
__pycache__/
*.pyc
bot_database.db
venv/
```

3. **Для продакшена** рекомендуется использовать PostgreSQL вместо SQLite

---

## 🔧 Проверка работы

- Бот должен отвечать на /start
- Логи можно смотреть в панели Railway/Render
- Для VPS: `sudo journalctl -u giftbot -f`
