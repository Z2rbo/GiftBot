"""
Background Tasks - Фоновый мониторинг транзакций
"""

import asyncio
import logging
import re
from typing import Optional
from datetime import datetime, timedelta

from aiogram import Bot

from config import TX_MONITOR_INTERVAL, ADMIN_ID, DEPOSIT_WALLET, TONCENTER_API_KEY, TON_TESTNET, TON_TO_STARS
from ton_service import TONService, init_ton_service
from database import (
    get_user, create_user, update_balance,
    get_payment_by_tx_hash, create_pending_payment, verify_payment, get_pending_payments
)

logger = logging.getLogger(__name__)


class TransactionMonitor:
    """Мониторинг входящих TON транзакций"""
    
    def __init__(self, bot: Bot, ton_service: TONService):
        self.bot = bot
        self.ton_service = ton_service
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._monitor_loop())
        logger.info(f"Transaction monitor started. Interval: {TX_MONITOR_INTERVAL}s")
    
    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Transaction monitor stopped")
    
    async def _monitor_loop(self):
        await asyncio.sleep(5)
        
        while self._running:
            try:
                await self._check_new_deposits()
                await self._verify_pending_payments()
            except Exception as e:
                logger.error(f"Monitor error: {e}")
            
            await asyncio.sleep(TX_MONITOR_INTERVAL)
    
    async def _check_new_deposits(self):
        deposits = await self.ton_service.get_new_deposits()
        
        for tx in deposits:
            existing = await get_payment_by_tx_hash(tx["hash"])
            if existing:
                continue
            
            user_id = self._extract_user_id(tx.get("comment", ""))
            
            if user_id:
                await self._process_deposit(user_id, tx)
            else:
                logger.warning(f"Deposit without user_id: {tx['hash']}")
    
    def _extract_user_id(self, comment: str) -> Optional[int]:
        patterns = [r'deposit_(\d+)', r'user_(\d+)', r'^(\d{6,})$']
        
        for pattern in patterns:
            match = re.search(pattern, comment.strip())
            if match:
                return int(match.group(1))
        
        return None
    
    async def _process_deposit(self, user_id: int, tx: dict):
        amount_stars = self.ton_service.calculate_stars(tx["amount_ton"])
        
        payment_id = await create_pending_payment(
            user_id=user_id,
            tx_hash=tx["hash"],
            amount_nano=tx["amount"],
            amount_ton=tx["amount_ton"],
            amount_stars=amount_stars,
            sender_wallet=tx["sender"]
        )
        
        if not payment_id:
            return
        
        await verify_payment(tx["hash"])
        
        user = await get_user(user_id)
        if not user:
            await create_user(user_id, f"user_{user_id}")
        
        await update_balance(user_id, amount_stars, f"TON deposit: {tx['hash'][:16]}...")
        self.ton_service.mark_as_processed(tx["hash"])
        
        logger.info(f"Deposit: user={user_id}, {tx['amount_ton']} TON = {amount_stars} stars")
        
        try:
            await self.bot.send_message(
                user_id,
                f"✅ Баланс пополнен на <b>{amount_stars} ⭐</b>!",
                parse_mode="HTML"
            )
        except:
            pass
        
        if ADMIN_ID:
            try:
                await self.bot.send_message(
                    ADMIN_ID,
                    f"💰 Депозит: {user_id} +{amount_stars}⭐ ({tx['amount_ton']:.4f} TON)"
                )
            except:
                pass
    
    async def _verify_pending_payments(self):
        pending = await get_pending_payments()
        
        for payment in pending:
            result = await self.ton_service.verify_transaction(
                tx_hash=payment["tx_hash"],
                expected_amount_ton=payment["amount_ton"],
                sender_address=payment.get("sender_wallet")
            )
            
            if result["valid"]:
                await verify_payment(payment["tx_hash"])
                await update_balance(
                    payment["user_id"], 
                    payment["amount_stars"],
                    f"TON deposit verified"
                )
                
                logger.info(f"Pending verified: {payment['tx_hash']}")
                
                try:
                    await self.bot.send_message(
                        payment["user_id"],
                        f"✅ Депозит подтверждён: +{payment['amount_stars']} ⭐",
                        parse_mode="HTML"
                    )
                except:
                    pass


# Глобальные инстансы
tx_monitor: Optional[TransactionMonitor] = None


async def start_background_tasks(bot: Bot):
    """Запускает фоновые задачи"""
    global tx_monitor
    
    ton_service = init_ton_service(
        deposit_wallet=DEPOSIT_WALLET,
        api_key=TONCENTER_API_KEY,
        testnet=TON_TESTNET,
        ton_to_stars=TON_TO_STARS
    )
    
    tx_monitor = TransactionMonitor(bot, ton_service)
    await tx_monitor.start()
    
    logger.info("Background tasks started")


async def stop_background_tasks():
    """Останавливает фоновые задачи"""
    global tx_monitor
    
    if tx_monitor:
        await tx_monitor.stop()
    
    logger.info("Background tasks stopped")
