"""
TON Blockchain Service - Верификация транзакций
"""

import aiohttp
import asyncio
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TONService:
    """Сервис для работы с TON блокчейном"""
    
    TONCENTER_MAINNET = "https://toncenter.com/api/v2"
    TONCENTER_TESTNET = "https://testnet.toncenter.com/api/v2"
    
    def __init__(
        self, 
        deposit_wallet: str,
        api_key: str = "",
        testnet: bool = False,
        ton_to_stars: int = 100
    ):
        self.deposit_wallet = deposit_wallet
        self.api_key = api_key
        self.testnet = testnet
        self.ton_to_stars = ton_to_stars
        self.base_url = self.TONCENTER_TESTNET if testnet else self.TONCENTER_MAINNET
        self._processed_transactions: set = set()
        self._last_lt: int = 0
        
        logger.info(f"TON Service initialized. Wallet: {deposit_wallet[:8]}...")
    
    async def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Выполняет HTTP запрос к API"""
        url = f"{self.base_url}{endpoint}"
        params = params or {}
        if self.api_key:
            params["api_key"] = self.api_key
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=30) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.error(f"API error {resp.status}")
                    return None
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
    
    async def get_transactions(self, limit: int = 100) -> List[Dict]:
        """Получает входящие транзакции"""
        params = {"address": self.deposit_wallet, "limit": limit}
        data = await self._make_request("/getTransactions", params)
        
        if not data or not data.get("ok"):
            return []
        
        transactions = []
        for tx in data.get("result", []):
            in_msg = tx.get("in_msg", {})
            if in_msg.get("source") and int(in_msg.get("value", 0)) > 0:
                tx_info = self._parse_transaction(tx)
                if tx_info:
                    transactions.append(tx_info)
        
        return transactions
    
    def _parse_transaction(self, tx: Dict) -> Optional[Dict]:
        """Парсит транзакцию"""
        try:
            in_msg = tx.get("in_msg", {})
            tx_id = tx.get("transaction_id", {})
            
            return {
                "hash": tx_id.get("hash", ""),
                "lt": int(tx_id.get("lt", 0)),
                "amount": int(in_msg.get("value", 0)),
                "amount_ton": int(in_msg.get("value", 0)) / 1_000_000_000,
                "sender": in_msg.get("source", ""),
                "timestamp": tx.get("utime", 0)
            }
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return None
    
    async def verify_transaction(
        self,
        tx_hash: str,
        expected_amount_ton: float,
        sender_address: Optional[str] = None,
        max_age_minutes: int = 60
    ) -> Dict[str, Any]:
        """Верифицирует транзакцию в блокчейне"""
        
        if tx_hash in self._processed_transactions:
            return {"valid": False, "error": "Already processed", "code": "DUPLICATE"}
        
        transactions = await self.get_transactions(limit=200)
        
        if not transactions:
            return {"valid": False, "error": "API error", "code": "API_ERROR"}
        
        for tx in transactions:
            if tx["hash"] == tx_hash:
                tx_time = datetime.fromtimestamp(tx["timestamp"])
                if datetime.now() - tx_time > timedelta(minutes=max_age_minutes):
                    return {"valid": False, "error": "Too old", "code": "EXPIRED"}
                
                expected_nano = int(expected_amount_ton * 1_000_000_000)
                if tx["amount"] < expected_nano * 0.99:
                    return {"valid": False, "error": "Amount mismatch", "code": "AMOUNT_MISMATCH"}
                
                self._processed_transactions.add(tx_hash)
                
                return {
                    "valid": True,
                    "tx_hash": tx_hash,
                    "amount_ton": tx["amount_ton"],
                    "amount_stars": int(tx["amount_ton"] * self.ton_to_stars),
                    "sender": tx["sender"]
                }
        
        return {"valid": False, "error": "Not found", "code": "NOT_FOUND"}
    
    async def get_new_deposits(self) -> List[Dict]:
        """Получает новые депозиты"""
        transactions = await self.get_transactions(limit=50)
        
        new_deposits = []
        for tx in transactions:
            if tx["hash"] not in self._processed_transactions:
                new_deposits.append(tx)
                if tx["lt"] > self._last_lt:
                    self._last_lt = tx["lt"]
        
        return new_deposits
    
    def mark_as_processed(self, tx_hash: str):
        self._processed_transactions.add(tx_hash)
    
    def calculate_stars(self, amount_ton: float) -> int:
        return int(amount_ton * self.ton_to_stars)


class RateLimiter:
    """Ограничитель частоты запросов"""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[int, List[float]] = {}
    
    def is_allowed(self, user_id: int) -> bool:
        now = datetime.now().timestamp()
        window_start = now - self.window_seconds
        
        if user_id not in self._requests:
            self._requests[user_id] = []
        
        self._requests[user_id] = [ts for ts in self._requests[user_id] if ts > window_start]
        
        if len(self._requests[user_id]) >= self.max_requests:
            return False
        
        self._requests[user_id].append(now)
        return True
    
    def get_wait_time(self, user_id: int) -> int:
        if user_id not in self._requests or not self._requests[user_id]:
            return 0
        
        now = datetime.now().timestamp()
        window_start = now - self.window_seconds
        active = [ts for ts in self._requests[user_id] if ts > window_start]
        
        if len(active) < self.max_requests:
            return 0
        
        return int(min(active) + self.window_seconds - now) + 1


# Глобальные инстансы
ton_service: Optional[TONService] = None
deposit_limiter = RateLimiter(max_requests=5, window_seconds=300)
withdraw_limiter = RateLimiter(max_requests=3, window_seconds=3600)


def init_ton_service(
    deposit_wallet: str,
    api_key: str = "",
    testnet: bool = False,
    ton_to_stars: int = 100
) -> TONService:
    global ton_service
    ton_service = TONService(deposit_wallet, api_key, testnet, ton_to_stars)
    return ton_service


def get_ton_service() -> Optional[TONService]:
    return ton_service
