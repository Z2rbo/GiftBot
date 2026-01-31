import asyncio
import logging
import json
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, CallbackQuery, WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.enums import ParseMode

from config import BOT_TOKEN, ADMIN_ID, WEBAPP_URL
from database import (
    init_db, get_user, create_user, update_balance, get_balance,
    get_user_stats, get_pending_withdrawals, process_withdrawal
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = Router()


# ==================== KEYBOARDS ====================

def main_menu_kb() -> InlineKeyboardMarkup:
    """Main menu with WebApp button"""
    builder = InlineKeyboardBuilder()
    
    if WEBAPP_URL:
        builder.row(
            InlineKeyboardButton(
                text="🎮 Играть",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
    
    builder.row(
        InlineKeyboardButton(text="👤 Профиль", callback_data="profile"),
        InlineKeyboardButton(text="👥 Рефералы", callback_data="referrals")
    )
    builder.row(
        InlineKeyboardButton(text="📋 Правила", callback_data="rules"),
        InlineKeyboardButton(text="💬 Поддержка", callback_data="support")
    )
    return builder.as_markup()


def back_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="back"))
    return builder.as_markup()


# ==================== HANDLERS ====================

@router.message(CommandStart())
async def cmd_start(message: Message):
    """Handle /start command"""
    user_id = message.from_user.id
    username = message.from_user.username or f"user_{user_id}"
    first_name = message.from_user.first_name or "Игрок"
    
    # Check for referral
    referrer_id = None
    if message.text and len(message.text.split()) > 1:
        try:
            referrer_id = int(message.text.split()[1])
            if referrer_id == user_id:
                referrer_id = None
        except ValueError:
            pass
    
    # Create user if not exists
    user = await get_user(user_id)
    if not user:
        await create_user(user_id, username, referrer_id)
        welcome_text = f"""
🎰 <b>Добро пожаловать, {first_name}!</b>

Тебе начислено <b>100 ⭐</b> для старта!

🎮 Нажми <b>«Играть»</b> чтобы открыть игры:
• 🎰 Слоты
• 🪙 Орёл и решка  
• 🚀 Краш
• 📦 Кейсы

💎 Пополняй баланс через <b>TON</b> или <b>Telegram Stars</b>
"""
        if referrer_id:
            welcome_text += "\n🎁 <b>+25⭐</b> бонус по реферальной ссылке!"
    else:
        balance = await get_balance(user_id)
        welcome_text = f"""
🎰 <b>С возвращением, {first_name}!</b>

💰 Твой баланс: <b>{balance} ⭐</b>

Нажми <b>«Играть»</b> чтобы продолжить!
"""
    
    await message.answer(welcome_text, reply_markup=main_menu_kb(), parse_mode=ParseMode.HTML)


@router.callback_query(F.data == "back")
async def back_to_menu(callback: CallbackQuery):
    user_id = callback.from_user.id
    first_name = callback.from_user.first_name or "Игрок"
    balance = await get_balance(user_id)
    
    text = f"""
🎰 <b>Главное меню</b>

Привет, {first_name}!
💰 Баланс: <b>{balance} ⭐</b>
"""
    await callback.message.edit_text(text, reply_markup=main_menu_kb(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "profile")
async def show_profile(callback: CallbackQuery):
    user_id = callback.from_user.id
    stats = await get_user_stats(user_id)
    
    if not stats:
        await callback.answer("Ошибка загрузки", show_alert=True)
        return
    
    text = f"""
👤 <b>Твой профиль</b>

💰 Баланс: <b>{stats['balance']} ⭐</b>
🎒 Инвентарь: <b>{stats['inventory_count']}</b> предметов

📊 <b>Статистика:</b>
├ Игр сыграно: <b>{stats['games_played']}</b>
├ Кейсов открыто: <b>{stats['cases_opened']}</b>
├ Пополнено: <b>{stats['total_deposited']} ⭐</b>
└ Выведено: <b>{stats['total_withdrawn']} ⭐</b>

👥 Рефералов: <b>{stats['referrals']}</b>
💎 Заработано с рефералов: <b>{stats['referral_bonus']} ⭐</b>
"""
    await callback.message.edit_text(text, reply_markup=back_kb(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "referrals")
async def show_referrals(callback: CallbackQuery):
    user_id = callback.from_user.id
    bot_info = await callback.bot.get_me()
    ref_link = f"https://t.me/{bot_info.username}?start={user_id}"
    stats = await get_user_stats(user_id)
    
    text = f"""
👥 <b>Реферальная программа</b>

Приглашай друзей и получай <b>25⭐</b> за каждого!

🔗 <b>Твоя ссылка:</b>
<code>{ref_link}</code>

📊 <b>Статистика:</b>
├ Приглашено: <b>{stats['referrals']}</b>
└ Заработано: <b>{stats['referral_bonus']} ⭐</b>

💡 Друг тоже получит бонус при регистрации!
"""
    await callback.message.edit_text(text, reply_markup=back_kb(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "rules")
async def show_rules(callback: CallbackQuery):
    text = """
📋 <b>Правила</b>

1️⃣ Минимальная ставка: <b>10 ⭐</b>
2️⃣ Вывод от <b>100 ⭐</b>
3️⃣ Один аккаунт на человека
4️⃣ Запрещено использование багов

⚠️ Нарушение правил = бан без возврата

🎲 Все игры честные, используется 
сертифицированный генератор случайных чисел.
"""
    await callback.message.edit_text(text, reply_markup=back_kb(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "support")
async def show_support(callback: CallbackQuery):
    text = """
💬 <b>Поддержка</b>

По всем вопросам пиши:
👤 @valuueee

⏰ Время ответа: до 24 часов

📝 При обращении укажи:
• Твой ID
• Суть проблемы
• Скриншоты (если есть)
"""
    await callback.message.edit_text(text, reply_markup=back_kb(), parse_mode=ParseMode.HTML)
    await callback.answer()


# ==================== WEBAPP DATA ====================

@router.message(F.web_app_data)
async def handle_webapp_data(message: Message):
    """Handle data from WebApp"""
    try:
        data = json.loads(message.web_app_data.data)
        user_id = message.from_user.id
        
        action = data.get('action')
        
        if action == 'sync_balance':
            new_balance = data.get('balance', 0)
            # Update balance in database
            current = await get_balance(user_id)
            diff = new_balance - current
            if diff != 0:
                await update_balance(user_id, diff, "WebApp sync")
            
            await message.answer(
                f"✅ Баланс синхронизирован: <b>{new_balance} ⭐</b>",
                parse_mode=ParseMode.HTML
            )
        
        elif action == 'game_result':
            game = data.get('game')
            won = data.get('won')
            amount = data.get('amount', 0)
            
            emoji = "🎉" if won else "😔"
            result = "Победа" if won else "Проигрыш"
            sign = "+" if won else "-"
            
            await message.answer(
                f"{emoji} <b>{result}!</b> {sign}{abs(amount)} ⭐",
                parse_mode=ParseMode.HTML
            )
            
    except Exception as e:
        logger.error(f"WebApp data error: {e}")


# ==================== ADMIN ====================

@router.message(Command("admin"))
async def admin_panel(message: Message):
    if message.from_user.id != ADMIN_ID:
        return
    
    withdrawals = await get_pending_withdrawals()
    
    if not withdrawals:
        await message.answer("📋 Нет заявок на вывод")
        return
    
    text = f"📋 <b>Заявки на вывод ({len(withdrawals)})</b>\n\n"
    
    builder = InlineKeyboardBuilder()
    for w in withdrawals[:10]:
        text += f"• @{w['username']}: {w['gift_name']} ({w['gift_value']}⭐)\n"
        builder.row(
            InlineKeyboardButton(text=f"✅ #{w['id']}", callback_data=f"approve_{w['id']}"),
            InlineKeyboardButton(text=f"❌ #{w['id']}", callback_data=f"reject_{w['id']}")
        )
    
    await message.answer(text, reply_markup=builder.as_markup(), parse_mode=ParseMode.HTML)


@router.callback_query(F.data.startswith("approve_"))
async def approve_withdrawal(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        return
    withdrawal_id = int(callback.data.split("_")[1])
    await process_withdrawal(withdrawal_id, "approved")
    await callback.answer("✅ Одобрено")


@router.callback_query(F.data.startswith("reject_"))
async def reject_withdrawal(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        return
    withdrawal_id = int(callback.data.split("_")[1])
    await process_withdrawal(withdrawal_id, "rejected")
    await callback.answer("❌ Отклонено")


# ==================== TEST ====================

@router.message(Command("addbalance"))
async def add_balance(message: Message):
    """Add test balance"""
    try:
        amount = int(message.text.split()[1])
        if 0 < amount <= 10000:
            user_id = message.from_user.id
            user = await get_user(user_id)
            if not user:
                await create_user(user_id, message.from_user.username or "")
            await update_balance(user_id, amount, "Test")
            balance = await get_balance(user_id)
            await message.answer(f"✅ +{amount}⭐\n💰 Баланс: {balance}⭐")
    except:
        await message.answer("Использование: /addbalance 100")


# ==================== MAIN ====================

async def main():
    if not BOT_TOKEN:
        print("[ERROR] BOT_TOKEN not set!")
        return
    
    await init_db()
    print("[OK] Database initialized")
    
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)
    
    print("[START] Bot running...")
    print(f"[INFO] WebApp URL: {WEBAPP_URL}")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
