import random
from config import GIFTS, RARITY_CHANCES, CASE_PRICES


def get_random_gift(case_type: str) -> dict:
    """Get random gift based on case type and fair chances"""
    chances = RARITY_CHANCES.get(case_type, RARITY_CHANCES["common"])
    
    # Determine rarity
    roll = random.random()
    cumulative = 0
    selected_rarity = "common"
    
    for rarity, chance in chances.items():
        cumulative += chance
        if roll <= cumulative:
            selected_rarity = rarity
            break
    
    # Get random gift of that rarity
    gifts_of_rarity = [g for g in GIFTS if g["rarity"] == selected_rarity]
    return random.choice(gifts_of_rarity) if gifts_of_rarity else GIFTS[0]


def play_coin_flip(bet: int, choice: str) -> tuple[bool, int]:
    """
    Play coin flip game
    Returns: (win: bool, amount: int)
    Fair 50/50 chance, 1.9x multiplier (5% house edge - standard)
    """
    result = random.choice(["heads", "tails"])
    won = (choice == result)
    
    if won:
        winnings = int(bet * 1.9)
        return True, winnings
    return False, -bet


def play_spin(bet: int) -> tuple[int, list]:
    """
    Play slot machine
    Returns: (winnings: int, symbols: list)
    """
    symbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"]
    weights = [25, 20, 20, 15, 10, 7, 3]  # Fair weights
    
    result = random.choices(symbols, weights=weights, k=3)
    
    # Calculate winnings
    if result[0] == result[1] == result[2]:
        # Three of a kind
        multipliers = {
            "🍒": 3, "🍋": 4, "🍊": 5, "🍇": 7,
            "⭐": 10, "💎": 25, "7️⃣": 50
        }
        winnings = bet * multipliers.get(result[0], 3)
        return winnings, result
    elif result[0] == result[1] or result[1] == result[2] or result[0] == result[2]:
        # Two of a kind
        return int(bet * 1.5), result
    else:
        return -bet, result


def play_upgrade(item_value: int, target_multiplier: float) -> tuple[bool, int]:
    """
    Upgrade game - risk item for chance at higher value
    Win chance = 1 / target_multiplier (fair)
    Returns: (success: bool, new_value: int)
    """
    win_chance = 1 / target_multiplier
    won = random.random() < win_chance
    
    if won:
        return True, int(item_value * target_multiplier)
    return False, 0


def play_rocket(bet: int, cashout_at: float) -> tuple[bool, int, float]:
    """
    Rocket/Crash game
    Returns: (won: bool, winnings: int, crash_point: float)
    """
    # Generate crash point (exponential distribution, house edge ~3%)
    crash_point = 1.0
    while random.random() > 0.03:  # ~3% chance to crash each step
        crash_point += 0.1
        if crash_point >= 10.0:  # Max 10x
            break
    
    crash_point = round(crash_point, 1)
    
    if cashout_at <= crash_point:
        winnings = int(bet * cashout_at)
        return True, winnings, crash_point
    return False, -bet, crash_point


def get_case_info(case_type: str) -> dict:
    """Get case information with drop chances"""
    price = CASE_PRICES.get(case_type, 10)
    chances = RARITY_CHANCES.get(case_type, RARITY_CHANCES["common"])
    
    return {
        "type": case_type,
        "price": price,
        "chances": chances,
        "possible_gifts": [g for g in GIFTS]
    }
