#!/usr/bin/env python3
"""
Autonomous bot runner with auto-restart on crash
"""
import asyncio
import logging
import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from bot import main

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

async def run_with_restart():
    """Run bot with auto-restart on crash"""
    max_restarts = 10
    restart_delay = 5
    
    for attempt in range(max_restarts):
        try:
            logger.info(f"Starting bot (attempt {attempt + 1}/{max_restarts})...")
            await main()
        except KeyboardInterrupt:
            logger.info("Bot stopped by user")
            break
        except Exception as e:
            logger.error(f"Bot crashed: {e}", exc_info=True)
            if attempt < max_restarts - 1:
                logger.info(f"Restarting in {restart_delay} seconds...")
                await asyncio.sleep(restart_delay)
            else:
                logger.error("Max restarts reached. Exiting.")
                sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(run_with_restart())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        sys.exit(0)
