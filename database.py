import aiosqlite
from datetime import datetime

DB_PATH = "bot_database.db"


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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
        
        # Withdrawal requests table
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
        
        await db.commit()


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
