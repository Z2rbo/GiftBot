import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", 0))
WEBAPP_URL = os.getenv("WEBAPP_URL", "")  # Set your ngrok HTTPS URL here

# Game settings (demo - fair chances)
CASE_PRICES = {
    "common": 10,
    "rare": 50,
    "epic": 100,
    "legendary": 500
}

SPIN_PRICES = [10, 25, 50, 100, 250]

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
