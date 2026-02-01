import os
from dotenv import load_dotenv

load_dotenv()

# ==================== ОСНОВНЫЕ НАСТРОЙКИ ====================

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", 0))
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://gift-bot-pi.vercel.app")

# Дополнительные админы (можно указать несколько через запятую)
ADMIN_IDS = [ADMIN_ID] + [
    int(x.strip()) for x in os.getenv("EXTRA_ADMINS", "").split(",") 
    if x.strip().isdigit()
]

# ==================== TON НАСТРОЙКИ ====================

# Адрес кошелька для приёма депозитов
DEPOSIT_WALLET = os.getenv("DEPOSIT_WALLET", "UQB6crKdkA_kwYjiq18CPDcJc2BeWwJurkjYsnR7xCfIuM2v")

# API ключ для toncenter.com (бесплатно на https://toncenter.com/)
# Без ключа лимит 1 запрос/сек, с ключом - 10 запросов/сек
TONCENTER_API_KEY = os.getenv("TONCENTER_API_KEY", "")

# Использовать тестовую сеть TON (для разработки)
TON_TESTNET = os.getenv("TON_TESTNET", "false").lower() == "true"

# Курс конвертации: 1 TON = X звёзд
TON_TO_STARS = int(os.getenv("TON_TO_STARS", 100))

# Минимальные суммы
MIN_DEPOSIT_TON = float(os.getenv("MIN_DEPOSIT_TON", 0.1))  # 0.1 TON
MIN_WITHDRAW_TON = float(os.getenv("MIN_WITHDRAW_TON", 0.1))  # 0.1 TON
MIN_WITHDRAW_STARS = int(MIN_WITHDRAW_TON * TON_TO_STARS)

# Максимальный возраст транзакции для верификации (минуты)
TX_MAX_AGE_MINUTES = int(os.getenv("TX_MAX_AGE_MINUTES", 60))

# ==================== TELEGRAM STARS ====================

# Включить Telegram Stars как способ оплаты
ENABLE_TELEGRAM_STARS = os.getenv("ENABLE_TELEGRAM_STARS", "true").lower() == "true"

# Курс: 1 Telegram Star = X внутренних звёзд
TG_STAR_TO_INTERNAL = int(os.getenv("TG_STAR_TO_INTERNAL", 1))

# ==================== ЛИМИТЫ И БЕЗОПАСНОСТЬ ====================

# Rate limiting для депозитов
DEPOSIT_RATE_LIMIT = int(os.getenv("DEPOSIT_RATE_LIMIT", 5))  # запросов
DEPOSIT_RATE_WINDOW = int(os.getenv("DEPOSIT_RATE_WINDOW", 300))  # секунд (5 мин)

# Rate limiting для выводов
WITHDRAW_RATE_LIMIT = int(os.getenv("WITHDRAW_RATE_LIMIT", 3))  # запросов
WITHDRAW_RATE_WINDOW = int(os.getenv("WITHDRAW_RATE_WINDOW", 3600))  # секунд (1 час)

# Максимальный вывод за раз
MAX_WITHDRAW_STARS = int(os.getenv("MAX_WITHDRAW_STARS", 100000))  # 1000 TON

# Интервал мониторинга транзакций (секунды)
TX_MONITOR_INTERVAL = int(os.getenv("TX_MONITOR_INTERVAL", 30))

# ==================== ИГРОВЫЕ НАСТРОЙКИ ====================

# Game settings (demo - fair chances)
CASE_PRICES = {
    "common": 10,
    "rare": 50,
    "epic": 100,
    "legendary": 500
}

SPIN_PRICES = [10, 25, 50, 100, 250]

# Стартовый бонус для новых пользователей
WELCOME_BONUS = int(os.getenv("WELCOME_BONUS", 100))

# Реферальный бонус
REFERRAL_BONUS = int(os.getenv("REFERRAL_BONUS", 25))

# Demo gifts database
GIFTS = [
    {"id": 1, "name": "🎁 Простой подарок", "value": 5, "rarity": "common"},
    {"id": 2, "name": "🎀 Красивая коробка", "value": 15, "rarity": "common"},
    {"id": 3, "name": "🧸 Плюшевый мишка", "value": 30, "rarity": "rare"},
    {"id": 4, "name": "💎 Кристалл", "value": 75, "rarity": "rare"},
    {"id": 5, "name": "👑 Корона", "value": 150, "rarity": "epic"},
    {"id": 6, "name": "🚀 Ракета", "value": 300, "rarity": "epic"},
    {"id": 7, "name": "🏆 Золотой кубок", "value": 500, "rarity": "legendary"},
    {"id": 8, "name": "💰 Сундук с золотом", "value": 1000, "rarity": "legendary"},
]

# Rarity chances (fair, transparent)
RARITY_CHANCES = {
    "common": {"common": 0.70, "rare": 0.25, "epic": 0.04, "legendary": 0.01},
    "rare": {"common": 0.40, "rare": 0.45, "epic": 0.12, "legendary": 0.03},
    "epic": {"common": 0.20, "rare": 0.40, "epic": 0.30, "legendary": 0.10},
    "legendary": {"common": 0.10, "rare": 0.30, "epic": 0.35, "legendary": 0.25},
}

# ==================== ФУНКЦИИ-ПОМОЩНИКИ ====================

def is_admin(user_id: int) -> bool:
    """Проверяет, является ли пользователь админом"""
    return user_id in ADMIN_IDS

def validate_config():
    """Проверяет корректность конфигурации"""
    errors = []
    
    if not BOT_TOKEN:
        errors.append("BOT_TOKEN not set")
    
    if not ADMIN_ID:
        errors.append("ADMIN_ID not set")
    
    if not DEPOSIT_WALLET:
        errors.append("DEPOSIT_WALLET not set")
    
    if not WEBAPP_URL:
        errors.append("WEBAPP_URL not set (WebApp won't work)")
    
    return errors
