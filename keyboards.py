from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
from config import CASE_PRICES, SPIN_PRICES

# WebApp URL - replace with your ngrok/hosting URL
WEBAPP_URL = "https://your-webapp-url.ngrok.io"  # Update this!


def main_menu_kb(webapp_url: str = None) -> InlineKeyboardMarkup:
    """Main menu keyboard"""
    builder = InlineKeyboardBuilder()
    
    # WebApp button (if URL is configured)
    if webapp_url and webapp_url != "https://your-webapp-url.ngrok.io":
        builder.row(
            InlineKeyboardButton(
                text="🌐 Открыть Web3 App",
                web_app=WebAppInfo(url=webapp_url)
            )
        )
    
    builder.row(
        InlineKeyboardButton(text="🎰 Игры", callback_data="menu_games"),
        InlineKeyboardButton(text="📦 Кейсы", callback_data="menu_cases")
    )
    builder.row(
        InlineKeyboardButton(text="🎡 Спины", callback_data="menu_spins"),
        InlineKeyboardButton(text="🎒 Инвентарь", callback_data="menu_inventory")
    )
    builder.row(
        InlineKeyboardButton(text="👤 Профиль", callback_data="menu_profile"),
        InlineKeyboardButton(text="💰 Пополнить", callback_data="menu_deposit")
    )
    builder.row(
        InlineKeyboardButton(text="👥 Рефералы", callback_data="menu_referrals")
    )
    return builder.as_markup()


def games_menu_kb() -> InlineKeyboardMarkup:
    """Games menu keyboard"""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🪙 Орёл и решка", callback_data="game_coinflip"),
        InlineKeyboardButton(text="🚀 Ракетка", callback_data="game_rocket")
    )
    builder.row(
        InlineKeyboardButton(text="⬆️ Апгрейд", callback_data="game_upgrade"),
        InlineKeyboardButton(text="🎰 Слоты", callback_data="game_slots")
    )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_main")
    )
    return builder.as_markup()


def cases_menu_kb() -> InlineKeyboardMarkup:
    """Cases menu keyboard"""
    builder = InlineKeyboardBuilder()
    for case_type, price in CASE_PRICES.items():
        emoji = {"common": "📦", "rare": "🎁", "epic": "💜", "legendary": "👑"}
        builder.row(
            InlineKeyboardButton(
                text=f"{emoji.get(case_type, '📦')} {case_type.title()} - {price}⭐",
                callback_data=f"case_open_{case_type}"
            )
        )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_main")
    )
    return builder.as_markup()


def spins_menu_kb() -> InlineKeyboardMarkup:
    """Spins menu keyboard"""
    builder = InlineKeyboardBuilder()
    for price in SPIN_PRICES:
        builder.add(
            InlineKeyboardButton(text=f"🎡 {price}⭐", callback_data=f"spin_{price}")
        )
    builder.adjust(3)
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_main")
    )
    return builder.as_markup()


def coinflip_kb(bet: int) -> InlineKeyboardMarkup:
    """Coin flip choice keyboard"""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🦅 Орёл", callback_data=f"flip_{bet}_heads"),
        InlineKeyboardButton(text="🪙 Решка", callback_data=f"flip_{bet}_tails")
    )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_games")
    )
    return builder.as_markup()


def bet_selection_kb(game: str) -> InlineKeyboardMarkup:
    """Bet selection keyboard"""
    builder = InlineKeyboardBuilder()
    bets = [10, 25, 50, 100, 250]
    for bet in bets:
        builder.add(
            InlineKeyboardButton(text=f"{bet}⭐", callback_data=f"bet_{game}_{bet}")
        )
    builder.adjust(3)
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_games")
    )
    return builder.as_markup()


def rocket_cashout_kb(bet: int) -> InlineKeyboardMarkup:
    """Rocket cashout multiplier selection"""
    builder = InlineKeyboardBuilder()
    multipliers = [1.5, 2.0, 3.0, 5.0, 10.0]
    for mult in multipliers:
        builder.add(
            InlineKeyboardButton(text=f"x{mult}", callback_data=f"rocket_{bet}_{mult}")
        )
    builder.adjust(3)
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_games")
    )
    return builder.as_markup()


def inventory_kb(items: list) -> InlineKeyboardMarkup:
    """Inventory keyboard with withdraw buttons"""
    builder = InlineKeyboardBuilder()
    for item in items[:10]:  # Limit to 10 items per page
        builder.row(
            InlineKeyboardButton(
                text=f"{item['gift_name']} ({item['gift_value']}⭐)",
                callback_data=f"inv_view_{item['id']}"
            ),
            InlineKeyboardButton(
                text="📤 Вывод",
                callback_data=f"inv_withdraw_{item['id']}"
            )
        )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_main")
    )
    return builder.as_markup()


def deposit_kb() -> InlineKeyboardMarkup:
    """Deposit options keyboard"""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="⭐ Telegram Stars", callback_data="deposit_stars"),
        InlineKeyboardButton(text="🎁 Подарком", callback_data="deposit_gift")
    )
    builder.row(
        InlineKeyboardButton(text="💎 Крипта", callback_data="deposit_crypto")
    )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_main")
    )
    return builder.as_markup()


def back_to_main_kb() -> InlineKeyboardMarkup:
    """Simple back button"""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_main")
    )
    return builder.as_markup()


def confirm_withdraw_kb(inv_id: int) -> InlineKeyboardMarkup:
    """Confirm withdrawal keyboard"""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="✅ Подтвердить", callback_data=f"confirm_withdraw_{inv_id}"),
        InlineKeyboardButton(text="❌ Отмена", callback_data="menu_inventory")
    )
    return builder.as_markup()


def upgrade_multiplier_kb(inv_id: int) -> InlineKeyboardMarkup:
    """Upgrade multiplier selection"""
    builder = InlineKeyboardBuilder()
    multipliers = [2, 3, 5, 10]
    for mult in multipliers:
        chance = int(100 / mult)
        builder.add(
            InlineKeyboardButton(
                text=f"x{mult} ({chance}%)",
                callback_data=f"upgrade_{inv_id}_{mult}"
            )
        )
    builder.adjust(2)
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu_games")
    )
    return builder.as_markup()


# Admin keyboards
def admin_withdrawals_kb(withdrawals: list) -> InlineKeyboardMarkup:
    """Admin withdrawal management"""
    builder = InlineKeyboardBuilder()
    for w in withdrawals[:10]:
        builder.row(
            InlineKeyboardButton(
                text=f"@{w['username']}: {w['gift_name']}",
                callback_data=f"admin_view_{w['id']}"
            ),
            InlineKeyboardButton(text="✅", callback_data=f"admin_approve_{w['id']}"),
            InlineKeyboardButton(text="❌", callback_data=f"admin_reject_{w['id']}")
        )
    return builder.as_markup()
