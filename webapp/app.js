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
    lastDailyBonus: null,
    dailyStreak: 0,
    achievements: {},
    casesOpened: 0
};

let tonConnectUI = null;

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App starting...');
    
    // Initialize Telegram
    initTelegram();
    
    // Load saved data
    loadUserData();
    
    // Update UI
    updateUI();
    
    // Initialize TON Connect after delay
    setTimeout(initTonConnect, 1000);
    
    // Initialize bonus and achievements
    setTimeout(function() {
        initDailyBonus();
        initAchievements();
        initJackpot();
    }, 500);
    
    console.log('✅ App initialized');
});

function initTelegram() {
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        
        if (tg.initDataUnsafe?.user) {
            state.userId = tg.initDataUnsafe.user.id;
            state.userName = tg.initDataUnsafe.user.first_name || 'Игрок';
        }
        
        // Apply theme
        if (tg.themeParams) {
            document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color || '#05051a');
            document.documentElement.style.setProperty('--bg-secondary', tg.themeParams.secondary_bg_color || '#0d0d2b');
        }
        
        console.log('✅ Telegram WebApp initialized');
    } else {
        console.log('ℹ️ Running outside Telegram');
    }
}

// ==================== TON CONNECT ====================

function initTonConnect() {
    try {
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.log('⏳ TON_CONNECT_UI not loaded yet');
            return;
        }
        
        const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: manifestUrl,
            buttonRootId: null,
            uiPreferences: { theme: 'DARK' }
        });
        
        tonConnectUI.onStatusChange(function(wallet) {
            if (wallet) {
                state.tonWallet = wallet;
                const addr = wallet.account.address;
                const short = addr.slice(0, 6) + '...' + addr.slice(-4);
                
                var tonStatus = document.getElementById('ton-status');
                var tonBtn = document.getElementById('ton-wallet-btn');
                
                if (tonStatus) tonStatus.textContent = short;
                if (tonBtn) tonBtn.classList.add('connected');
                
                showToast('TON кошелёк подключен!', 'success');
                saveUserData();
            } else {
                state.tonWallet = null;
                var tonStatus = document.getElementById('ton-status');
                var tonBtn = document.getElementById('ton-wallet-btn');
                
                if (tonStatus) tonStatus.textContent = 'Не подключен';
                if (tonBtn) tonBtn.classList.remove('connected');
            }
        });
        
        console.log('✅ TON Connect initialized');
    } catch (e) {
        console.error('❌ TON Connect error:', e);
    }
}

function connectTON() {
    console.log('🔗 connectTON called');
    
    if (!tonConnectUI) {
        showToast('TON Connect загружается...', 'error');
        initTonConnect();
        return;
    }
    
    if (state.tonWallet) {
        tonConnectUI.disconnect();
        showToast('TON кошелёк отключен', 'success');
    } else {
        tonConnectUI.openModal();
    }
}

function connectMetamask() {
    console.log('🦊 connectMetamask called');
    
    if (state.ethWallet) {
        state.ethWallet = null;
        document.getElementById('eth-status').textContent = 'Не подключен';
        showToast('Metamask отключен', 'success');
        return;
    }
    
    if (typeof window.ethereum === 'undefined') {
        showToast('Установите Metamask', 'error');
        window.open('https://metamask.io/download/', '_blank');
        return;
    }
    
    window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(function(accounts) {
            if (accounts.length > 0) {
                state.ethWallet = accounts[0];
                var short = accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4);
                document.getElementById('eth-status').textContent = short;
                showToast('Metamask подключен!', 'success');
                saveUserData();
            }
        })
        .catch(function(e) {
            console.error('Metamask error:', e);
            showToast('Ошибка подключения', 'error');
        });
}

// ==================== DATA ====================

function loadUserData() {
    var key = 'giftbot_' + (state.userId || 'guest');
    var saved = localStorage.getItem(key);
    
    if (saved) {
        try {
            var data = JSON.parse(saved);
            state.balance = data.balance || 100;
            state.inventory = data.inventory || [];
            state.history = data.history || [];
            state.stats = data.stats || { games: 0, wins: 0, profit: 0 };
            state.lastDailyBonus = data.lastDailyBonus || null;
            state.dailyStreak = data.dailyStreak || 0;
            state.achievements = data.achievements || {};
            state.casesOpened = data.casesOpened || 0;
            console.log('✅ User data loaded');
        } catch (e) {
            console.error('❌ Load error:', e);
        }
    }
}

function saveUserData() {
    var key = 'giftbot_' + (state.userId || 'guest');
    var data = {
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

// ==================== UI ====================

function updateUI() {
    var balanceEl = document.getElementById('balance-value');
    var invCountEl = document.getElementById('inv-count');
    var userNameEl = document.getElementById('user-name');
    var userIdEl = document.getElementById('user-id');
    var statGamesEl = document.getElementById('stat-games');
    var statWinsEl = document.getElementById('stat-wins');
    var statProfitEl = document.getElementById('stat-profit');
    
    if (balanceEl) balanceEl.textContent = state.balance;
    if (invCountEl) invCountEl.textContent = state.inventory.length;
    if (userNameEl) userNameEl.textContent = state.userName;
    if (userIdEl) userIdEl.textContent = 'ID: ' + (state.userId || '---');
    if (statGamesEl) statGamesEl.textContent = state.stats.games;
    if (statWinsEl) statWinsEl.textContent = state.stats.wins;
    if (statProfitEl) statProfitEl.textContent = (state.stats.profit >= 0 ? '+' : '') + state.stats.profit;
}

function updateHistoryUI() {
    var list = document.getElementById('history-list');
    if (!list) return;
    
    if (state.history.length === 0) {
        list.innerHTML = '<div class="empty-state">Пока нет игр</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < Math.min(10, state.history.length); i++) {
        var h = state.history[i];
        var emoji = getGameEmoji(h.game);
        var name = getGameName(h.game);
        var result = h.won ? ('+' + h.amount) : ('-' + h.bet);
        var cls = h.won ? 'win' : 'lose';
        html += '<div class="history-item"><span class="game">' + emoji + ' ' + name + '</span><span class="result ' + cls + '">' + result + ' ⭐</span></div>';
    }
    list.innerHTML = html;
}

function getGameEmoji(game) {
    var emojis = { slots: '🎰', coinflip: '🪙', crash: '🚀', dice: '🎲' };
    return emojis[game] || '🎮';
}

function getGameName(game) {
    var names = { slots: 'Слоты', coinflip: 'Монетка', crash: 'Краш', dice: 'Кости' };
    return names[game] || game;
}

// ==================== NAVIGATION ====================

function switchTab(tab) {
    console.log('📱 switchTab:', tab);
    
    // Update nav active state
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(el) {
        if (el.dataset.tab === tab) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    // Handle modals
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    haptic('light');
}

function openWallet() {
    console.log('💳 openWallet');
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('wallet-modal');
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    haptic('medium');
}

function closeWallet() {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('wallet-modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function openProfile() {
    console.log('👤 openProfile');
    updateUI();
    updateHistoryUI();
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('profile-modal');
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    haptic('medium');
}

function closeProfile() {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('profile-modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function openInventory() {
    console.log('🎒 openInventory');
    updateInventoryUI();
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('inventory-modal');
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    haptic('medium');
}

function closeInventory() {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('inventory-modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function openHistory() {
    console.log('📜 openHistory');
    updateFullHistoryUI();
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('history-modal');
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    haptic('medium');
}

function closeHistory() {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('history-modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function openLeaderboard() {
    console.log('🏆 openLeaderboard');
    updateLeaderboardUI();
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('leaderboard-modal');
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    haptic('medium');
}

function closeLeaderboard() {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('leaderboard-modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function openWithdraw() {
    console.log('💸 openWithdraw');
    var withdrawAvailable = document.getElementById('withdraw-available');
    if (withdrawAvailable) withdrawAvailable.textContent = state.balance + ' ⭐';
    
    var inputSection = document.getElementById('withdraw-input-section');
    if (inputSection) inputSection.style.display = 'none';
    
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('withdraw-modal');
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
}

function closeWithdraw() {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('withdraw-modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function closeOverlay() {
    closeAllModals();
}

function closeAllModals() {
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('active');
    
    var modals = document.querySelectorAll('.modal');
    modals.forEach(function(m) {
        m.classList.remove('active');
    });
}

// ==================== INVENTORY ====================

function updateInventoryUI() {
    var grid = document.getElementById('inventory-grid');
    var totalItems = document.getElementById('inv-total-items');
    var totalValue = document.getElementById('inv-total-value');
    var withdrawBtn = document.getElementById('withdraw-all-btn');
    
    if (!grid) return;
    
    if (state.inventory.length === 0) {
        grid.innerHTML = '<div class="empty-state">Инвентарь пуст. Открывайте кейсы!</div>';
        if (totalItems) totalItems.textContent = '0';
        if (totalValue) totalValue.textContent = '0 ⭐';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        return;
    }
    
    var total = 0;
    for (var i = 0; i < state.inventory.length; i++) {
        total += state.inventory[i].value;
    }
    
    if (totalItems) totalItems.textContent = state.inventory.length;
    if (totalValue) totalValue.textContent = total + ' ⭐';
    if (withdrawBtn) withdrawBtn.style.display = 'block';
    
    var html = '';
    for (var i = 0; i < state.inventory.length; i++) {
        var item = state.inventory[i];
        html += '<div class="inventory-item" onclick="sellItem(' + i + ')">';
        html += '<div class="item-icon">' + item.icon + '</div>';
        html += '<div class="item-name">' + item.name + '</div>';
        html += '<div class="item-value">' + item.value + ' ⭐</div>';
        html += '<button class="sell-btn">Продать</button>';
        html += '</div>';
    }
    grid.innerHTML = html;
}

function sellItem(index) {
    if (index < 0 || index >= state.inventory.length) return;
    
    var item = state.inventory[index];
    state.balance += item.value;
    state.inventory.splice(index, 1);
    
    updateUI();
    updateInventoryUI();
    saveUserData();
    
    showToast('Продано: ' + item.name + ' +' + item.value + ' ⭐', 'success');
    haptic('success');
}

function withdrawAll() {
    if (state.inventory.length === 0) return;
    
    var total = 0;
    for (var i = 0; i < state.inventory.length; i++) {
        total += state.inventory[i].value;
    }
    
    state.balance += total;
    state.inventory = [];
    
    updateUI();
    updateInventoryUI();
    saveUserData();
    
    showToast('Выведено: +' + total + ' ⭐', 'success');
    haptic('success');
}

// ==================== HISTORY ====================

var historyFilter = 'all';

function updateFullHistoryUI() {
    var list = document.getElementById('full-history-list');
    if (!list) return;
    
    var filtered = state.history;
    if (historyFilter === 'wins') {
        filtered = state.history.filter(function(h) { return h.won; });
    } else if (historyFilter === 'losses') {
        filtered = state.history.filter(function(h) { return !h.won; });
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">История пуста</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var h = filtered[i];
        var date = new Date(h.time);
        var timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        html += '<div class="history-item-full">';
        html += '<div class="history-left">';
        html += '<span class="history-game-icon">' + getGameEmoji(h.game) + '</span>';
        html += '<div class="history-details">';
        html += '<span class="history-game-name">' + getGameName(h.game) + '</span>';
        html += '<span class="history-time">' + timeStr + '</span>';
        html += '</div></div>';
        html += '<div class="history-right">';
        html += '<span class="history-bet">Ставка: ' + h.bet + ' ⭐</span>';
        html += '<span class="history-result ' + (h.won ? 'win' : 'lose') + '">' + (h.won ? '+' + h.amount : '-' + h.bet) + ' ⭐</span>';
        html += '</div></div>';
    }
    list.innerHTML = html;
}

function filterHistory(filter) {
    historyFilter = filter;
    
    var btns = document.querySelectorAll('.filter-btn');
    btns.forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(filter === 'all' ? 'все' : filter === 'wins' ? 'победы' : 'проигрыши')) {
            btn.classList.add('active');
        }
    });
    
    updateFullHistoryUI();
}

// ==================== LEADERBOARD ====================

var currentLeaderboard = 'profit';

var demoLeaderboard = {
    profit: [
        { name: 'CryptoKing', value: 15420, avatar: '👑' },
        { name: 'LuckyOne', value: 12350, avatar: '🍀' },
        { name: 'ProGamer', value: 9870, avatar: '🎮' },
        { name: 'StarPlayer', value: 7650, avatar: '⭐' },
        { name: 'WinMaster', value: 6230, avatar: '🏆' }
    ],
    wins: [
        { name: 'WinMaster', value: 342, avatar: '🏆' },
        { name: 'LuckyOne', value: 298, avatar: '🍀' },
        { name: 'ProGamer', value: 267, avatar: '🎮' },
        { name: 'CryptoKing', value: 234, avatar: '👑' },
        { name: 'StarPlayer', value: 198, avatar: '⭐' }
    ],
    games: [
        { name: 'ProGamer', value: 1250, avatar: '🎮' },
        { name: 'WinMaster', value: 1120, avatar: '🏆' },
        { name: 'LuckyOne', value: 980, avatar: '🍀' },
        { name: 'CryptoKing', value: 870, avatar: '👑' },
        { name: 'StarPlayer', value: 650, avatar: '⭐' }
    ]
};

function updateLeaderboardUI() {
    var list = document.getElementById('leaderboard-list');
    if (!list) return;
    
    var data = demoLeaderboard[currentLeaderboard];
    var suffix = currentLeaderboard === 'profit' ? ' ⭐' : currentLeaderboard === 'wins' ? ' побед' : ' игр';
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var player = data[i];
        var rank = i < 3 ? ['🥇', '🥈', '🥉'][i] : '#' + (i + 1);
        var topClass = i < 3 ? ' top-' + (i + 1) : '';
        
        html += '<div class="leaderboard-item' + topClass + '">';
        html += '<span class="lb-rank">' + rank + '</span>';
        html += '<span class="lb-avatar">' + player.avatar + '</span>';
        html += '<span class="lb-name">' + player.name + '</span>';
        html += '<span class="lb-value">' + player.value.toLocaleString() + suffix + '</span>';
        html += '</div>';
    }
    list.innerHTML = html;
    
    var yourRank = document.getElementById('your-rank');
    if (yourRank) yourRank.textContent = '#' + (Math.floor(Math.random() * 100) + 10);
}

function switchLeaderboard(type) {
    currentLeaderboard = type;
    
    var tabs = document.querySelectorAll('.lb-tab');
    tabs.forEach(function(tab) {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    updateLeaderboardUI();
}

// ==================== GAMES ====================

function openGame(game) {
    console.log('🎮 openGame:', game);
    
    state.currentGame = game;
    
    var gameTitle = document.getElementById('game-title');
    var gameBody = document.getElementById('game-body');
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('game-modal');
    
    if (!gameTitle || !gameBody || !overlay || !modal) {
        showToast('Ошибка открытия игры', 'error');
        return;
    }
    
    gameTitle.textContent = getGameEmoji(game) + ' ' + getGameName(game);
    
    var html = '';
    if (game === 'slots') {
        html = getSlotsHTML();
    } else if (game === 'coinflip') {
        html = getCoinflipHTML();
    } else if (game === 'crash') {
        html = getCrashHTML();
    } else if (game === 'dice') {
        html = getDiceHTML();
    }
    
    gameBody.innerHTML = html;
    overlay.classList.add('active');
    modal.classList.add('active');
    
    haptic('medium');
}

function closeGame() {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('game-modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function selectBet(amount) {
    state.selectedBet = amount;
    var btns = document.querySelectorAll('.bet-btn');
    btns.forEach(function(btn) {
        btn.classList.remove('selected');
        if (btn.textContent.includes(amount)) {
            btn.classList.add('selected');
        }
    });
    haptic('light');
}

// Slots
function getSlotsHTML() {
    return '<div class="game-content">' +
        '<div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' +
        '<button class="bet-btn selected" onclick="selectBet(10)">10 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(25)">25 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(50)">50 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(100)">100 ⭐</button>' +
        '</div></div>' +
        '<div class="game-display"><div class="slot-reels">' +
        '<div class="slot-reel" id="reel1">❓</div>' +
        '<div class="slot-reel" id="reel2">❓</div>' +
        '<div class="slot-reel" id="reel3">❓</div>' +
        '</div></div>' +
        '<button class="play-btn" onclick="playSlots()">🎰 Крутить</button></div>';
}

function playSlots() {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    var symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
    var results = [];
    
    for (var i = 1; i <= 3; i++) {
        var reel = document.getElementById('reel' + i);
        if (reel) reel.classList.add('spinning');
    }
    
    setTimeout(function() {
        for (var i = 1; i <= 3; i++) {
            var reel = document.getElementById('reel' + i);
            var sym = symbols[Math.floor(Math.random() * symbols.length)];
            results.push(sym);
            if (reel) {
                reel.classList.remove('spinning');
                reel.textContent = sym;
            }
        }
        
        var win = 0;
        if (results[0] === results[1] && results[1] === results[2]) {
            var mults = { '🍒': 3, '🍋': 5, '🍊': 7, '🍇': 10, '⭐': 15, '💎': 30, '7️⃣': 50 };
            win = state.selectedBet * (mults[results[0]] || 3);
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            win = Math.floor(state.selectedBet * 1.5);
        }
        
        if (win > 0) {
            state.balance += win;
            showToast('Победа! +' + win + ' ⭐', 'success');
            haptic('success');
        } else {
            showToast('Не повезло... -' + state.selectedBet + ' ⭐', 'error');
            haptic('error');
        }
        
        updateUI();
        addToHistory('slots', state.selectedBet, win > 0, win);
    }, 1200);
}

// Coinflip
function getCoinflipHTML() {
    return '<div class="game-content">' +
        '<div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' +
        '<button class="bet-btn selected" onclick="selectBet(10)">10 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(25)">25 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(50)">50 ⭐</button>' +
        '</div></div>' +
        '<div class="game-display" id="coin-display"><span style="font-size: 64px">🪙</span></div>' +
        '<p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">Выигрыш: x1.95</p>' +
        '<div style="display: flex; gap: 12px;">' +
        '<button class="play-btn" style="background: linear-gradient(135deg, #f39c12, #e67e22);" onclick="playCoinflip(\'heads\')">🦅 Орёл</button>' +
        '<button class="play-btn" style="background: linear-gradient(135deg, #95a5a6, #7f8c8d);" onclick="playCoinflip(\'tails\')">🪙 Решка</button>' +
        '</div></div>';
}

function playCoinflip(choice) {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    var display = document.getElementById('coin-display');
    if (display) display.innerHTML = '<span style="font-size: 64px; animation: pulse 0.2s infinite">🪙</span>';
    
    setTimeout(function() {
        var result = Math.random() < 0.5 ? 'heads' : 'tails';
        var won = result === choice;
        var emoji = result === 'heads' ? '🦅' : '🪙';
        
        if (display) display.innerHTML = '<span style="font-size: 64px">' + emoji + '</span>';
        
        if (won) {
            var win = Math.floor(state.selectedBet * 1.95);
            state.balance += win;
            showToast('Победа! +' + win + ' ⭐', 'success');
            haptic('success');
            addToHistory('coinflip', state.selectedBet, true, win);
        } else {
            showToast('Не повезло... -' + state.selectedBet + ' ⭐', 'error');
            haptic('error');
            addToHistory('coinflip', state.selectedBet, false, 0);
        }
        
        updateUI();
    }, 1000);
}

// Crash
function getCrashHTML() {
    return '<div class="game-content">' +
        '<div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' +
        '<button class="bet-btn selected" onclick="selectBet(10)">10 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(25)">25 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(50)">50 ⭐</button>' +
        '</div></div>' +
        '<div class="bet-section"><h4>Выйти на</h4><div class="bet-buttons">' +
        '<button class="bet-btn" onclick="playCrash(1.5)">x1.5</button>' +
        '<button class="bet-btn" onclick="playCrash(2)">x2</button>' +
        '<button class="bet-btn" onclick="playCrash(3)">x3</button>' +
        '<button class="bet-btn" onclick="playCrash(5)">x5</button>' +
        '</div></div>' +
        '<div class="game-display" id="crash-display"><div style="text-align: center">' +
        '<div style="font-size: 48px">🚀</div>' +
        '<div style="font-size: 32px; font-weight: bold; margin-top: 10px">x1.00</div>' +
        '</div></div></div>';
}

function playCrash(target) {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    var display = document.getElementById('crash-display');
    var crash = 1.0;
    
    while (Math.random() > 0.05 && crash < 20) {
        crash += 0.1;
    }
    crash = Math.round(crash * 10) / 10;
    
    var current = 1.0;
    var interval = setInterval(function() {
        current += 0.1;
        current = Math.round(current * 10) / 10;
        
        if (current >= crash || current >= target) {
            clearInterval(interval);
            
            var won = target <= crash;
            if (won) {
                var win = Math.floor(state.selectedBet * target);
                state.balance += win;
                if (display) display.innerHTML = '<div style="text-align: center"><div style="font-size: 48px">🎉</div><div style="font-size: 24px; color: var(--success); margin-top: 10px">Успел на x' + target + '!</div><div style="font-size: 20px; margin-top: 5px">+' + win + ' ⭐</div></div>';
                showToast('Победа! +' + win + ' ⭐', 'success');
                haptic('success');
                addToHistory('crash', state.selectedBet, true, win);
            } else {
                if (display) display.innerHTML = '<div style="text-align: center"><div style="font-size: 48px">💥</div><div style="font-size: 24px; color: var(--error); margin-top: 10px">Крэш на x' + crash + '</div><div style="font-size: 20px; margin-top: 5px">-' + state.selectedBet + ' ⭐</div></div>';
                showToast('Крэш! -' + state.selectedBet + ' ⭐', 'error');
                haptic('error');
                addToHistory('crash', state.selectedBet, false, 0);
            }
            updateUI();
            return;
        }
        
        if (display) display.innerHTML = '<div style="text-align: center"><div style="font-size: 48px">🚀</div><div style="font-size: 32px; font-weight: bold; margin-top: 10px; color: ' + (current > 2 ? 'var(--success)' : 'white') + '">x' + current.toFixed(1) + '</div></div>';
    }, 100);
}

// Dice
function getDiceHTML() {
    return '<div class="game-content">' +
        '<div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' +
        '<button class="bet-btn selected" onclick="selectBet(10)">10 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(25)">25 ⭐</button>' +
        '<button class="bet-btn" onclick="selectBet(50)">50 ⭐</button>' +
        '</div></div>' +
        '<div class="game-display" id="dice-display"><span style="font-size: 80px">🎲</span></div>' +
        '<p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">Угадай число (1-6). Выигрыш: x5</p>' +
        '<div class="bet-buttons" style="justify-content: center; margin-bottom: 16px;">' +
        '<button class="bet-btn" onclick="playDice(1)">1</button>' +
        '<button class="bet-btn" onclick="playDice(2)">2</button>' +
        '<button class="bet-btn" onclick="playDice(3)">3</button>' +
        '<button class="bet-btn" onclick="playDice(4)">4</button>' +
        '<button class="bet-btn" onclick="playDice(5)">5</button>' +
        '<button class="bet-btn" onclick="playDice(6)">6</button>' +
        '</div></div>';
}

function playDice(guess) {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    var display = document.getElementById('dice-display');
    var diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    var count = 0;
    var interval = setInterval(function() {
        if (display) display.innerHTML = '<span style="font-size: 80px">' + diceEmojis[Math.floor(Math.random() * 6)] + '</span>';
        count++;
        if (count >= 10) {
            clearInterval(interval);
            
            var result = Math.floor(Math.random() * 6) + 1;
            if (display) display.innerHTML = '<span style="font-size: 80px">' + diceEmojis[result - 1] + '</span>';
            
            var won = result === guess;
            if (won) {
                var win = state.selectedBet * 5;
                state.balance += win;
                showToast('🎯 Угадал! +' + win + ' ⭐', 'success');
                haptic('success');
                addToHistory('dice', state.selectedBet, true, win);
            } else {
                showToast('Выпало ' + result + '. -' + state.selectedBet + ' ⭐', 'error');
                haptic('error');
                addToHistory('dice', state.selectedBet, false, 0);
            }
            
            updateUI();
        }
    }, 100);
}

function addToHistory(game, bet, won, amount) {
    state.history.unshift({
        game: game,
        bet: bet,
        won: won,
        amount: amount,
        time: Date.now()
    });
    
    state.stats.games++;
    if (won) state.stats.wins++;
    state.stats.profit += won ? amount : -bet;
    
    saveUserData();
    updateHistoryUI();
}

// ==================== CASES ====================

var cases = {
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
    console.log('📦 openCase:', type);
    
    var caseData = cases[type];
    if (!caseData) {
        showToast('Неизвестный кейс', 'error');
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
    var roll = Math.random();
    var cumulative = 0;
    var reward = caseData.rewards[0];
    
    for (var i = 0; i < caseData.rewards.length; i++) {
        cumulative += caseData.rewards[i].chance;
        if (roll <= cumulative) {
            reward = caseData.rewards[i];
            break;
        }
    }
    
    // Add to inventory
    state.inventory.push({ icon: reward.icon, name: reward.name, value: reward.value, id: Date.now() });
    updateUI();
    saveUserData();
    
    // Show result
    var gameTitle = document.getElementById('game-title');
    var gameBody = document.getElementById('game-body');
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById('game-modal');
    
    if (gameTitle) gameTitle.textContent = '📦 Открытие кейса';
    if (gameBody) gameBody.innerHTML = '<div class="result-display animate-in">' +
        '<div class="result-icon">' + reward.icon + '</div>' +
        '<div class="result-text">' + reward.name + '</div>' +
        '<div class="result-amount win">' + reward.value + ' ⭐</div>' +
        '<p style="color: var(--text-secondary); margin: 16px 0;">Добавлено в инвентарь</p>' +
        '<button class="play-btn" onclick="closeGame()">Отлично!</button></div>';
    
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    
    haptic('success');
    showToast('Получен: ' + reward.name + '!', 'success');
}

// ==================== DEPOSIT ====================

function selectDeposit(amount) {
    state.selectedDeposit = amount;
    var btns = document.querySelectorAll('.amount-btn');
    btns.forEach(function(btn) {
        btn.classList.remove('selected');
        if (btn.textContent.includes(amount)) {
            btn.classList.add('selected');
        }
    });
    
    var depositBtn = document.getElementById('deposit-btn');
    if (depositBtn) depositBtn.disabled = false;
}

function processDeposit() {
    if (!state.selectedDeposit) {
        showToast('Выберите сумму', 'error');
        return;
    }
    
    if (!state.tonWallet && !state.ethWallet) {
        showToast('Подключите кошелёк', 'error');
        return;
    }
    
    // Simulate deposit
    state.balance += state.selectedDeposit;
    updateUI();
    saveUserData();
    
    showToast('Пополнено: +' + state.selectedDeposit + ' ⭐', 'success');
    haptic('success');
    closeWallet();
}

// ==================== WITHDRAW ====================

var selectedWithdrawMethod = null;

function selectWithdrawMethod(method) {
    selectedWithdrawMethod = method;
    
    var inputSection = document.getElementById('withdraw-input-section');
    var input = document.getElementById('withdraw-amount-input');
    
    if (inputSection) inputSection.style.display = 'block';
    if (input) {
        input.max = state.balance;
        input.placeholder = method === 'ton' ? 'Минимум 1000 ⭐' : 'Минимум 100 ⭐';
    }
}

function processWithdraw() {
    var input = document.getElementById('withdraw-amount-input');
    var amount = parseInt(input?.value || 0);
    
    if (!selectedWithdrawMethod) {
        showToast('Выберите способ', 'error');
        return;
    }
    
    var minAmount = selectedWithdrawMethod === 'ton' ? 1000 : 100;
    
    if (!amount || amount < minAmount) {
        showToast('Минимум ' + minAmount + ' ⭐', 'error');
        return;
    }
    
    if (amount > state.balance) {
        showToast('Недостаточно средств', 'error');
        return;
    }
    
    state.balance -= amount;
    updateUI();
    saveUserData();
    
    showToast('Заявка на вывод ' + amount + ' ⭐ создана!', 'success');
    haptic('success');
    closeWithdraw();
}

// ==================== DAILY BONUS ====================

function initDailyBonus() {
    var today = new Date().toDateString();
    var bonusEl = document.getElementById('daily-bonus');
    var statusEl = document.getElementById('bonus-status');
    var amountEl = document.getElementById('bonus-amount');
    var streakEl = document.getElementById('bonus-streak');
    
    if (state.lastDailyBonus === today) {
        if (bonusEl) bonusEl.classList.add('claimed');
        if (statusEl) {
            statusEl.textContent = 'Получен!';
            statusEl.style.color = 'var(--text-muted)';
        }
    } else {
        if (bonusEl) bonusEl.classList.remove('claimed');
        if (statusEl) {
            statusEl.textContent = 'Доступен!';
            statusEl.style.color = 'var(--success)';
        }
    }
    
    var streakBonus = Math.min(state.dailyStreak, 7);
    var bonusAmount = 50 + (streakBonus * 10);
    if (amountEl) amountEl.textContent = '+' + bonusAmount + ' ⭐';
    if (streakEl) streakEl.textContent = 'День ' + (state.dailyStreak + 1);
}

function claimDailyBonus() {
    var today = new Date().toDateString();
    
    if (state.lastDailyBonus === today) {
        showToast('Бонус уже получен!', 'error');
        return;
    }
    
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (state.lastDailyBonus === yesterday.toDateString()) {
        state.dailyStreak++;
    } else {
        state.dailyStreak = 0;
    }
    
    var streakBonus = Math.min(state.dailyStreak, 7);
    var bonusAmount = 50 + (streakBonus * 10);
    
    state.balance += bonusAmount;
    state.lastDailyBonus = today;
    
    updateUI();
    initDailyBonus();
    saveUserData();
    
    showToast('🎁 Бонус: +' + bonusAmount + ' ⭐', 'success');
    haptic('success');
}

// ==================== ACHIEVEMENTS ====================

function initAchievements() {
    var cards = document.querySelectorAll('.achievement-card');
    var unlocked = 0;
    
    cards.forEach(function(card) {
        var id = card.dataset.id;
        if (state.achievements[id]) {
            card.classList.remove('locked');
            card.classList.add('unlocked');
            unlocked++;
        }
    });
    
    var progress = document.getElementById('ach-progress');
    if (progress) progress.textContent = unlocked + '/' + cards.length;
}

// ==================== JACKPOT ====================

var jackpotValue = 12450;

function initJackpot() {
    setInterval(function() {
        jackpotValue += Math.floor(Math.random() * 10) + 1;
        var el = document.getElementById('jackpot-value');
        if (el) el.textContent = jackpotValue.toLocaleString();
    }, 3000);
}

// ==================== HELPERS ====================

function haptic(type) {
    if (tg?.HapticFeedback) {
        if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
        else if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
        else tg.HapticFeedback.impactOccurred('light');
    }
}

function showToast(text, type) {
    var toast = document.getElementById('toast');
    var toastText = document.getElementById('toast-text');
    var toastIcon = document.getElementById('toast-icon');
    
    if (toastText) toastText.textContent = text;
    if (toastIcon) toastIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    
    if (toast) {
        toast.className = 'toast show ' + (type || '');
        setTimeout(function() {
            toast.classList.remove('show');
        }, 3000);
    }
}

function showSettings() {
    showToast('Настройки скоро!', '');
}

function showAllCases() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== MAKE GLOBAL ====================

window.switchTab = switchTab;
window.openWallet = openWallet;
window.closeWallet = closeWallet;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.openInventory = openInventory;
window.closeInventory = closeInventory;
window.openHistory = openHistory;
window.closeHistory = closeHistory;
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.openWithdraw = openWithdraw;
window.closeWithdraw = closeWithdraw;
window.closeOverlay = closeOverlay;
window.closeAllModals = closeAllModals;
window.openGame = openGame;
window.closeGame = closeGame;
window.openCase = openCase;
window.selectBet = selectBet;
window.playSlots = playSlots;
window.playCoinflip = playCoinflip;
window.playCrash = playCrash;
window.playDice = playDice;
window.selectDeposit = selectDeposit;
window.processDeposit = processDeposit;
window.selectWithdrawMethod = selectWithdrawMethod;
window.processWithdraw = processWithdraw;
window.connectTON = connectTON;
window.connectMetamask = connectMetamask;
window.sellItem = sellItem;
window.withdrawAll = withdrawAll;
window.filterHistory = filterHistory;
window.switchLeaderboard = switchLeaderboard;
window.claimDailyBonus = claimDailyBonus;
window.showSettings = showSettings;
window.showAllCases = showAllCases;
