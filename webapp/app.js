// ==================== APP STATE ====================

const tg = window.Telegram?.WebApp;

const state = {
    balance: 100,
    inventory: [],
    history: [],
    stats: { games: 0, wins: 0, profit: 0 },
    selectedBet: 10,
    selectedDeposit: 0,
    tonWallet: null,
    ethWallet: null,
    userId: null,
    userName: 'Игрок',
    // Daily bonus
    lastDailyBonus: null,
    dailyStreak: 0,
    // Achievements
    achievements: {
        first_win: false,
        streak_3: false,
        big_win: false,
        collector: false,
        jackpot: false,
        referral: false
    },
    casesOpened: 0
};

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    try {
        initTelegram();
        initTonConnect();
        loadUserData();
        updateUI();
        
        // Initialize daily bonus and achievements after a short delay
        setTimeout(() => {
            initDailyBonus();
            initAchievements();
            initJackpot();
        }, 500);
        
        // Make functions globally available
        window.switchTab = switchTab;
        window.connectTON = connectTON;
        window.connectMetamask = connectMetamask;
        window.openGame = openGame;
        window.openCase = openCase;
        window.openInventory = openInventory;
        window.openHistory = openHistory;
        window.openLeaderboard = openLeaderboard;
        window.openWallet = openWallet;
        window.openProfile = openProfile;
        window.closeWallet = closeWallet;
        window.closeProfile = closeProfile;
        window.closeGame = closeGame;
        window.closeInventory = closeInventory;
        window.closeHistory = closeHistory;
        window.closeLeaderboard = closeLeaderboard;
        window.closeOverlay = closeOverlay;
        window.selectBet = selectBet;
        window.selectDeposit = selectDeposit;
        window.processDeposit = processDeposit;
        window.playSlots = playSlots;
        window.playCoinflip = playCoinflip;
        window.playCrash = playCrash;
        window.playDice = playDice;
        window.sellItem = sellItem;
        window.withdrawAll = withdrawAll;
        window.claimDailyBonus = claimDailyBonus;
        window.openWithdraw = openWithdraw;
        window.closeWithdraw = closeWithdraw;
        window.selectWithdrawMethod = selectWithdrawMethod;
        window.processWithdraw = processWithdraw;
        window.filterHistory = filterHistory;
        window.switchLeaderboard = switchLeaderboard;
        window.openCase = openCase;
        window.closeOverlay = closeOverlay;
        
        // Add click handlers for buttons that might not have onclick
        document.querySelectorAll('.quick-btn').forEach(btn => {
            if (!btn.onclick) {
                const tab = btn.getAttribute('onclick')?.match(/switchTab\('(\w+)'\)/)?.[1];
                if (tab) {
                    btn.addEventListener('click', () => switchTab(tab));
                }
            }
        });
        
        // Ensure all nav items have click handlers
        document.querySelectorAll('.nav-item').forEach(item => {
            if (!item.onclick) {
                const tab = item.dataset.tab;
                if (tab) {
                    item.addEventListener('click', () => switchTab(tab));
                }
            }
        });
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Ошибка инициализации', 'error');
    }
});

function initTelegram() {
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Get user info
        if (tg.initDataUnsafe?.user) {
            state.userId = tg.initDataUnsafe.user.id;
            state.userName = tg.initDataUnsafe.user.first_name || 'Игрок';
        }
        
        // Apply theme
        document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color || '#0a0a0f');
        document.documentElement.style.setProperty('--bg-secondary', tg.themeParams.secondary_bg_color || '#12121a');
        
        console.log('Telegram WebApp initialized');
    }
}

// ==================== TON CONNECT ====================

let tonConnectUI = null;

function initTonConnect() {
    try {
        // Check if TON_CONNECT_UI is available
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.error('TON_CONNECT_UI not loaded');
            // Try to load it dynamically
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@tonconnect/ui@2.0.6/dist/tonconnect-ui.min.js';
            script.onload = () => {
                console.log('TON Connect UI loaded dynamically');
                initTonConnect();
            };
            script.onerror = () => {
                console.error('Failed to load TON Connect UI');
                showToast('TON Connect не загружен', 'error');
            };
            document.head.appendChild(script);
            return;
        }
        
        // Use the deployed manifest URL
        const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
        console.log('Initializing TON Connect with manifest:', manifestUrl);
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: manifestUrl,
            buttonRootId: null,
            uiPreferences: {
                theme: 'DARK'
            },
            walletsListConfiguration: {
                includeWallets: [
                    {
                        appName: "tonkeeper",
                        name: "Tonkeeper",
                        imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
                        aboutUrl: "https://tonkeeper.com",
                        universalLink: "https://app.tonkeeper.com/ton-connect",
                        bridgeUrl: "https://bridge.tonapi.io/bridge",
                        platforms: ["ios", "android", "chrome", "firefox"]
                    },
                    {
                        appName: "mytonwallet",
                        name: "MyTonWallet",
                        imageUrl: "https://mytonwallet.io/icon-256.png",
                        aboutUrl: "https://mytonwallet.io",
                        universalLink: "https://connect.mytonwallet.org",
                        bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge",
                        platforms: ["ios", "android", "chrome", "firefox"]
                    }
                ]
            }
        });
        
        // Check for existing connection
        tonConnectUI.connectionRestored.then(restored => {
            if (restored) {
                console.log('TON wallet connection restored');
            }
        });
        
        tonConnectUI.onStatusChange(wallet => {
            if (wallet) {
                state.tonWallet = wallet;
                const addr = wallet.account.address;
                const short = addr.slice(0, 6) + '...' + addr.slice(-4);
                
                const tonStatus = document.getElementById('ton-status');
                const tonBtn = document.getElementById('ton-wallet-btn');
                
                if (tonStatus) tonStatus.textContent = short;
                if (tonBtn) tonBtn.classList.add('connected');
                
                showToast('TON кошелёк подключен!', 'success');
                saveUserData();
                
                // Store wallet address for withdrawals
                localStorage.setItem('ton_wallet_address', addr);
            } else {
                state.tonWallet = null;
                const tonStatus = document.getElementById('ton-status');
                const tonBtn = document.getElementById('ton-wallet-btn');
                
                if (tonStatus) tonStatus.textContent = 'Не подключен';
                if (tonBtn) tonBtn.classList.remove('connected');
                
                localStorage.removeItem('ton_wallet_address');
            }
        });
        
        console.log('TON Connect initialized with manifest:', manifestUrl);
    } catch (e) {
        console.error('TON Connect error:', e);
        showToast('Ошибка инициализации TON Connect', 'error');
    }
}

async function connectTON() {
    console.log('connectTON called, tonConnectUI:', tonConnectUI);
    
    if (!tonConnectUI) {
        console.error('TON Connect UI not initialized');
        showToast('TON Connect не загружен. Обновите страницу.', 'error');
        // Попробуем инициализировать заново
        try {
            initTonConnect();
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            console.error('Failed to reinitialize TON Connect:', e);
            return;
        }
    }
    
    if (state.tonWallet) {
        try {
            await tonConnectUI.disconnect();
            state.tonWallet = null;
            const tonStatus = document.getElementById('ton-status');
            const tonBtn = document.getElementById('ton-wallet-btn');
            if (tonStatus) tonStatus.textContent = 'Не подключен';
            if (tonBtn) tonBtn.classList.remove('connected');
            showToast('TON кошелёк отключен', 'success');
            localStorage.removeItem('ton_wallet_address');
        } catch (e) {
            console.error('Disconnect error:', e);
            showToast('Ошибка отключения', 'error');
        }
    } else {
        try {
            console.log('Opening TON Connect modal...');
            await tonConnectUI.openModal();
        } catch (e) {
            console.error('TON connect error:', e);
            if (e.message?.includes('User rejected') || e.message?.includes('rejected')) {
                showToast('Подключение отменено', 'error');
            } else {
                showToast('Ошибка подключения. Попробуйте ещё раз.', 'error');
            }
        }
    }
}

// Function to send TON transaction
async function sendTONTransaction(toAddress, amountNano, comment = '') {
    if (!tonConnectUI || !state.tonWallet) {
        showToast('Подключите TON кошелёк', 'error');
        return false;
    }
    
    try {
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
            messages: [
                {
                    address: toAddress,
                    amount: amountNano.toString(),
                    payload: comment ? btoa(comment) : undefined
                }
            ]
        };
        
        const result = await tonConnectUI.sendTransaction(transaction);
        console.log('Transaction sent:', result);
        return true;
    } catch (e) {
        console.error('Transaction error:', e);
        if (e.message?.includes('User rejected')) {
            showToast('Транзакция отменена', 'error');
        } else {
            showToast('Ошибка транзакции', 'error');
        }
        return false;
    }
}

// ==================== METAMASK ====================

async function connectMetamask() {
    if (state.ethWallet) {
        state.ethWallet = null;
        document.getElementById('eth-status').textContent = 'Не подключен';
        document.querySelector('.wallet-option:nth-child(2)').classList.remove('connected');
        showToast('Metamask отключен', 'success');
        return;
    }
    
    if (typeof window.ethereum === 'undefined') {
        showToast('Установите Metamask', 'error');
        window.open('https://metamask.io/download/', '_blank');
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
            state.ethWallet = accounts[0];
            const short = accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4);
            document.getElementById('eth-status').textContent = short;
            document.querySelector('.wallet-option:nth-child(2)').classList.add('connected');
            showToast('Metamask подключен!', 'success');
            saveUserData();
        }
    } catch (e) {
        console.error('Metamask error:', e);
        showToast('Ошибка подключения', 'error');
    }
}

// ==================== DATA PERSISTENCE ====================
// (Moved to bottom of file with enhanced version)

function addToHistory(game, bet, won, amount) {
    state.history.unshift({
        game,
        bet,
        won,
        amount,
        time: Date.now()
    });
    
    state.stats.games++;
    if (won) state.stats.wins++;
    state.stats.profit += won ? amount : -bet;
    
    saveUserData();
    updateHistoryUI();
    
    // Check achievements
    checkAchievements();
    
    // Check for big win achievement
    if (won && amount >= 500 && !state.achievements.big_win) {
        unlockAchievement('big_win');
    }
    
    // Check for jackpot
    if (won && amount >= 100) {
        checkJackpot(amount);
    }
}

// ==================== UI ====================

function updateUI() {
    document.getElementById('balance-value').textContent = state.balance;
    document.getElementById('inv-count').textContent = state.inventory.length;
    
    if (state.userId) {
        document.getElementById('user-name').textContent = state.userName;
        document.getElementById('user-id').textContent = `ID: ${state.userId}`;
    }
    
    document.getElementById('stat-games').textContent = state.stats.games;
    document.getElementById('stat-wins').textContent = state.stats.wins;
    document.getElementById('stat-profit').textContent = (state.stats.profit >= 0 ? '+' : '') + state.stats.profit;
}

function updateHistoryUI() {
    const list = document.getElementById('history-list');
    
    if (state.history.length === 0) {
        list.innerHTML = '<div class="empty-state">Пока нет игр</div>';
        return;
    }
    
    list.innerHTML = state.history.slice(0, 10).map(h => `
        <div class="history-item">
            <span class="game">${getGameEmoji(h.game)} ${getGameName(h.game)}</span>
            <span class="result ${h.won ? 'win' : 'lose'}">${h.won ? '+' : '-'}${h.won ? h.amount : h.bet} ⭐</span>
        </div>
    `).join('');
}

function getGameEmoji(game) {
    const emojis = { slots: '🎰', coinflip: '🪙', crash: '🚀', dice: '🎲' };
    return emojis[game] || '🎮';
}

function getGameName(game) {
    const names = { slots: 'Слоты', coinflip: 'Монетка', crash: 'Краш', dice: 'Кости' };
    return names[game] || game;
}

// ==================== NAVIGATION ====================

function switchTab(tab) {
    console.log('Switching to tab:', tab);
    
    try {
        // Update nav
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(el => {
            if (el.dataset.tab === tab) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
        
        // Handle modals and sections
        if (tab === 'wallet') {
            openWallet();
        } else if (tab === 'profile') {
            openProfile();
        } else if (tab === 'inventory') {
            openInventory();
        } else if (tab === 'history') {
            openHistory();
        } else if (tab === 'leaderboard') {
            openLeaderboard();
        } else if (tab === 'home' || tab === 'games') {
            closeAllModals();
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        haptic('light');
    } catch (error) {
        console.error('Error in switchTab:', error);
        showToast('Ошибка переключения вкладки', 'error');
    }
}

function openWallet() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('wallet-modal');
        if (overlay && modal) {
            overlay.classList.add('active');
            modal.classList.add('active');
            haptic('medium');
        } else {
            console.error('Wallet modal elements not found');
            showToast('Ошибка открытия кошелька', 'error');
        }
    } catch (error) {
        console.error('Error opening wallet:', error);
        showToast('Ошибка открытия кошелька', 'error');
    }
}

function closeWallet() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('wallet-modal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('Error closing wallet:', error);
    }
}

function openProfile() {
    try {
        updateUI();
        updateHistoryUI();
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('profile-modal');
        if (overlay && modal) {
            overlay.classList.add('active');
            modal.classList.add('active');
            haptic('medium');
        } else {
            console.error('Profile modal elements not found');
            showToast('Ошибка открытия профиля', 'error');
        }
    } catch (error) {
        console.error('Error opening profile:', error);
        showToast('Ошибка открытия профиля', 'error');
    }
}

function closeProfile() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('profile-modal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('Error closing profile:', error);
    }
}

function closeOverlay() {
    closeAllModals();
}

function closeAllModals() {
    try {
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.remove('active');
        document.querySelectorAll('.modal').forEach(m => {
            if (m) m.classList.remove('active');
        });
    } catch (error) {
        console.error('Error closing modals:', error);
    }
}

// ==================== INVENTORY ====================

function openInventory() {
    try {
        updateInventoryUI();
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('inventory-modal');
        if (overlay && modal) {
            overlay.classList.add('active');
            modal.classList.add('active');
            haptic('medium');
        } else {
            console.error('Inventory modal elements not found');
            showToast('Ошибка открытия инвентаря', 'error');
        }
    } catch (error) {
        console.error('Error opening inventory:', error);
        showToast('Ошибка открытия инвентаря', 'error');
    }
}

function closeInventory() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('inventory-modal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('Error closing inventory:', error);
    }
}

function updateInventoryUI() {
    const grid = document.getElementById('inventory-grid');
    const totalItems = document.getElementById('inv-total-items');
    const totalValue = document.getElementById('inv-total-value');
    const withdrawBtn = document.getElementById('withdraw-all-btn');
    
    if (state.inventory.length === 0) {
        grid.innerHTML = '<div class="empty-state">Инвентарь пуст. Открывайте кейсы!</div>';
        totalItems.textContent = '0';
        totalValue.textContent = '0 ⭐';
        withdrawBtn.style.display = 'none';
        return;
    }
    
    const total = state.inventory.reduce((sum, item) => sum + item.value, 0);
    totalItems.textContent = state.inventory.length;
    totalValue.textContent = total + ' ⭐';
    withdrawBtn.style.display = 'block';
    
    grid.innerHTML = state.inventory.map((item, idx) => `
        <div class="inventory-item" onclick="sellItem(${idx})">
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-value">${item.value} ⭐</div>
            <button class="sell-btn">Продать</button>
        </div>
    `).join('');
}

function sellItem(index) {
    if (index < 0 || index >= state.inventory.length) return;
    
    const item = state.inventory[index];
    state.balance += item.value;
    state.inventory.splice(index, 1);
    
    updateUI();
    updateInventoryUI();
    saveUserData();
    
    showToast(`Продано: ${item.name} +${item.value} ⭐`, 'success');
    haptic('success');
}

function withdrawAll() {
    if (state.inventory.length === 0) return;
    
    const total = state.inventory.reduce((sum, item) => sum + item.value, 0);
    state.balance += total;
    state.inventory = [];
    
    updateUI();
    updateInventoryUI();
    saveUserData();
    
    showToast(`Выведено в баланс: +${total} ⭐`, 'success');
    haptic('success');
}

// ==================== HISTORY ====================

let historyFilter = 'all';

function openHistory() {
    try {
        updateFullHistoryUI();
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('history-modal');
        if (overlay && modal) {
            overlay.classList.add('active');
            modal.classList.add('active');
            haptic('medium');
        } else {
            console.error('History modal elements not found');
            showToast('Ошибка открытия истории', 'error');
        }
    } catch (error) {
        console.error('Error opening history:', error);
        showToast('Ошибка открытия истории', 'error');
    }
}

function closeHistory() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('history-modal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('Error closing history:', error);
    }
}

function filterHistory(filter) {
    historyFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(
            filter === 'all' ? 'все' : filter === 'wins' ? 'победы' : 'проигрыши'
        ));
    });
    updateFullHistoryUI();
}

function updateFullHistoryUI() {
    const list = document.getElementById('full-history-list');
    
    let filtered = state.history;
    if (historyFilter === 'wins') {
        filtered = state.history.filter(h => h.won);
    } else if (historyFilter === 'losses') {
        filtered = state.history.filter(h => !h.won);
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">История пуста</div>';
        return;
    }
    
    list.innerHTML = filtered.map(h => {
        const date = new Date(h.time);
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        
        return `
            <div class="history-item-full">
                <div class="history-left">
                    <span class="history-game-icon">${getGameEmoji(h.game)}</span>
                    <div class="history-details">
                        <span class="history-game-name">${getGameName(h.game)}</span>
                        <span class="history-time">${dateStr} ${timeStr}</span>
                    </div>
                </div>
                <div class="history-right">
                    <span class="history-bet">Ставка: ${h.bet} ⭐</span>
                    <span class="history-result ${h.won ? 'win' : 'lose'}">${h.won ? '+' + h.amount : '-' + h.bet} ⭐</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== LEADERBOARD ====================

let currentLeaderboard = 'profit';

// Demo leaderboard data (in production, fetch from server)
const demoLeaderboard = {
    profit: [
        { name: 'CryptoKing', value: 15420, avatar: '👑' },
        { name: 'LuckyOne', value: 12350, avatar: '🍀' },
        { name: 'ProGamer', value: 9870, avatar: '🎮' },
        { name: 'StarPlayer', value: 7650, avatar: '⭐' },
        { name: 'WinMaster', value: 6230, avatar: '🏆' },
        { name: 'GiftHunter', value: 5100, avatar: '🎁' },
        { name: 'DiamondHand', value: 4560, avatar: '💎' },
        { name: 'BetKing', value: 3890, avatar: '🎰' },
        { name: 'RocketMan', value: 3210, avatar: '🚀' },
        { name: 'CoinMaster', value: 2780, avatar: '🪙' }
    ],
    wins: [
        { name: 'WinMaster', value: 342, avatar: '🏆' },
        { name: 'LuckyOne', value: 298, avatar: '🍀' },
        { name: 'ProGamer', value: 267, avatar: '🎮' },
        { name: 'CryptoKing', value: 234, avatar: '👑' },
        { name: 'StarPlayer', value: 198, avatar: '⭐' },
        { name: 'GiftHunter', value: 176, avatar: '🎁' },
        { name: 'DiamondHand', value: 154, avatar: '💎' },
        { name: 'BetKing', value: 132, avatar: '🎰' },
        { name: 'RocketMan', value: 118, avatar: '🚀' },
        { name: 'CoinMaster', value: 97, avatar: '🪙' }
    ],
    games: [
        { name: 'ProGamer', value: 1250, avatar: '🎮' },
        { name: 'WinMaster', value: 1120, avatar: '🏆' },
        { name: 'LuckyOne', value: 980, avatar: '🍀' },
        { name: 'CryptoKing', value: 870, avatar: '👑' },
        { name: 'BetKing', value: 760, avatar: '🎰' },
        { name: 'StarPlayer', value: 650, avatar: '⭐' },
        { name: 'GiftHunter', value: 540, avatar: '🎁' },
        { name: 'DiamondHand', value: 430, avatar: '💎' },
        { name: 'RocketMan', value: 320, avatar: '🚀' },
        { name: 'CoinMaster', value: 210, avatar: '🪙' }
    ]
};

function openLeaderboard() {
    try {
        updateLeaderboardUI();
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('leaderboard-modal');
        if (overlay && modal) {
            overlay.classList.add('active');
            modal.classList.add('active');
            haptic('medium');
        } else {
            console.error('Leaderboard modal elements not found');
            showToast('Ошибка открытия лидерборда', 'error');
        }
    } catch (error) {
        console.error('Error opening leaderboard:', error);
        showToast('Ошибка открытия лидерборда', 'error');
    }
}

function closeLeaderboard() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('leaderboard-modal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('Error closing leaderboard:', error);
    }
}

function switchLeaderboard(type) {
    currentLeaderboard = type;
    document.querySelectorAll('.lb-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    updateLeaderboardUI();
}

function updateLeaderboardUI() {
    const list = document.getElementById('leaderboard-list');
    const data = demoLeaderboard[currentLeaderboard];
    
    const suffix = currentLeaderboard === 'profit' ? ' ⭐' : currentLeaderboard === 'wins' ? ' побед' : ' игр';
    
    list.innerHTML = data.map((player, idx) => `
        <div class="leaderboard-item ${idx < 3 ? 'top-' + (idx + 1) : ''}">
            <span class="lb-rank">${idx < 3 ? ['🥇', '🥈', '🥉'][idx] : '#' + (idx + 1)}</span>
            <span class="lb-avatar">${player.avatar}</span>
            <span class="lb-name">${player.name}</span>
            <span class="lb-value">${player.value.toLocaleString()}${suffix}</span>
        </div>
    `).join('');
    
    // Calculate user's position
    const userValue = currentLeaderboard === 'profit' ? state.stats.profit : 
                      currentLeaderboard === 'wins' ? state.stats.wins : state.stats.games;
    let rank = data.filter(p => p.value > userValue).length + 1;
    if (rank > 100) rank = '100+';
    document.getElementById('your-rank').textContent = '#' + rank;
}

// ==================== WITHDRAW ====================

let selectedWithdrawMethod = null;

function openWithdraw() {
    document.getElementById('withdraw-available').textContent = state.balance + ' ⭐';
    document.getElementById('withdraw-input-section').style.display = 'none';
    selectedWithdrawMethod = null;
    document.getElementById('overlay').classList.add('active');
    document.getElementById('withdraw-modal').classList.add('active');
}

function closeWithdraw() {
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('withdraw-modal').classList.remove('active');
}

function selectWithdrawMethod(method) {
    selectedWithdrawMethod = method;
    document.querySelectorAll('.withdraw-option').forEach(opt => opt.classList.remove('selected'));
    event.target.closest('.withdraw-option').classList.add('selected');
    
    const inputSection = document.getElementById('withdraw-input-section');
    const input = document.getElementById('withdraw-amount-input');
    
    inputSection.style.display = 'block';
    input.max = state.balance;
    input.value = '';
    input.placeholder = method === 'ton' ? 'Минимум 1000 ⭐' : 'Минимум 100 ⭐';
}

async function processWithdraw() {
    const amount = parseInt(document.getElementById('withdraw-amount-input').value);
    
    if (!selectedWithdrawMethod) {
        showToast('Выберите способ вывода', 'error');
        return;
    }
    
    const minAmount = selectedWithdrawMethod === 'ton' ? 1000 : 100;
    
    if (!amount || amount < minAmount) {
        showToast(`Минимум ${minAmount} ⭐`, 'error');
        return;
    }
    
    if (amount > state.balance) {
        showToast('Недостаточно средств', 'error');
        return;
    }
    
    if (selectedWithdrawMethod === 'ton') {
        if (!state.tonWallet) {
            showToast('Подключите TON кошелёк', 'error');
            openWallet();
            return;
        }
        
        // In production, this would trigger a server-side withdrawal
        // For demo, we simulate the process
        state.balance -= amount;
        updateUI();
        saveUserData();
        
        showToast(`Заявка на вывод ${amount} ⭐ создана!`, 'success');
        closeWithdraw();
        
        // Send to bot for admin processing
        sendToBot('withdrawal_request', { 
            method: 'ton', 
            amount: amount,
            wallet: state.tonWallet.account.address 
        });
        
    } else if (selectedWithdrawMethod === 'stars') {
        // Telegram Stars withdrawal
        state.balance -= amount;
        updateUI();
        saveUserData();
        
        showToast(`Заявка на вывод ${amount} ⭐ создана!`, 'success');
        closeWithdraw();
        
        sendToBot('withdrawal_request', { 
            method: 'stars', 
            amount: amount 
        });
    }
    
    haptic('success');
}

// ==================== GAMES ====================

function openGame(game) {
    try {
        console.log('Opening game:', game);
        state.currentGame = game;
        
        const gameTitle = document.getElementById('game-title');
        const gameBody = document.getElementById('game-body');
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('game-modal');
        
        if (!gameTitle || !gameBody || !overlay || !modal) {
            console.error('Game modal elements not found');
            showToast('Ошибка открытия игры', 'error');
            return;
        }
        
        gameTitle.textContent = getGameEmoji(game) + ' ' + getGameName(game);
        
        let html = '';
        
        switch(game) {
            case 'slots':
                html = getSlotsHTML();
                break;
            case 'coinflip':
                html = getCoinflipHTML();
                break;
            case 'crash':
                html = getCrashHTML();
                break;
            case 'dice':
                html = getDiceHTML();
                break;
            default:
                console.error('Unknown game:', game);
                showToast('Неизвестная игра', 'error');
                return;
        }
        
        gameBody.innerHTML = html;
        overlay.classList.add('active');
        modal.classList.add('active');
        
        haptic('medium');
    } catch (error) {
        console.error('Error opening game:', error);
        showToast('Ошибка открытия игры', 'error');
    }
}

function closeGame() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('game-modal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('Error closing game:', error);
    }
}

function selectBet(amount) {
    state.selectedBet = amount;
    document.querySelectorAll('.bet-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.includes(amount));
    });
    haptic('light');
}

// Slots Game
function getSlotsHTML() {
    return `
        <div class="game-content">
            <div class="bet-section">
                <h4>Ставка</h4>
                <div class="bet-buttons">
                    ${[10, 25, 50, 100, 250].map(b => 
                        `<button class="bet-btn ${b === state.selectedBet ? 'selected' : ''}" onclick="selectBet(${b})">${b} ⭐</button>`
                    ).join('')}
                </div>
            </div>
            <div class="game-display">
                <div class="slot-reels">
                    <div class="slot-reel" id="reel1">❓</div>
                    <div class="slot-reel" id="reel2">❓</div>
                    <div class="slot-reel" id="reel3">❓</div>
                </div>
            </div>
            <button class="play-btn" onclick="playSlots()">🎰 Крутить</button>
        </div>
    `;
}

async function playSlots() {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
    const reels = ['reel1', 'reel2', 'reel3'];
    const results = [];
    
    // Start spin
    reels.forEach(id => document.getElementById(id).classList.add('spinning'));
    
    // Stop reels
    for (let i = 0; i < 3; i++) {
        await sleep(400);
        const sym = symbols[Math.floor(Math.random() * symbols.length)];
        results.push(sym);
        document.getElementById(reels[i]).classList.remove('spinning');
        document.getElementById(reels[i]).textContent = sym;
        haptic('light');
    }
    
    // Calculate win
    let win = 0;
    if (results[0] === results[1] && results[1] === results[2]) {
        const mults = { '🍒': 3, '🍋': 5, '🍊': 7, '🍇': 10, '⭐': 15, '💎': 30, '7️⃣': 50 };
        win = state.selectedBet * (mults[results[0]] || 3);
    } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
        win = Math.floor(state.selectedBet * 1.5);
    }
    
    if (win > 0) {
        state.balance += win;
        showToast(`Победа! +${win} ⭐`, 'success');
        haptic('success');
    } else {
        showToast(`Не повезло... -${state.selectedBet} ⭐`, 'error');
        haptic('error');
    }
    
    updateUI();
    addToHistory('slots', state.selectedBet, win > 0, win);
    sendToBot('game_result', { game: 'slots', won: win > 0, amount: win || state.selectedBet });
}

// Coinflip Game
function getCoinflipHTML() {
    return `
        <div class="game-content">
            <div class="bet-section">
                <h4>Ставка</h4>
                <div class="bet-buttons">
                    ${[10, 25, 50, 100, 250].map(b => 
                        `<button class="bet-btn ${b === state.selectedBet ? 'selected' : ''}" onclick="selectBet(${b})">${b} ⭐</button>`
                    ).join('')}
                </div>
            </div>
            <div class="game-display" id="coin-display">
                <span style="font-size: 64px">🪙</span>
            </div>
            <p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">Выигрыш: x1.95</p>
            <div style="display: flex; gap: 12px;">
                <button class="play-btn" style="background: linear-gradient(135deg, #f39c12, #e67e22);" onclick="playCoinflip('heads')">🦅 Орёл</button>
                <button class="play-btn" style="background: linear-gradient(135deg, #95a5a6, #7f8c8d);" onclick="playCoinflip('tails')">🪙 Решка</button>
            </div>
        </div>
    `;
}

async function playCoinflip(choice) {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    const display = document.getElementById('coin-display');
    display.innerHTML = '<span style="font-size: 64px; animation: pulse 0.2s infinite">🪙</span>';
    
    await sleep(1000);
    
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const emoji = result === 'heads' ? '🦅' : '🪙';
    
    display.innerHTML = `<span style="font-size: 64px">${emoji}</span>`;
    
    if (won) {
        const win = Math.floor(state.selectedBet * 1.95);
        state.balance += win;
        showToast(`Победа! +${win} ⭐`, 'success');
        haptic('success');
        addToHistory('coinflip', state.selectedBet, true, win);
        sendToBot('game_result', { game: 'coinflip', won: true, amount: win });
    } else {
        showToast(`Не повезло... -${state.selectedBet} ⭐`, 'error');
        haptic('error');
        addToHistory('coinflip', state.selectedBet, false, 0);
        sendToBot('game_result', { game: 'coinflip', won: false, amount: state.selectedBet });
    }
    
    updateUI();
}

// Crash Game
function getCrashHTML() {
    return `
        <div class="game-content">
            <div class="bet-section">
                <h4>Ставка</h4>
                <div class="bet-buttons">
                    ${[10, 25, 50, 100, 250].map(b => 
                        `<button class="bet-btn ${b === state.selectedBet ? 'selected' : ''}" onclick="selectBet(${b})">${b} ⭐</button>`
                    ).join('')}
                </div>
            </div>
            <div class="bet-section">
                <h4>Выйти на</h4>
                <div class="bet-buttons">
                    ${[1.5, 2, 3, 5, 10].map(m => 
                        `<button class="bet-btn" onclick="playCrash(${m})">x${m}</button>`
                    ).join('')}
                </div>
            </div>
            <div class="game-display" id="crash-display">
                <div style="text-align: center">
                    <div style="font-size: 48px">🚀</div>
                    <div style="font-size: 32px; font-weight: bold; margin-top: 10px">x1.00</div>
                </div>
            </div>
        </div>
    `;
}

async function playCrash(target) {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    const display = document.getElementById('crash-display');
    let crash = 1.0;
    
    // Generate crash point
    while (Math.random() > 0.05 && crash < 20) {
        crash += 0.1;
    }
    crash = Math.round(crash * 10) / 10;
    
    // Animate
    let current = 1.0;
    const interval = setInterval(() => {
        current += 0.1;
        current = Math.round(current * 10) / 10;
        
        if (current >= crash || current >= target) {
            clearInterval(interval);
            
            const won = target <= crash;
            if (won) {
                const win = Math.floor(state.selectedBet * target);
                state.balance += win;
                display.innerHTML = `
                    <div style="text-align: center">
                        <div style="font-size: 48px">🎉</div>
                        <div style="font-size: 24px; color: var(--success); margin-top: 10px">Успел на x${target}!</div>
                        <div style="font-size: 20px; margin-top: 5px">+${win} ⭐</div>
                    </div>
                `;
                showToast(`Победа! +${win} ⭐`, 'success');
                haptic('success');
                addToHistory('crash', state.selectedBet, true, win);
            } else {
                display.innerHTML = `
                    <div style="text-align: center">
                        <div style="font-size: 48px">💥</div>
                        <div style="font-size: 24px; color: var(--error); margin-top: 10px">Крэш на x${crash}</div>
                        <div style="font-size: 20px; margin-top: 5px">-${state.selectedBet} ⭐</div>
                    </div>
                `;
                showToast(`Крэш! -${state.selectedBet} ⭐`, 'error');
                haptic('error');
                addToHistory('crash', state.selectedBet, false, 0);
            }
            updateUI();
            return;
        }
        
        display.innerHTML = `
            <div style="text-align: center">
                <div style="font-size: 48px">🚀</div>
                <div style="font-size: 32px; font-weight: bold; margin-top: 10px; color: ${current > 2 ? 'var(--success)' : 'white'}">x${current.toFixed(1)}</div>
            </div>
        `;
    }, 100);
}

// Dice Game
function getDiceHTML() {
    return `
        <div class="game-content">
            <div class="bet-section">
                <h4>Ставка</h4>
                <div class="bet-buttons">
                    ${[10, 25, 50, 100, 250].map(b => 
                        `<button class="bet-btn ${b === state.selectedBet ? 'selected' : ''}" onclick="selectBet(${b})">${b} ⭐</button>`
                    ).join('')}
                </div>
            </div>
            <div class="game-display" id="dice-display">
                <span style="font-size: 80px">🎲</span>
            </div>
            <p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">Угадай число (1-6). Выигрыш: x5</p>
            <div class="bet-buttons" style="justify-content: center; margin-bottom: 16px;">
                ${[1,2,3,4,5,6].map(n => 
                    `<button class="bet-btn" onclick="playDice(${n})">${n}</button>`
                ).join('')}
            </div>
        </div>
    `;
}

async function playDice(guess) {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    const display = document.getElementById('dice-display');
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    // Animate
    for (let i = 0; i < 10; i++) {
        display.innerHTML = `<span style="font-size: 80px">${diceEmojis[Math.floor(Math.random() * 6)]}</span>`;
        await sleep(100);
    }
    
    const result = Math.floor(Math.random() * 6) + 1;
    display.innerHTML = `<span style="font-size: 80px">${diceEmojis[result - 1]}</span>`;
    
    const won = result === guess;
    if (won) {
        const win = state.selectedBet * 5;
        state.balance += win;
        showToast(`🎯 Угадал! +${win} ⭐`, 'success');
        haptic('success');
        addToHistory('dice', state.selectedBet, true, win);
    } else {
        showToast(`Выпало ${result}. -${state.selectedBet} ⭐`, 'error');
        haptic('error');
        addToHistory('dice', state.selectedBet, false, 0);
    }
    
    updateUI();
}

// ==================== CASES ====================

const cases = {
    starter: { price: 10, rewards: [
        { icon: '🎁', name: 'Подарок', value: 5, chance: 0.4 },
        { icon: '🎀', name: 'Коробка', value: 15, chance: 0.35 },
        { icon: '🧸', name: 'Мишка', value: 30, chance: 0.2 },
        { icon: '💎', name: 'Кристалл', value: 50, chance: 0.05 }
    ]},
    premium: { price: 50, rewards: [
        { icon: '🎀', name: 'Коробка', value: 25, chance: 0.3 },
        { icon: '🧸', name: 'Мишка', value: 50, chance: 0.35 },
        { icon: '💎', name: 'Кристалл', value: 100, chance: 0.25 },
        { icon: '👑', name: 'Корона', value: 200, chance: 0.1 }
    ]},
    mega: { price: 100, rewards: [
        { icon: '💎', name: 'Кристалл', value: 75, chance: 0.3 },
        { icon: '👑', name: 'Корона', value: 150, chance: 0.35 },
        { icon: '🏆', name: 'Кубок', value: 300, chance: 0.25 },
        { icon: '💰', name: 'Сундук', value: 500, chance: 0.1 }
    ]},
    legendary: { price: 500, rewards: [
        { icon: '👑', name: 'Корона', value: 300, chance: 0.3 },
        { icon: '🏆', name: 'Кубок', value: 500, chance: 0.35 },
        { icon: '💰', name: 'Сундук', value: 1000, chance: 0.25 },
        { icon: '🌟', name: 'Звезда', value: 2500, chance: 0.1 }
    ]}
};

function openCase(type) {
    try {
        const caseData = cases[type];
        if (!caseData) {
            console.error('Unknown case type:', type);
            showToast('Неизвестный тип кейса', 'error');
            return;
        }
        
        if (state.balance < caseData.price) {
            showToast('Недостаточно средств!', 'error');
            haptic('error');
            return;
        }
        
        state.balance -= caseData.price;
        state.casesOpened = (state.casesOpened || 0) + 1;
        updateUI();
        
        // Random reward
        const roll = Math.random();
        let cumulative = 0;
        let reward = caseData.rewards[0];
        
        for (const r of caseData.rewards) {
            cumulative += r.chance;
            if (roll <= cumulative) {
                reward = r;
                break;
            }
        }
        
        // Add to inventory
        state.inventory.push({ ...reward, id: Date.now() });
        updateUI();
        saveUserData();
        
        // Check achievements
        checkAchievements();
        
        // Show result
        const gameTitle = document.getElementById('game-title');
        const gameBody = document.getElementById('game-body');
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('game-modal');
        
        if (!gameTitle || !gameBody || !overlay || !modal) {
            console.error('Game modal elements not found');
            showToast('Ошибка открытия кейса', 'error');
            return;
        }
        
        gameTitle.textContent = '📦 Открытие кейса';
        gameBody.innerHTML = `
            <div class="result-display animate-in">
                <div class="result-icon">${reward.icon}</div>
                <div class="result-text">${reward.name}</div>
                <div class="result-amount win">${reward.value} ⭐</div>
                <p style="color: var(--text-secondary); margin: 16px 0;">Добавлено в инвентарь</p>
                <button class="play-btn" onclick="closeGame()">Отлично!</button>
            </div>
        `;
        
        overlay.classList.add('active');
        modal.classList.add('active');
        
        haptic('success');
        showToast(`Получен: ${reward.name}!`, 'success');
    } catch (error) {
        console.error('Error opening case:', error);
        showToast('Ошибка открытия кейса', 'error');
    }
}

// ==================== DEPOSIT ====================

function selectDeposit(amount) {
    state.selectedDeposit = amount;
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.includes(amount));
    });
    document.getElementById('deposit-btn').disabled = false;
}

// Deposit wallet address (replace with your actual wallet)
const DEPOSIT_TON_ADDRESS = 'UQDrjaLahLkMB-hMCmkzOyBuHJ186Qg-KUbG5cQW8w-cXhGk';
const DEPOSIT_ETH_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';

// Conversion rates
const STARS_PER_TON = 1000;  // 1 TON = 1000 stars
const STARS_PER_ETH = 50000; // 0.001 ETH = 50 stars

async function processDeposit() {
    if (!state.selectedDeposit) {
        showToast('Выберите сумму пополнения', 'error');
        return;
    }
    
    if (state.tonWallet) {
        try {
            // Calculate TON amount (1 TON = 1000 stars)
            const tonAmount = state.selectedDeposit / STARS_PER_TON;
            const nanotons = Math.floor(tonAmount * 1e9); // Convert to nanotons
            
            showToast(`Отправляем ${tonAmount.toFixed(3)} TON...`, '');
            
            const success = await sendTONTransaction(
                DEPOSIT_TON_ADDRESS, 
                nanotons, 
                `Deposit ${state.selectedDeposit} stars`
            );
            
            if (success) {
                state.balance += state.selectedDeposit;
                updateUI();
                saveUserData();
                showToast(`Пополнено: +${state.selectedDeposit} ⭐`, 'success');
                haptic('success');
                
                // Notify bot about deposit
                sendToBot('deposit', { 
                    method: 'ton', 
                    amount: state.selectedDeposit,
                    tonAmount: tonAmount
                });
                
                closeWallet();
            }
        } catch (e) {
            console.error('Deposit error:', e);
            showToast('Ошибка транзакции', 'error');
        }
    } else if (state.ethWallet) {
        try {
            if (typeof window.ethereum === 'undefined') {
                showToast('Metamask не найден', 'error');
                return;
            }
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            
            // Calculate ETH amount
            const ethAmount = state.selectedDeposit / STARS_PER_ETH;
            
            showToast(`Отправляем ${ethAmount.toFixed(6)} ETH...`, '');
            
            const tx = await signer.sendTransaction({
                to: DEPOSIT_ETH_ADDRESS,
                value: ethers.utils.parseEther(ethAmount.toString())
            });
            
            showToast('Ожидаем подтверждения...', '');
            await tx.wait();
            
            state.balance += state.selectedDeposit;
            updateUI();
            saveUserData();
            showToast(`Пополнено: +${state.selectedDeposit} ⭐`, 'success');
            haptic('success');
            
            // Notify bot about deposit
            sendToBot('deposit', { 
                method: 'eth', 
                amount: state.selectedDeposit,
                txHash: tx.hash
            });
            
            closeWallet();
        } catch (e) {
            console.error('ETH deposit error:', e);
            if (e.code === 4001) {
                showToast('Транзакция отменена', 'error');
            } else {
                showToast('Ошибка транзакции', 'error');
            }
        }
    } else {
        showToast('Сначала подключите кошелёк', 'error');
        haptic('error');
    }
}

// ==================== HELPERS ====================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function haptic(type) {
    if (tg?.HapticFeedback) {
        if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
        else if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
        else tg.HapticFeedback.impactOccurred('light');
    }
}

function showToast(text, type = '') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = text;
    document.getElementById('toast-icon').textContent = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function sendToBot(action, data) {
    if (tg) {
        tg.sendData(JSON.stringify({ action, ...data, balance: state.balance }));
    }
}

function showSettings() {
    showToast('Настройки скоро!', '');
}

function showAllCases() {
    switchTab('games');
}

// Metamask events
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', accounts => {
        if (accounts.length === 0) {
            state.ethWallet = null;
            document.getElementById('eth-status').textContent = 'Не подключен';
        }
    });
}

// ==================== DAILY BONUS ====================

function initDailyBonus() {
    const today = new Date().toDateString();
    const lastBonus = state.lastDailyBonus;
    const bonusEl = document.getElementById('daily-bonus');
    const statusEl = document.getElementById('bonus-status');
    const amountEl = document.getElementById('bonus-amount');
    const streakEl = document.getElementById('bonus-streak');
    
    if (lastBonus === today) {
        bonusEl.classList.add('claimed');
        statusEl.textContent = 'Получен!';
        statusEl.style.color = 'var(--text-muted)';
    } else {
        bonusEl.classList.remove('claimed');
        statusEl.textContent = 'Доступен!';
        statusEl.style.color = 'var(--success)';
    }
    
    // Calculate streak bonus
    const streakBonus = Math.min(state.dailyStreak, 7);
    const bonusAmount = 50 + (streakBonus * 10);
    amountEl.textContent = '+' + bonusAmount + ' ⭐';
    streakEl.textContent = 'День ' + (state.dailyStreak + 1);
}

function claimDailyBonus() {
    const today = new Date().toDateString();
    
    if (state.lastDailyBonus === today) {
        showToast('Бонус уже получен!', 'error');
        return;
    }
    
    // Check if streak continues
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (state.lastDailyBonus === yesterday.toDateString()) {
        state.dailyStreak++;
    } else {
        state.dailyStreak = 0;
    }
    
    // Calculate and give bonus
    const streakBonus = Math.min(state.dailyStreak, 7);
    const bonusAmount = 50 + (streakBonus * 10);
    
    state.balance += bonusAmount;
    state.lastDailyBonus = today;
    
    updateUI();
    initDailyBonus();
    saveUserData();
    
    showToast(`🎁 Бонус получен: +${bonusAmount} ⭐`, 'success');
    haptic('success');
    
    // Check streak achievement
    if (state.dailyStreak >= 3) {
        unlockAchievement('streak_3');
    }
    
    // Send to bot
    sendToBot('daily_bonus', { amount: bonusAmount, streak: state.dailyStreak });
}

// ==================== ACHIEVEMENTS ====================

const achievementRewards = {
    first_win: 10,
    streak_3: 50,
    big_win: 100,
    collector: 75,
    jackpot: 500,
    referral: 200
};

function initAchievements() {
    const cards = document.querySelectorAll('.achievement-card');
    let unlocked = 0;
    
    cards.forEach(card => {
        const id = card.dataset.id;
        if (state.achievements[id]) {
            card.classList.remove('locked');
            card.classList.add('unlocked');
            unlocked++;
        }
    });
    
    document.getElementById('ach-progress').textContent = `${unlocked}/${cards.length}`;
}

function unlockAchievement(id) {
    if (state.achievements[id]) return; // Already unlocked
    
    state.achievements[id] = true;
    const reward = achievementRewards[id];
    
    if (reward) {
        state.balance += reward;
        updateUI();
    }
    
    initAchievements();
    saveUserData();
    
    const card = document.querySelector(`.achievement-card[data-id="${id}"]`);
    const name = card?.querySelector('.ach-name')?.textContent || 'Достижение';
    
    showToast(`🏅 ${name}: +${reward} ⭐`, 'success');
    haptic('success');
    
    sendToBot('achievement', { id, reward });
}

function checkAchievements() {
    // First win
    if (state.stats.wins >= 1 && !state.achievements.first_win) {
        unlockAchievement('first_win');
    }
    
    // Big win (single win of 500+)
    // This is checked in game results
    
    // Collector (10 cases)
    if (state.casesOpened >= 10 && !state.achievements.collector) {
        unlockAchievement('collector');
    }
}

// ==================== JACKPOT ====================

let jackpotValue = 12450;
let jackpotInterval;

function initJackpot() {
    // Simulate live jackpot increasing
    jackpotInterval = setInterval(() => {
        jackpotValue += Math.floor(Math.random() * 10) + 1;
        updateJackpotDisplay();
    }, 3000);
    
    updateJackpotDisplay();
}

function updateJackpotDisplay() {
    const el = document.getElementById('jackpot-value');
    if (el) {
        el.textContent = jackpotValue.toLocaleString();
    }
}

function checkJackpot(winAmount) {
    // Random chance to win jackpot on big wins
    if (winAmount >= 100 && Math.random() < 0.01) { // 1% chance
        const jackpotWin = Math.floor(jackpotValue * 0.1); // 10% of jackpot
        state.balance += jackpotWin;
        updateUI();
        saveUserData();
        
        showToast(`🎉 ДЖЕКПОТ! +${jackpotWin} ⭐`, 'success');
        haptic('success');
        
        unlockAchievement('jackpot');
        
        // Reset jackpot
        jackpotValue = 5000 + Math.floor(Math.random() * 5000);
        updateJackpotDisplay();
        
        return true;
    }
    return false;
}

// ==================== ENHANCED DATA PERSISTENCE ====================

function loadUserData() {
    const key = `giftbot_${state.userId || 'guest'}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state.balance = data.balance ?? 100;
            state.inventory = data.inventory ?? [];
            state.history = data.history ?? [];
            state.stats = data.stats ?? { games: 0, wins: 0, profit: 0 };
            state.lastDailyBonus = data.lastDailyBonus ?? null;
            state.dailyStreak = data.dailyStreak ?? 0;
            state.achievements = data.achievements ?? {
                first_win: false,
                streak_3: false,
                big_win: false,
                collector: false,
                jackpot: false,
                referral: false
            };
            state.casesOpened = data.casesOpened ?? 0;
            console.log('User data loaded:', data);
        } catch (e) {
            console.error('Load error:', e);
        }
    }
    
    // Initialize UI elements
    setTimeout(() => {
        initDailyBonus();
        initAchievements();
        initJackpot();
    }, 100);
}

function saveUserData() {
    const key = `giftbot_${state.userId || 'guest'}`;
    const data = {
        balance: state.balance,
        inventory: state.inventory,
        history: state.history.slice(-50),
        stats: state.stats,
        lastDailyBonus: state.lastDailyBonus,
        dailyStreak: state.dailyStreak,
        achievements: state.achievements,
        casesOpened: state.casesOpened,
        savedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
}
