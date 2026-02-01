import asyncio
import logging
import json
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    Message, CallbackQuery, WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton,
    LabeledPrice, PreCheckoutQuery
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.enums import ParseMode

from config import (
    BOT_TOKEN, ADMIN_ID, WEBAPP_URL, DEPOSIT_WALLET, TON_TO_STARS,
    MIN_WITHDRAW_STARS, MAX_WITHDRAW_STARS, ENABLE_TELEGRAM_STARS,
    is_admin, validate_config, REFERRAL_BONUS, WELCOME_BONUS
)
from database import (
    init_db, get_user, create_user, update_balance, get_balance,
    get_user_stats, get_pending_withdrawals, process_withdrawal,
    save_wallet, get_user_wallets, get_all_wallets,
    create_pending_payment, verify_payment, fail_payment, get_payment_by_tx_hash,
    create_withdrawal_request, get_pending_withdrawal_requests,
    approve_withdrawal, reject_withdrawal, get_withdrawal_request,
    save_stars_payment, get_daily_stats, ban_user, unban_user, is_user_banned
)
from ton_service import get_ton_service, deposit_limiter, withdraw_limiter
from background_tasks import start_background_tasks, stop_background_tasks

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
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
        InlineKeyboardButton(text="💳 Пополнить", callback_data="deposit"),
        InlineKeyboardButton(text="💸 Вывести", callback_data="withdraw")
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

Тебе начислено <b>{WELCOME_BONUS} ⭐</b> для старта!

🎮 Нажми <b>«Играть»</b> чтобы открыть игры:
• 🎰 Слоты
• 🪙 Орёл и решка  
• 🚀 Краш
• 📦 Кейсы

💎 Пополняй баланс через <b>TON</b> или <b>Telegram Stars</b>
"""
        if referrer_id:
            welcome_text += f"\n🎁 <b>+{REFERRAL_BONUS}⭐</b> бонус по реферальной ссылке!"
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

Приглашай друзей и получай <b>{REFERRAL_BONUS}⭐</b> за каждого!

🔗 <b>Твоя ссылка:</b>
<code>{ref_link}</code>

📊 <b>Статистика:</b>
├ Приглашено: <b>{stats['referrals']}</b>
└ Заработано: <b>{stats['referral_bonus']} ⭐</b>

💡 Друг тоже получит бонус при регистрации!
"""
    await callback.message.edit_text(text, reply_markup=back_kb(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "deposit")
async def show_deposit(callback: CallbackQuery):
    """Показывает варианты пополнения"""
    builder = InlineKeyboardBuilder()
    
    if ENABLE_TELEGRAM_STARS:
        builder.row(
            InlineKeyboardButton(text="⭐ Telegram Stars", callback_data="deposit_stars")
        )
    
    builder.row(
        InlineKeyboardButton(text="💎 TON Wallet", callback_data="deposit_ton")
    )
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="back"))
    
    text = f"""
💳 <b>Пополнение баланса</b>

Выберите способ оплаты:

⭐ <b>Telegram Stars</b> - мгновенно, через Telegram
💎 <b>TON Wallet</b> - криптовалюта TON

Курс: <b>1 TON = {TON_TO_STARS} ⭐</b>
"""
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "deposit_stars")
async def deposit_stars_menu(callback: CallbackQuery):
    """Показывает варианты покупки через Stars"""
    if not ENABLE_TELEGRAM_STARS:
        await callback.answer("Telegram Stars недоступны", show_alert=True)
        return
    
    builder = InlineKeyboardBuilder()
    
    packages = [
        (100, 100),
        (250, 250),
        (500, 500),
        (1000, 1000),
    ]
    
    for tg_stars, internal_stars in packages:
        builder.row(
            InlineKeyboardButton(
                text=f"⭐ {internal_stars} звёзд — {tg_stars} Stars",
                callback_data=f"buy_stars_{tg_stars}_{internal_stars}"
            )
        )
    
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="deposit"))
    
    text = """
⭐ <b>Пополнение через Telegram Stars</b>

Выберите пакет:

✅ Мгновенное зачисление
✅ Безопасная оплата через Telegram
"""
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "deposit_ton")
async def deposit_ton_info(callback: CallbackQuery):
    """Показывает информацию о пополнении через TON"""
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="🎮 Открыть кошелёк в игре", web_app=WebAppInfo(url=WEBAPP_URL)))
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="deposit"))
    
    text = f"""
💎 <b>Пополнение через TON</b>

Для пополнения через TON:
1. Откройте игру (кнопка ниже)
2. Перейдите в раздел "Кошелёк"
3. Подключите TON кошелёк
4. Выберите сумму и оплатите

📍 <b>Адрес для пополнения:</b>
<code>{DEPOSIT_WALLET}</code>

💡 Курс: <b>1 TON = {TON_TO_STARS} ⭐</b>
⏰ Зачисление: 1-5 минут
"""
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "withdraw")
async def show_withdraw(callback: CallbackQuery):
    """Показывает информацию о выводе"""
    user_id = callback.from_user.id
    balance = await get_balance(user_id)
    
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="💸 Вывести в игре", web_app=WebAppInfo(url=WEBAPP_URL)))
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="back"))
    
    min_ton = MIN_WITHDRAW_STARS / TON_TO_STARS
    
    text = f"""
💸 <b>Вывод средств</b>

💰 Ваш баланс: <b>{balance} ⭐</b>

Для вывода:
1. Откройте игру
2. Подключите TON кошелёк
3. Перейдите в раздел "Вывод"
4. Укажите сумму

📋 <b>Условия:</b>
├ Минимум: {MIN_WITHDRAW_STARS} ⭐ ({min_ton} TON)
├ Максимум: {MAX_WITHDRAW_STARS} ⭐
└ Обработка: до 24 часов
"""
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "rules")
async def show_rules(callback: CallbackQuery):
    text = f"""
📋 <b>Правила</b>

1️⃣ Минимальная ставка: <b>10 ⭐</b>
2️⃣ Вывод от <b>{MIN_WITHDRAW_STARS} ⭐</b>
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


# ==================== TELEGRAM STARS PAYMENTS ====================

@router.callback_query(F.data.startswith("buy_stars_"))
async def process_buy_stars(callback: CallbackQuery):
    """Создаёт счёт на оплату Telegram Stars"""
    parts = callback.data.split("_")
    tg_stars = int(parts[2])
    internal_stars = int(parts[3])
    
    prices = [LabeledPrice(label=f"Пополнение {internal_stars} ⭐", amount=tg_stars)]
    
    await callback.message.answer_invoice(
        title="Пополнение баланса",
        description=f"Вы получите {internal_stars} звёзд на игровой баланс",
        payload=f"stars_{callback.from_user.id}_{internal_stars}",
        currency="XTR",
        prices=prices,
        provider_token=""
    )
    await callback.answer()


@router.pre_checkout_query()
async def process_pre_checkout(query: PreCheckoutQuery):
    """Подтверждает предоплатный запрос"""
    if await is_user_banned(query.from_user.id):
        await query.answer(ok=False, error_message="Ваш аккаунт заблокирован")
        return
    
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def process_successful_payment(message: Message):
    """Обрабатывает успешный платёж Telegram Stars"""
    payment = message.successful_payment
    user_id = message.from_user.id
    
    payload = payment.invoice_payload
    parts = payload.split("_")
    
    if len(parts) >= 3 and parts[0] == "stars":
        amount_stars = int(parts[2])
        
        payment_id = await save_stars_payment(
            user_id=user_id,
            telegram_payment_id=payment.telegram_payment_charge_id,
            amount_stars=amount_stars,
            payload=payload
        )
        
        if payment_id:
            new_balance = await get_balance(user_id)
            await message.answer(
                f"✅ <b>Оплата прошла успешно!</b>\n\n"
                f"⭐ Начислено: <b>{amount_stars} звёзд</b>\n"
                f"💰 Ваш баланс: <b>{new_balance} ⭐</b>",
                parse_mode=ParseMode.HTML
            )
            logger.info(f"Stars payment: {user_id} - {amount_stars} stars")
        else:
            await message.answer(
                "⚠️ Произошла ошибка. Обратитесь в поддержку.",
                parse_mode=ParseMode.HTML
            )


# ==================== WEBAPP DATA ====================

@router.message(F.web_app_data)
async def handle_webapp_data(message: Message):
    """Handle data from WebApp"""
    try:
        data = json.loads(message.web_app_data.data)
        user_id = message.from_user.id
        
        if await is_user_banned(user_id):
            await message.answer("❌ Ваш аккаунт заблокирован.")
            return
        
        action = data.get('action')
        
        if action == 'sync_balance':
            new_balance = data.get('balance', 0)
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
        
        elif action == 'wallet_connected':
            wallet_type = data.get('wallet_type')
            wallet_address = data.get('wallet_address')
            
            if wallet_type and wallet_address:
                await save_wallet(user_id, wallet_type, wallet_address)
                logger.info(f"Wallet saved: {user_id} - {wallet_type}: {wallet_address}")
        
        elif action == 'deposit':
            await handle_deposit_action(message, user_id, data)
        
        elif action == 'withdraw_request':
            await handle_withdraw_action(message, user_id, data)
            
    except Exception as e:
        logger.error(f"WebApp data error: {e}")


async def handle_deposit_action(message: Message, user_id: int, data: dict):
    """Обрабатывает депозит с верификацией"""
    
    if not deposit_limiter.is_allowed(user_id):
        wait_time = deposit_limiter.get_wait_time(user_id)
        await message.answer(
            f"⏳ Слишком много запросов. Подождите {wait_time} секунд.",
            parse_mode=ParseMode.HTML
        )
        return
    
    tx_hash = data.get('tx_hash')
    amount_ton = data.get('amount_ton', 0)
    amount_stars = data.get('amount_stars', 0)
    wallet = data.get('wallet', 'unknown')
    
    if not tx_hash:
        await message.answer(
            "⏳ Депозит обрабатывается. Ожидайте подтверждения...",
            parse_mode=ParseMode.HTML
        )
        return
    
    existing = await get_payment_by_tx_hash(tx_hash)
    if existing:
        await message.answer(
            "⚠️ Эта транзакция уже была обработана.",
            parse_mode=ParseMode.HTML
        )
        return
    
    amount_nano = int(amount_ton * 1_000_000_000)
    payment_id = await create_pending_payment(
        user_id=user_id,
        tx_hash=tx_hash,
        amount_nano=amount_nano,
        amount_ton=amount_ton,
        amount_stars=amount_stars,
        sender_wallet=wallet
    )
    
    if not payment_id:
        await message.answer(
            "⚠️ Ошибка обработки платежа.",
            parse_mode=ParseMode.HTML
        )
        return
    
    ton_service = get_ton_service()
    if ton_service:
        result = await ton_service.verify_transaction(
            tx_hash=tx_hash,
            expected_amount_ton=amount_ton,
            sender_address=wallet
        )
        
        if result["valid"]:
            await verify_payment(tx_hash)
            await update_balance(user_id, amount_stars, f"TON deposit: {tx_hash[:16]}...")
            
            await message.answer(
                f"✅ Баланс пополнен на <b>{amount_stars} ⭐</b>!",
                parse_mode=ParseMode.HTML
            )
            
            if ADMIN_ID:
                try:
                    admin_text = f"💰 Депозит: @{message.from_user.username} +{amount_stars}⭐ ({amount_ton} TON)"
                    await message.bot.send_message(ADMIN_ID, admin_text)
                except:
                    pass
            
            logger.info(f"Deposit verified: {user_id} - {amount_ton} TON")
            return
        
        elif result["code"] == "NOT_FOUND":
            await message.answer(
                "⏳ Транзакция обрабатывается... Баланс будет начислен автоматически.",
                parse_mode=ParseMode.HTML
            )
            return
        else:
            await fail_payment(tx_hash, result.get("error", "Unknown"))
            await message.answer(
                f"❌ Ошибка: {result.get('error', 'Неизвестная ошибка')}",
                parse_mode=ParseMode.HTML
            )
            return
    
    await message.answer(
        "⏳ Депозит в обработке. Баланс будет начислен после подтверждения.",
        parse_mode=ParseMode.HTML
    )


async def handle_withdraw_action(message: Message, user_id: int, data: dict):
    """Обрабатывает запрос на вывод"""
    
    if not withdraw_limiter.is_allowed(user_id):
        wait_time = withdraw_limiter.get_wait_time(user_id)
        await message.answer(
            f"⏳ Подождите {wait_time // 60} минут.",
            parse_mode=ParseMode.HTML
        )
        return
    
    amount_stars = data.get('amount_stars', 0)
    wallet = data.get('wallet', '')
    
    if amount_stars < MIN_WITHDRAW_STARS:
        await message.answer(
            f"❌ Минимум: {MIN_WITHDRAW_STARS} ⭐",
            parse_mode=ParseMode.HTML
        )
        return
    
    if amount_stars > MAX_WITHDRAW_STARS:
        await message.answer(
            f"❌ Максимум: {MAX_WITHDRAW_STARS} ⭐",
            parse_mode=ParseMode.HTML
        )
        return
    
    if not wallet or len(wallet) < 20:
        await message.answer("❌ Некорректный адрес кошелька.", parse_mode=ParseMode.HTML)
        return
    
    balance = await get_balance(user_id)
    if balance < amount_stars:
        await message.answer(
            f"❌ Недостаточно средств. Баланс: {balance} ⭐",
            parse_mode=ParseMode.HTML
        )
        return
    
    amount_ton = amount_stars / TON_TO_STARS
    request_id = await create_withdrawal_request(
        user_id=user_id,
        amount_stars=amount_stars,
        amount_ton=amount_ton,
        wallet_address=wallet
    )
    
    if not request_id:
        await message.answer("❌ Ошибка создания заявки.", parse_mode=ParseMode.HTML)
        return
    
    await message.answer(
        f"📤 Заявка #{request_id} создана!\n\n"
        f"💎 Сумма: <b>{amount_ton:.4f} TON</b>\n"
        f"⏳ Обработка: до 24 часов",
        parse_mode=ParseMode.HTML
    )
    
    if ADMIN_ID:
        try:
            builder = InlineKeyboardBuilder()
            builder.row(
                InlineKeyboardButton(text="✅", callback_data=f"wd_approve_{request_id}"),
                InlineKeyboardButton(text="❌", callback_data=f"wd_reject_{request_id}")
            )
            admin_text = f"💸 Вывод #{request_id}: @{message.from_user.username} - {amount_ton:.4f} TON\n📍 {wallet}"
            await message.bot.send_message(ADMIN_ID, admin_text, reply_markup=builder.as_markup())
        except:
            pass
    
    logger.info(f"Withdraw #{request_id}: {user_id} - {amount_stars} stars")


# ==================== ADMIN ====================

@router.message(Command("admin"))
async def admin_panel(message: Message):
    if not is_admin(message.from_user.id):
        return
    
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="💸 Заявки", callback_data="admin_withdrawals"),
        InlineKeyboardButton(text="📊 Статистика", callback_data="admin_stats")
    )
    
    await message.answer("🔐 <b>Админ-панель</b>", reply_markup=builder.as_markup(), parse_mode=ParseMode.HTML)


@router.callback_query(F.data == "admin_withdrawals")
async def admin_withdrawals(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return
    
    withdrawals = await get_pending_withdrawal_requests()
    
    if not withdrawals:
        await callback.message.edit_text("📋 Нет pending заявок")
        await callback.answer()
        return
    
    text = f"💸 <b>Заявки ({len(withdrawals)})</b>\n\n"
    
    builder = InlineKeyboardBuilder()
    for w in withdrawals[:10]:
        text += f"#{w['id']} @{w['username']}: {w['amount_ton']:.4f} TON\n"
        builder.row(
            InlineKeyboardButton(text=f"✅ #{w['id']}", callback_data=f"wd_approve_{w['id']}"),
            InlineKeyboardButton(text=f"❌ #{w['id']}", callback_data=f"wd_reject_{w['id']}")
        )
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return
    
    stats = await get_daily_stats()
    
    text = f"""
📊 <b>Статистика {stats['date']}</b>

👥 Новых: {stats['new_users']}
💰 Депозиты: {stats['deposits']['sum']} ⭐
💸 Выводы: {stats['withdrawals']['sum']} ⭐
⭐ Stars: {stats['stars_payments']['sum']} ⭐
"""
    
    await callback.message.edit_text(text, parse_mode=ParseMode.HTML)
    await callback.answer()


@router.callback_query(F.data.startswith("wd_approve_"))
async def approve_wd(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return
    
    request_id = int(callback.data.split("_")[2])
    success = await approve_withdrawal(request_id, callback.from_user.id)
    
    if success:
        request = await get_withdrawal_request(request_id)
        if request:
            try:
                await callback.bot.send_message(
                    request["user_id"],
                    f"✅ Вывод #{request_id} одобрен! {request['amount_ton']:.4f} TON",
                    parse_mode=ParseMode.HTML
                )
            except:
                pass
        await callback.answer("✅ Одобрено")
    else:
        await callback.answer("❌ Ошибка", show_alert=True)


@router.callback_query(F.data.startswith("wd_reject_"))
async def reject_wd(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return
    
    request_id = int(callback.data.split("_")[2])
    success = await reject_withdrawal(request_id, callback.from_user.id, "Rejected")
    
    if success:
        request = await get_withdrawal_request(request_id)
        if request:
            try:
                await callback.bot.send_message(
                    request["user_id"],
                    f"❌ Вывод #{request_id} отклонён. Средства возвращены.",
                    parse_mode=ParseMode.HTML
                )
            except:
                pass
        await callback.answer("❌ Отклонено, средства возвращены")
    else:
        await callback.answer("❌ Ошибка", show_alert=True)


@router.message(Command("wallets"))
async def show_wallets(message: Message):
    if not is_admin(message.from_user.id):
        return
    
    wallets = await get_all_wallets()
    
    if not wallets:
        await message.answer("💼 Нет кошельков")
        return
    
    text = f"💼 <b>Кошельки ({len(wallets)})</b>\n\n"
    for w in wallets[:20]:
        text += f"@{w['username']}: <code>{w['wallet_address'][:20]}...</code>\n"
    
    await message.answer(text, parse_mode=ParseMode.HTML)


@router.message(Command("ban"))
async def cmd_ban(message: Message):
    if not is_admin(message.from_user.id):
        return
    
    try:
        parts = message.text.split(maxsplit=2)
        user_id = int(parts[1])
        reason = parts[2] if len(parts) > 2 else "No reason"
    except:
        await message.answer("Использование: /ban <user_id> [reason]")
        return
    
    await ban_user(user_id, reason)
    await message.answer(f"🔨 Пользователь {user_id} забанен")


@router.message(Command("unban"))
async def cmd_unban(message: Message):
    if not is_admin(message.from_user.id):
        return
    
    try:
        user_id = int(message.text.split()[1])
    except:
        await message.answer("Использование: /unban <user_id>")
        return
    
    await unban_user(user_id)
    await message.answer(f"✅ Пользователь {user_id} разбанен")


@router.message(Command("addbalance"))
async def add_balance(message: Message):
    """Add test balance (admin)"""
    if not is_admin(message.from_user.id):
        return
    
    try:
        parts = message.text.split()
        if len(parts) == 2:
            amount = int(parts[1])
            user_id = message.from_user.id
        else:
            user_id = int(parts[1])
            amount = int(parts[2])
        
        if 0 < amount <= 100000:
            user = await get_user(user_id)
            if not user:
                await create_user(user_id, f"user_{user_id}")
            await update_balance(user_id, amount, "Admin add")
            balance = await get_balance(user_id)
            await message.answer(f"✅ +{amount}⭐ | Баланс: {balance}⭐")
    except:
        await message.answer("Использование: /addbalance [user_id] <amount>")


# ==================== MAIN ====================

async def on_startup(bot: Bot):
    await start_background_tasks(bot)
    
    if ADMIN_ID:
        try:
            await bot.send_message(ADMIN_ID, "🚀 Бот запущен!")
        except:
            pass
    
    logger.info("Bot started")


async def on_shutdown(bot: Bot):
    await stop_background_tasks()
    logger.info("Bot stopped")


async def main():
    config_errors = validate_config()
    for error in config_errors:
        logger.warning(f"Config: {error}")
    
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN not set!")
        return
    
    await init_db()
    logger.info("Database initialized")
    
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)
    
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)
    
    logger.info(f"Starting bot... WebApp: {WEBAPP_URL}")
    
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
