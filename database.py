import aiosqlite
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any

DB_PATH = "bot_database.db"
logger = logging.getLogger(__name__)


async def init_db():
    """Initialize database tables"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Users table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                balance INTEGER DEFAULT 100,
                total_deposited INTEGER DEFAULT 0,
                total_withdrawn INTEGER DEFAULT 0,
                cases_opened INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                referrer_id INTEGER,
                referral_bonus INTEGER DEFAULT 0,
                is_banned INTEGER DEFAULT 0,
                ban_reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_active TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Inventory table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                gift_id INTEGER,
                gift_name TEXT,
                gift_value INTEGER,
                obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
                is_withdrawn INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        
        # Withdrawal requests table (old - для инвентаря)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS withdrawals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                inventory_id INTEGER,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                processed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        
        # Transaction history
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT,
                amount INTEGER,
                description TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        
        # Wallets table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                wallet_type TEXT,
                wallet_address TEXT,
                connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_used TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                UNIQUE(user_id, wallet_type, wallet_address)
            )
        """)
        
        # ========== НОВЫЕ ТАБЛИЦЫ ДЛЯ ПЛАТЕЖЕЙ ==========
        
        # Верифицированные платежи TON
        await db.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tx_hash TEXT UNIQUE NOT NULL,
                amount_nano INTEGER NOT NULL,
                amount_ton REAL NOT NULL,
                amount_stars INTEGER NOT NULL,
                sender_wallet TEXT,
                status TEXT DEFAULT 'pending',
                error_message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                verified_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        
        # Заявки на вывод TON
        await db.execute("""
            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount_stars INTEGER NOT NULL,
                amount_ton REAL NOT NULL,
                wallet_address TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                tx_hash TEXT,
                admin_id INTEGER,
                admin_note TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                processed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        
        # Telegram Stars платежи
        await db.execute("""
            CREATE TABLE IF NOT EXISTS stars_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                telegram_payment_id TEXT UNIQUE,
                amount_stars INTEGER NOT NULL,
                payload TEXT,
                status TEXT DEFAULT 'completed',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        
        # Создаём индексы для быстрого поиска
        await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_tx ON payments(tx_hash)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawal_requests(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status)")
        
        await db.commit()
        logger.info("Database initialized successfully")


async def get_user(user_id: int):
    """Get user by ID"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ) as cursor:
            return await cursor.fetchone()


async def create_user(user_id: int, username: str, referrer_id: int = None):
    """Create new user"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO users (user_id, username, referrer_id) 
               VALUES (?, ?, ?)""",
            (user_id, username, referrer_id)
        )
        
        # Give referral bonus
        if referrer_id:
            await db.execute(
                "UPDATE users SET balance = balance + 25, referral_bonus = referral_bonus + 25 WHERE user_id = ?",
                (referrer_id,)
            )
        
        await db.commit()


async def update_balance(user_id: int, amount: int, description: str = ""):
    """Update user balance and log transaction"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET balance = balance + ? WHERE user_id = ?",
            (amount, user_id)
        )
        
        tx_type = "deposit" if amount > 0 else "spend"
        await db.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)",
            (user_id, tx_type, amount, description)
        )
        
        await db.commit()


async def get_balance(user_id: int) -> int:
    """Get user balance"""
    user = await get_user(user_id)
    return user["balance"] if user else 0


async def increment_stat(user_id: int, stat: str):
    """Increment user statistic"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            f"UPDATE users SET {stat} = {stat} + 1 WHERE user_id = ?",
            (user_id,)
        )
        await db.commit()


async def add_to_inventory(user_id: int, gift_id: int, gift_name: str, gift_value: int):
    """Add gift to user inventory"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO inventory (user_id, gift_id, gift_name, gift_value) VALUES (?, ?, ?, ?)",
            (user_id, gift_id, gift_name, gift_value)
        )
        await db.commit()


async def get_inventory(user_id: int):
    """Get user inventory"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM inventory WHERE user_id = ? AND is_withdrawn = 0 ORDER BY obtained_at DESC",
            (user_id,)
        ) as cursor:
            return await cursor.fetchall()


async def request_withdrawal(user_id: int, inventory_id: int):
    """Create withdrawal request"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Mark item as withdrawn
        await db.execute(
            "UPDATE inventory SET is_withdrawn = 1 WHERE id = ? AND user_id = ?",
            (inventory_id, user_id)
        )
        
        # Create withdrawal request
        await db.execute(
            "INSERT INTO withdrawals (user_id, inventory_id) VALUES (?, ?)",
            (user_id, inventory_id)
        )
        
        await db.commit()


async def get_pending_withdrawals():
    """Get all pending withdrawals (admin)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT w.*, i.gift_name, i.gift_value, u.username 
            FROM withdrawals w
            JOIN inventory i ON w.inventory_id = i.id
            JOIN users u ON w.user_id = u.user_id
            WHERE w.status = 'pending'
        """) as cursor:
            return await cursor.fetchall()


async def process_withdrawal(withdrawal_id: int, status: str):
    """Process withdrawal request (admin)"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE withdrawals SET status = ?, processed_at = ? WHERE id = ?",
            (status, datetime.now().isoformat(), withdrawal_id)
        )
        await db.commit()


async def save_wallet(user_id: int, wallet_type: str, wallet_address: str):
    """Save or update user wallet"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO wallets (user_id, wallet_type, wallet_address, last_used)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, (user_id, wallet_type, wallet_address))
        await db.commit()


async def get_user_wallets(user_id: int):
    """Get all wallets for a user"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM wallets WHERE user_id = ? ORDER BY last_used DESC",
            (user_id,)
        ) as cursor:
            return await cursor.fetchall()


async def get_all_wallets():
    """Get all wallets (admin)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT w.*, u.username, u.user_id
            FROM wallets w
            JOIN users u ON w.user_id = u.user_id
            ORDER BY w.connected_at DESC
        """) as cursor:
            return await cursor.fetchall()


async def get_user_stats(user_id: int):
    """Get user statistics"""
    user = await get_user(user_id)
    if not user:
        return None
    
    async with aiosqlite.connect(DB_PATH) as db:
        # Count referrals
        async with db.execute(
            "SELECT COUNT(*) FROM users WHERE referrer_id = ?", (user_id,)
        ) as cursor:
            referrals = (await cursor.fetchone())[0]
        
        # Count inventory items
        async with db.execute(
            "SELECT COUNT(*), COALESCE(SUM(gift_value), 0) FROM inventory WHERE user_id = ? AND is_withdrawn = 0",
            (user_id,)
        ) as cursor:
            inv_count, inv_value = await cursor.fetchone()
    
    return {
        "balance": user["balance"],
        "total_deposited": user["total_deposited"],
        "total_withdrawn": user["total_withdrawn"],
        "cases_opened": user["cases_opened"],
        "games_played": user["games_played"],
        "referrals": referrals,
        "referral_bonus": user["referral_bonus"],
        "inventory_count": inv_count,
        "inventory_value": inv_value,
    }


# ==================== PAYMENTS ====================

async def create_pending_payment(
    user_id: int, 
    tx_hash: str, 
    amount_nano: int,
    amount_ton: float,
    amount_stars: int,
    sender_wallet: str
) -> Optional[int]:
    """Создаёт запись о pending платеже"""
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cursor = await db.execute("""
                INSERT INTO payments (user_id, tx_hash, amount_nano, amount_ton, amount_stars, sender_wallet, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            """, (user_id, tx_hash, amount_nano, amount_ton, amount_stars, sender_wallet))
            await db.commit()
            return cursor.lastrowid
        except aiosqlite.IntegrityError:
            # Транзакция уже существует
            logger.warning(f"Duplicate payment attempt: {tx_hash}")
            return None


async def verify_payment(tx_hash: str) -> bool:
    """Помечает платёж как верифицированный"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE payments 
            SET status = 'verified', verified_at = CURRENT_TIMESTAMP
            WHERE tx_hash = ? AND status = 'pending'
        """, (tx_hash,))
        await db.commit()
        return True


async def fail_payment(tx_hash: str, error: str) -> bool:
    """Помечает платёж как неуспешный"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE payments 
            SET status = 'failed', error_message = ?
            WHERE tx_hash = ?
        """, (error, tx_hash))
        await db.commit()
        return True


async def get_payment_by_tx_hash(tx_hash: str) -> Optional[Dict]:
    """Получает платёж по хешу транзакции"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM payments WHERE tx_hash = ?", (tx_hash,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def get_user_payments(user_id: int, limit: int = 50) -> List[Dict]:
    """Получает историю платежей пользователя"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM payments 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (user_id, limit)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def get_pending_payments() -> List[Dict]:
    """Получает все pending платежи"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT p.*, u.username 
            FROM payments p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.status = 'pending'
            ORDER BY p.created_at ASC
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


# ==================== WITHDRAWAL REQUESTS ====================

async def create_withdrawal_request(
    user_id: int,
    amount_stars: int,
    amount_ton: float,
    wallet_address: str
) -> Optional[int]:
    """Создаёт заявку на вывод"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Проверяем баланс
        user = await get_user(user_id)
        if not user or user["balance"] < amount_stars:
            return None
        
        # Списываем со счёта
        await db.execute(
            "UPDATE users SET balance = balance - ? WHERE user_id = ?",
            (amount_stars, user_id)
        )
        
        # Создаём заявку
        cursor = await db.execute("""
            INSERT INTO withdrawal_requests (user_id, amount_stars, amount_ton, wallet_address, status)
            VALUES (?, ?, ?, ?, 'pending')
        """, (user_id, amount_stars, amount_ton, wallet_address))
        
        # Логируем транзакцию
        await db.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)",
            (user_id, "withdraw_request", -amount_stars, f"Withdrawal to {wallet_address[:16]}...")
        )
        
        await db.commit()
        return cursor.lastrowid


async def get_withdrawal_request(request_id: int) -> Optional[Dict]:
    """Получает заявку на вывод по ID"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT w.*, u.username 
            FROM withdrawal_requests w
            JOIN users u ON w.user_id = u.user_id
            WHERE w.id = ?
        """, (request_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def get_pending_withdrawal_requests() -> List[Dict]:
    """Получает все pending заявки на вывод"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT w.*, u.username 
            FROM withdrawal_requests w
            JOIN users u ON w.user_id = u.user_id
            WHERE w.status = 'pending'
            ORDER BY w.created_at ASC
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def approve_withdrawal(
    request_id: int, 
    admin_id: int, 
    tx_hash: str = None,
    note: str = None
) -> bool:
    """Одобряет заявку на вывод"""
    async with aiosqlite.connect(DB_PATH) as db:
        request = await get_withdrawal_request(request_id)
        if not request or request["status"] != "pending":
            return False
        
        await db.execute("""
            UPDATE withdrawal_requests 
            SET status = 'completed', 
                admin_id = ?,
                tx_hash = ?,
                admin_note = ?,
                processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (admin_id, tx_hash, note, request_id))
        
        # Обновляем статистику пользователя
        await db.execute(
            "UPDATE users SET total_withdrawn = total_withdrawn + ? WHERE user_id = ?",
            (request["amount_stars"], request["user_id"])
        )
        
        await db.commit()
        return True


async def reject_withdrawal(
    request_id: int, 
    admin_id: int, 
    reason: str = None
) -> bool:
    """Отклоняет заявку на вывод и возвращает средства"""
    async with aiosqlite.connect(DB_PATH) as db:
        request = await get_withdrawal_request(request_id)
        if not request or request["status"] != "pending":
            return False
        
        # Возвращаем средства
        await db.execute(
            "UPDATE users SET balance = balance + ? WHERE user_id = ?",
            (request["amount_stars"], request["user_id"])
        )
        
        await db.execute("""
            UPDATE withdrawal_requests 
            SET status = 'rejected', 
                admin_id = ?,
                admin_note = ?,
                processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (admin_id, reason, request_id))
        
        # Логируем возврат
        await db.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)",
            (request["user_id"], "refund", request["amount_stars"], f"Withdrawal rejected: {reason}")
        )
        
        await db.commit()
        return True


async def get_user_withdrawal_requests(user_id: int, limit: int = 20) -> List[Dict]:
    """Получает историю заявок пользователя"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM withdrawal_requests 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (user_id, limit)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


# ==================== TELEGRAM STARS ====================

async def save_stars_payment(
    user_id: int,
    telegram_payment_id: str,
    amount_stars: int,
    payload: str = None
) -> Optional[int]:
    """Сохраняет платёж Telegram Stars"""
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cursor = await db.execute("""
                INSERT INTO stars_payments (user_id, telegram_payment_id, amount_stars, payload)
                VALUES (?, ?, ?, ?)
            """, (user_id, telegram_payment_id, amount_stars, payload))
            
            # Начисляем баланс
            await db.execute(
                "UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE user_id = ?",
                (amount_stars, amount_stars, user_id)
            )
            
            # Логируем
            await db.execute(
                "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)",
                (user_id, "stars_deposit", amount_stars, f"Telegram Stars payment")
            )
            
            await db.commit()
            return cursor.lastrowid
        except aiosqlite.IntegrityError:
            logger.warning(f"Duplicate Stars payment: {telegram_payment_id}")
            return None


# ==================== ADMIN & ANALYTICS ====================

async def get_daily_stats() -> Dict:
    """Получает статистику за сегодня"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Новые пользователи
        async with db.execute(
            "SELECT COUNT(*) FROM users WHERE created_at LIKE ?", (f"{today}%",)
        ) as cursor:
            new_users = (await cursor.fetchone())[0]
        
        # Депозиты
        async with db.execute("""
            SELECT COUNT(*), COALESCE(SUM(amount_stars), 0) 
            FROM payments 
            WHERE status = 'verified' AND verified_at LIKE ?
        """, (f"{today}%",)) as cursor:
            row = await cursor.fetchone()
            deposits_count, deposits_sum = row[0], row[1]
        
        # Выводы
        async with db.execute("""
            SELECT COUNT(*), COALESCE(SUM(amount_stars), 0) 
            FROM withdrawal_requests 
            WHERE status = 'completed' AND processed_at LIKE ?
        """, (f"{today}%",)) as cursor:
            row = await cursor.fetchone()
            withdrawals_count, withdrawals_sum = row[0], row[1]
        
        # Stars платежи
        async with db.execute("""
            SELECT COUNT(*), COALESCE(SUM(amount_stars), 0) 
            FROM stars_payments 
            WHERE created_at LIKE ?
        """, (f"{today}%",)) as cursor:
            row = await cursor.fetchone()
            stars_count, stars_sum = row[0], row[1]
        
        return {
            "date": today,
            "new_users": new_users,
            "deposits": {"count": deposits_count, "sum": deposits_sum},
            "withdrawals": {"count": withdrawals_count, "sum": withdrawals_sum},
            "stars_payments": {"count": stars_count, "sum": stars_sum}
        }


async def ban_user(user_id: int, reason: str = None) -> bool:
    """Банит пользователя"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET is_banned = 1, ban_reason = ? WHERE user_id = ?",
            (reason, user_id)
        )
        await db.commit()
        return True


async def unban_user(user_id: int) -> bool:
    """Разбанивает пользователя"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET is_banned = 0, ban_reason = NULL WHERE user_id = ?",
            (user_id,)
        )
        await db.commit()
        return True


async def is_user_banned(user_id: int) -> bool:
    """Проверяет, забанен ли пользователь"""
    user = await get_user(user_id)
    return bool(user and user.get("is_banned"))
