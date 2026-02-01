// ==================== CONFIG ====================
const CONFIG = {
    DEPOSIT_WALLET: 'UQB6crKdkA_kwYjiq18CPDcJc2BeWwJurkjYsnR7xCfIuM2v',
    TON_TO_STARS: 100,
    MIN_WITHDRAW_STARS: 100,
    MIN_WITHDRAW_TON: 0.1,
    MIN_DEPOSIT_TON: 0.1,
    MAX_WITHDRAW_STARS: 100000
};

// ==================== RANKS ====================
const RANKS = [
    { name: 'Новичок', icon: '🌱', minBalance: 0, maxBet: 50, games: ['slots', 'coinflip'] },
    { name: 'Игрок', icon: '🎮', minBalance: 100, maxBet: 100, games: ['slots', 'coinflip', 'dice'] },
    { name: 'Опытный', icon: '⭐', minBalance: 500, maxBet: 250, games: ['slots', 'coinflip', 'dice', 'crash'] },
    { name: 'Мастер', icon: '🏆', minBalance: 1000, maxBet: 500, games: ['slots', 'coinflip', 'dice', 'crash', 'roulette'] },
    { name: 'Легенда', icon: '👑', minBalance: 5000, maxBet: 1000, games: ['slots', 'coinflip', 'dice', 'crash', 'roulette', 'highroller'] },
    { name: 'VIP', icon: '💎', minBalance: 10000, maxBet: 5000, games: ['slots', 'coinflip', 'dice', 'crash', 'roulette', 'highroller', 'vip_slots'] }
];

// ==================== ACHIEVEMENTS ====================
const ACHIEVEMENTS = {
    first_win: { name: 'Первая победа', icon: '🎯', reward: 10, condition: (s) => s.stats.wins >= 1 },
    streak_3: { name: '3 дня подряд', icon: '🔥', reward: 50, condition: (s) => s.dailyStreak >= 3 },
    big_win: { name: 'Выигрыш 500⭐', icon: '💰', reward: 100, condition: (s) => s.maxWin >= 500 },
    collector: { name: '10 кейсов', icon: '📦', reward: 75, condition: (s) => s.casesOpened >= 10 },
    high_roller: { name: 'Ставка 500⭐', icon: '🎲', reward: 50, condition: (s) => s.maxBet >= 500 },
    lucky_7: { name: '7 побед подряд', icon: '🍀', reward: 150, condition: (s) => s.winStreak >= 7 },
    millionaire: { name: 'Заработал 10000⭐', icon: '💎', reward: 200, condition: (s) => s.totalWon >= 10000 },
    veteran: { name: '100 игр', icon: '🏅', reward: 100, condition: (s) => s.stats.games >= 100 },
    deposit_king: { name: 'Депозит 1000⭐', icon: '👑', reward: 100, condition: (s) => s.totalDeposited >= 1000 },
    case_master: { name: '50 кейсов', icon: '🎁', reward: 200, condition: (s) => s.casesOpened >= 50 },
    consistent: { name: '7 дней подряд', icon: '📅', reward: 250, condition: (s) => s.dailyStreak >= 7 },
    legend: { name: '1000 игр', icon: '⚡', reward: 500, condition: (s) => s.stats.games >= 1000 }
};

// ==================== APP STATE ====================
const tg = window.Telegram?.WebApp;

const state = {
    balance: 100,
    totalDeposited: 0,
    totalWon: 0,
    maxWin: 0,
    maxBet: 0,
    winStreak: 0,
    currentWinStreak: 0,
    inventory: [],
    history: [],
    stats: { games: 0, wins: 0, profit: 0 },
    selectedBet: 10,
    selectedDeposit: 0,
    tonWallet: null,
    userId: null,
    userName: 'Игрок',
    lastDailyBonus: null,
    dailyStreak: 0,
    achievements: {},
    casesOpened: 0,
    settings: { sound: true, notifications: true, autoCollect: false }
};

let tonConnectUI = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App starting...');
    
    initTelegram();
    loadUserData();
    updateUI();
    updateRankUI();
    checkAchievements();
    
    setTimeout(initTonConnect, 1000);
    setTimeout(function() {
        initDailyBonus();
        initJackpot();
    }, 500);
    
    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            var tab = this.getAttribute('data-tab') || this.dataset.tab;
            if (tab) switchTab(tab);
        });
    });
    
    // Sync balance with server on load
    syncBalanceWithServer();
    
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
        
        if (tg.themeParams) {
            document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color || '#05051a');
            document.documentElement.style.setProperty('--bg-secondary', tg.themeParams.secondary_bg_color || '#0d0d2b');
        }
    }
}

// ==================== SERVER SYNC ====================
function syncBalanceWithServer() {
    // Request current balance from server
    sendToBot('sync_balance', { request: true });
}

function reportGameResult(game, bet, won, amount) {
    sendToBot('game_result', {
        game: game,
        bet: bet,
        won: won,
        amount: amount,
        balance: state.balance
    });
}

// ==================== RANK SYSTEM ====================
function getUserRank() {
    var totalBalance = state.balance + state.totalDeposited;
    var rank = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) {
        if (totalBalance >= RANKS[i].minBalance) {
            rank = RANKS[i];
            break;
        }
    }
    return rank;
}

function getNextRank() {
    var currentRank = getUserRank();
    var idx = RANKS.indexOf(currentRank);
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

function canPlayGame(gameType) {
    return getUserRank().games.includes(gameType);
}

function getMaxBet() {
    return getUserRank().maxBet;
}

function updateRankUI() {
    var rank = getUserRank();
    var nextRank = getNextRank();
    
    var rankEl = document.getElementById('user-rank');
    var rankIconEl = document.getElementById('rank-icon');
    var maxBetEl = document.getElementById('max-bet');
    
    if (rankEl) rankEl.textContent = rank.name;
    if (rankIconEl) rankIconEl.textContent = rank.icon;
    if (maxBetEl) maxBetEl.textContent = 'Макс. ставка: ' + rank.maxBet + ' ⭐';
    
    if (nextRank) {
        var progress = document.getElementById('rank-progress');
        var progressText = document.getElementById('rank-progress-text');
        var totalBalance = state.balance + state.totalDeposited;
        var progressPercent = Math.min(100, ((totalBalance - rank.minBalance) / (nextRank.minBalance - rank.minBalance)) * 100);
        
        if (progress) progress.style.width = progressPercent + '%';
        if (progressText) progressText.textContent = 'До ' + nextRank.name + ': ' + Math.max(0, nextRank.minBalance - totalBalance) + ' ⭐';
    } else {
        var progressText = document.getElementById('rank-progress-text');
        if (progressText) progressText.textContent = 'Максимальный ранг!';
        var progress = document.getElementById('rank-progress');
        if (progress) progress.style.width = '100%';
    }
}

// ==================== ACHIEVEMENTS ====================
function checkAchievements() {
    var unlocked = 0;
    var total = Object.keys(ACHIEVEMENTS).length;
    var newUnlock = false;
    
    for (var id in ACHIEVEMENTS) {
        var ach = ACHIEVEMENTS[id];
        var card = document.querySelector('.achievement-card[data-id="' + id + '"]');
        
        if (state.achievements[id]) {
            unlocked++;
            if (card) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
            }
        } else if (ach.condition(state)) {
            // Unlock achievement
            state.achievements[id] = true;
            state.balance += ach.reward;
            unlocked++;
            newUnlock = true;
            
            if (card) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
            }
            
            showToast('🏅 Достижение: ' + ach.name + ' +' + ach.reward + '⭐', 'success');
            haptic('success');
        }
    }
    
    var achProgress = document.getElementById('ach-progress');
    if (achProgress) achProgress.textContent = unlocked + '/' + total;
    
    if (newUnlock) {
        saveUserData();
        updateUI();
    }
}

function updateAchievementsUI() {
    for (var id in ACHIEVEMENTS) {
        var card = document.querySelector('.achievement-card[data-id="' + id + '"]');
        if (card) {
            if (state.achievements[id]) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
            } else {
                card.classList.add('locked');
                card.classList.remove('unlocked');
            }
        }
    }
    
    var unlocked = Object.keys(state.achievements).length;
    var total = Object.keys(ACHIEVEMENTS).length;
    var achProgress = document.getElementById('ach-progress');
    if (achProgress) achProgress.textContent = unlocked + '/' + total;
}

// ==================== TON CONNECT ====================
function initTonConnect() {
    try {
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.log('⏳ TON_CONNECT_UI not loaded');
            return;
        }
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: window.location.origin + '/tonconnect-manifest.json',
            buttonRootId: null,
            uiPreferences: { theme: 'DARK' }
        });
        
        tonConnectUI.onStatusChange(function(wallet) {
            if (wallet) {
                state.tonWallet = wallet;
                var addr = wallet.account.address;
                var short = addr.slice(0, 6) + '...' + addr.slice(-4);
                
                var tonStatus = document.getElementById('ton-status');
                var tonBtn = document.getElementById('ton-wallet-btn');
                
                if (tonStatus) tonStatus.textContent = short;
                if (tonBtn) tonBtn.classList.add('connected');
                
                sendWalletToBot('ton', addr);
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

// ==================== TON TRANSACTIONS ====================
async function sendTONTransaction(amountTON) {
    if (!state.tonWallet || !tonConnectUI) {
        showToast('Подключите TON кошелёк!', 'error');
        return { success: false, error: 'wallet_not_connected' };
    }
    
    try {
        var amountNanoton = Math.floor(amountTON * 1000000000);
        var paymentComment = 'deposit_' + (state.userId || Date.now());
        
        var transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [{
                address: CONFIG.DEPOSIT_WALLET,
                amount: amountNanoton.toString(),
                payload: ''
            }]
        };
        
        showToast('Подтвердите транзакцию в кошельке...', 'info');
        
        var result = await tonConnectUI.sendTransaction(transaction);
        
        if (result && result.boc) {
            var txHash = result.boc.substring(0, 64);
            return { success: true, boc: result.boc, txHash: txHash, comment: paymentComment };
        }
        
        return { success: false, error: 'no_result' };
        
    } catch (e) {
        console.error('❌ Transaction error:', e);
        
        if (e.message && e.message.includes('User rejected')) {
            showToast('Транзакция отменена', 'error');
            return { success: false, error: 'user_rejected' };
        }
        
        showToast('Ошибка: ' + (e.message || 'Попробуйте снова'), 'error');
        return { success: false, error: e.message || 'unknown' };
    }
}

// ==================== DATA ====================
function loadUserData() {
    var key = 'giftbot_' + (state.userId || 'guest');
    var saved = localStorage.getItem(key);
    
    if (saved) {
        try {
            var data = JSON.parse(saved);
            state.balance = data.balance || 100;
            state.totalDeposited = data.totalDeposited || 0;
            state.totalWon = data.totalWon || 0;
            state.maxWin = data.maxWin || 0;
            state.maxBet = data.maxBet || 0;
            state.winStreak = data.winStreak || 0;
            state.currentWinStreak = data.currentWinStreak || 0;
            state.inventory = data.inventory || [];
            state.history = data.history || [];
            state.stats = data.stats || { games: 0, wins: 0, profit: 0 };
            state.lastDailyBonus = data.lastDailyBonus || null;
            state.dailyStreak = data.dailyStreak || 0;
            state.casesOpened = data.casesOpened || 0;
            state.achievements = data.achievements || {};
            state.settings = data.settings || { sound: true, notifications: true, autoCollect: false };
        } catch (e) {
            console.error('Load error:', e);
        }
    }
}

function saveUserData() {
    var key = 'giftbot_' + (state.userId || 'guest');
    var data = {
        balance: state.balance,
        totalDeposited: state.totalDeposited,
        totalWon: state.totalWon,
        maxWin: state.maxWin,
        maxBet: state.maxBet,
        winStreak: state.winStreak,
        currentWinStreak: state.currentWinStreak,
        inventory: state.inventory,
        history: state.history.slice(-50),
        stats: state.stats,
        lastDailyBonus: state.lastDailyBonus,
        dailyStreak: state.dailyStreak,
        casesOpened: state.casesOpened,
        achievements: state.achievements,
        settings: state.settings
    };
    localStorage.setItem(key, JSON.stringify(data));
}

function sendToBot(action, data) {
    if (!tg || !tg.sendData) return;
    
    try {
        var payload = Object.assign({ action: action }, data);
        tg.sendData(JSON.stringify(payload));
    } catch (e) {
        console.error('Send error:', e);
    }
}

function sendWalletToBot(walletType, walletAddress) {
    sendToBot('wallet_connected', { wallet_type: walletType, wallet_address: walletAddress });
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
    
    updateRankUI();
    updateAchievementsUI();
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
    var emojis = { slots: '🎰', coinflip: '🪙', crash: '🚀', dice: '🎲', roulette: '🎡', highroller: '💰', vip_slots: '👑', case: '📦' };
    return emojis[game] || '🎮';
}

function getGameName(game) {
    var names = { slots: 'Слоты', coinflip: 'Монетка', crash: 'Краш', dice: 'Кости', roulette: 'Рулетка', highroller: 'High Roller', vip_slots: 'VIP Слоты', case: 'Кейс' };
    return names[game] || game;
}

// ==================== NAVIGATION ====================
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.remove('active');
        if (el.getAttribute('data-tab') === tab) el.classList.add('active');
    });
    
    if (tab === 'wallet') openWallet();
    else if (tab === 'profile') openProfile();
    else if (tab === 'inventory') openInventory();
    else if (tab === 'history') openHistory();
    else if (tab === 'leaderboard') openLeaderboard();
    else if (tab === 'settings') openSettings();
    else if (tab === 'duels') openDuels();
    else if (tab === 'home' || tab === 'games') {
        closeAllModals();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    haptic('light');
}

function openModal(modalId) {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById(modalId);
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    haptic('medium');
}

function closeModal(modalId) {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById(modalId);
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

function openWallet() { updateDepositUI(); openModal('wallet-modal'); }
function closeWallet() { closeModal('wallet-modal'); }
function openProfile() { updateUI(); updateHistoryUI(); openModal('profile-modal'); }
function closeProfile() { closeModal('profile-modal'); }
function openInventory() { updateInventoryUI(); openModal('inventory-modal'); }
function closeInventory() { closeModal('inventory-modal'); }
function openHistory() { updateFullHistoryUI(); openModal('history-modal'); }
function closeHistory() { closeModal('history-modal'); }
function openLeaderboard() { updateLeaderboardUI(); openModal('leaderboard-modal'); }
function closeLeaderboard() { closeModal('leaderboard-modal'); }
function openWithdraw() {
    var withdrawAvailable = document.getElementById('withdraw-available');
    if (withdrawAvailable) withdrawAvailable.textContent = state.balance + ' ⭐';
    var inputSection = document.getElementById('withdraw-input-section');
    if (inputSection) inputSection.style.display = 'none';
    openModal('withdraw-modal');
}
function closeWithdraw() { closeModal('withdraw-modal'); }
function openSettings() { updateSettingsUI(); openModal('settings-modal'); }
function closeSettings() { closeModal('settings-modal'); }
function openDuels() { updateDuelsUI(); openModal('duels-modal'); }
function closeDuels() { closeModal('duels-modal'); }
function closeOverlay() { closeAllModals(); }
function closeAllModals() {
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('active');
    document.querySelectorAll('.modal').forEach(function(m) { m.classList.remove('active'); });
}

// ==================== SETTINGS ====================
function updateSettingsUI() {
    var soundToggle = document.getElementById('setting-sound');
    var notifToggle = document.getElementById('setting-notifications');
    var autoToggle = document.getElementById('setting-autocollect');
    
    if (soundToggle) soundToggle.checked = state.settings.sound;
    if (notifToggle) notifToggle.checked = state.settings.notifications;
    if (autoToggle) autoToggle.checked = state.settings.autoCollect;
}

function toggleSetting(setting) {
    state.settings[setting] = !state.settings[setting];
    saveUserData();
    showToast('Настройки сохранены', 'success');
}

// ==================== INVENTORY ====================
function updateInventoryUI() {
    var grid = document.getElementById('inventory-grid');
    var totalItems = document.getElementById('inv-total-items');
    var totalValue = document.getElementById('inv-total-value');
    var withdrawAllBtn = document.getElementById('withdraw-all-btn');
    
    if (!grid) return;
    
    if (state.inventory.length === 0) {
        grid.innerHTML = '<div class="empty-state">Инвентарь пуст<br><small>Открывайте кейсы!</small></div>';
        if (totalItems) totalItems.textContent = '0';
        if (totalValue) totalValue.textContent = '0 ⭐';
        if (withdrawAllBtn) withdrawAllBtn.style.display = 'none';
        return;
    }
    
    var total = 0;
    for (var i = 0; i < state.inventory.length; i++) {
        total += state.inventory[i].value;
    }
    
    if (totalItems) totalItems.textContent = state.inventory.length;
    if (totalValue) totalValue.textContent = total + ' ⭐';
    if (withdrawAllBtn) withdrawAllBtn.style.display = 'block';
    
    var html = '';
    for (var i = 0; i < state.inventory.length; i++) {
        var item = state.inventory[i];
        html += '<div class="inventory-item" onclick="sellItem(' + i + ')">' +
            '<div class="item-icon">' + item.icon + '</div>' +
            '<div class="item-name">' + item.name + '</div>' +
            '<div class="item-value">' + item.value + ' ⭐</div>' +
            '<button class="sell-btn">Продать</button></div>';
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
    
    showToast('Продано: +' + item.value + ' ⭐', 'success');
    haptic('success');
}

function withdrawAll() {
    if (state.inventory.length === 0) {
        showToast('Инвентарь пуст', 'error');
        return;
    }
    
    var total = 0;
    for (var i = 0; i < state.inventory.length; i++) {
        total += state.inventory[i].value;
    }
    
    state.balance += total;
    state.inventory = [];
    
    updateUI();
    updateInventoryUI();
    saveUserData();
    
    showToast('Продано всё: +' + total + ' ⭐', 'success');
    haptic('success');
}

// ==================== HISTORY ====================
var historyFilter = 'all';

function updateFullHistoryUI() {
    var list = document.getElementById('full-history-list');
    if (!list) return;
    
    var filtered = state.history;
    if (historyFilter === 'wins') filtered = state.history.filter(function(h) { return h.won; });
    else if (historyFilter === 'losses') filtered = state.history.filter(function(h) { return !h.won; });
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">История пуста</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var h = filtered[i];
        var date = new Date(h.time);
        var timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        html += '<div class="history-item-full">' +
            '<div class="history-left"><span class="history-game-icon">' + getGameEmoji(h.game) + '</span>' +
            '<div class="history-details"><span class="history-game-name">' + getGameName(h.game) + '</span>' +
            '<span class="history-time">' + timeStr + '</span></div></div>' +
            '<div class="history-right"><span class="history-bet">Ставка: ' + h.bet + ' ⭐</span>' +
            '<span class="history-result ' + (h.won ? 'win' : 'lose') + '">' + (h.won ? '+' + h.amount : '-' + h.bet) + ' ⭐</span></div></div>';
    }
    list.innerHTML = html;
}

function filterHistory(filter) {
    historyFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(function(btn) { btn.classList.remove('active'); });
    event.target.classList.add('active');
    updateFullHistoryUI();
}

// ==================== LEADERBOARD ====================
var currentLeaderboard = 'profit';
var demoLeaderboard = {
    profit: [
        { name: 'CryptoKing', value: 15420, avatar: '👑', rank: 'VIP' },
        { name: 'LuckyOne', value: 12350, avatar: '🍀', rank: 'Легенда' },
        { name: 'ProGamer', value: 9870, avatar: '🎮', rank: 'Мастер' },
        { name: 'WinMaster', value: 7650, avatar: '🏆', rank: 'Мастер' },
        { name: 'StarPlayer', value: 5430, avatar: '⭐', rank: 'Опытный' }
    ],
    wins: [
        { name: 'WinMaster', value: 342, avatar: '🏆', rank: 'Мастер' },
        { name: 'LuckyOne', value: 298, avatar: '🍀', rank: 'Легенда' },
        { name: 'ProGamer', value: 256, avatar: '🎮', rank: 'Мастер' },
        { name: 'CryptoKing', value: 234, avatar: '👑', rank: 'VIP' },
        { name: 'StarPlayer', value: 189, avatar: '⭐', rank: 'Опытный' }
    ],
    games: [
        { name: 'ProGamer', value: 1250, avatar: '🎮', rank: 'Мастер' },
        { name: 'WinMaster', value: 1120, avatar: '🏆', rank: 'Мастер' },
        { name: 'LuckyOne', value: 987, avatar: '🍀', rank: 'Легенда' },
        { name: 'CryptoKing', value: 856, avatar: '👑', rank: 'VIP' },
        { name: 'StarPlayer', value: 654, avatar: '⭐', rank: 'Опытный' }
    ]
};

function updateLeaderboardUI() {
    var list = document.getElementById('leaderboard-list');
    if (!list) return;
    
    var data = demoLeaderboard[currentLeaderboard] || [];
    var suffix = currentLeaderboard === 'profit' ? ' ⭐' : currentLeaderboard === 'wins' ? ' побед' : ' игр';
    
    // Add current user to leaderboard
    var userData = {
        name: state.userName,
        avatar: getUserRank().icon,
        rank: getUserRank().name
    };
    
    if (currentLeaderboard === 'profit') userData.value = state.stats.profit;
    else if (currentLeaderboard === 'wins') userData.value = state.stats.wins;
    else userData.value = state.stats.games;
    
    // Find user position
    var userPos = data.length + 1;
    for (var i = 0; i < data.length; i++) {
        if (userData.value > data[i].value) {
            userPos = i + 1;
            break;
        }
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var player = data[i];
        var rank = i < 3 ? ['🥇', '🥈', '🥉'][i] : '#' + (i + 1);
        var topClass = i === 0 ? ' top-1' : i === 1 ? ' top-2' : i === 2 ? ' top-3' : '';
        html += '<div class="leaderboard-item' + topClass + '"><span class="lb-rank">' + rank + '</span>' +
            '<span class="lb-avatar">' + player.avatar + '</span>' +
            '<div class="lb-info"><span class="lb-name">' + player.name + '</span>' +
            '<span class="lb-player-rank">' + player.rank + '</span></div>' +
            '<span class="lb-value">' + player.value + suffix + '</span></div>';
    }
    list.innerHTML = html;
    
    var yourRank = document.getElementById('your-rank');
    if (yourRank) yourRank.textContent = '#' + userPos + ' (' + userData.value + suffix + ')';
}

function switchLeaderboard(type) {
    currentLeaderboard = type;
    document.querySelectorAll('.lb-tab').forEach(function(tab) { tab.classList.remove('active'); });
    event.target.classList.add('active');
    updateLeaderboardUI();
}

// ==================== GAMES ====================
function openGame(game) {
    if (!canPlayGame(game)) {
        var rank = getUserRank();
        var needed = null;
        for (var i = 0; i < RANKS.length; i++) {
            if (RANKS[i].games.includes(game)) {
                needed = RANKS[i];
                break;
            }
        }
        showToast('Нужен ранг: ' + (needed ? needed.name : 'выше'), 'error');
        return;
    }
    
    state.currentGame = game;
    
    var gameTitle = document.getElementById('game-title');
    var gameBody = document.getElementById('game-body');
    
    if (!gameTitle || !gameBody) return;
    
    gameTitle.textContent = getGameEmoji(game) + ' ' + getGameName(game);
    
    var maxBet = getMaxBet();
    var html = '';
    
    if (game === 'slots') html = getSlotsHTML(maxBet);
    else if (game === 'coinflip') html = getCoinflipHTML(maxBet);
    else if (game === 'crash') html = getCrashHTML(maxBet);
    else if (game === 'dice') html = getDiceHTML(maxBet);
    else if (game === 'roulette') html = getRouletteHTML(maxBet);
    else if (game === 'highroller') html = getHighRollerHTML(maxBet);
    else if (game === 'vip_slots') html = getVIPSlotsHTML(maxBet);
    
    gameBody.innerHTML = html;
    openModal('game-modal');
}

function closeGame() { closeModal('game-modal'); }

function selectBet(amount) {
    var maxBet = getMaxBet();
    if (amount > maxBet) {
        showToast('Макс. ставка: ' + maxBet + ' ⭐', 'error');
        return;
    }
    state.selectedBet = amount;
    if (amount > state.maxBet) state.maxBet = amount;
    
    document.querySelectorAll('.bet-btn').forEach(function(btn) {
        btn.classList.remove('selected');
        if (btn.textContent.includes(amount)) btn.classList.add('selected');
    });
    haptic('light');
}

function getBetButtonsHTML(maxBet) {
    var bets = [10, 25, 50, 100, 250, 500, 1000];
    var html = '';
    for (var i = 0; i < bets.length; i++) {
        if (bets[i] <= maxBet) {
            var selected = bets[i] === state.selectedBet ? ' selected' : '';
            html += '<button class="bet-btn' + selected + '" onclick="selectBet(' + bets[i] + ')">' + bets[i] + ' ⭐</button>';
        }
    }
    return html;
}

// Slots
function getSlotsHTML(maxBet) {
    return '<div class="game-content"><div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' + getBetButtonsHTML(maxBet) + '</div></div>' +
        '<div class="game-display"><div class="slot-reels">' +
        '<div class="slot-reel" id="reel1">❓</div><div class="slot-reel" id="reel2">❓</div><div class="slot-reel" id="reel3">❓</div>' +
        '</div></div><button class="play-btn" onclick="playSlots()">🎰 Крутить</button></div>';
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
        
        processGameResult('slots', state.selectedBet, win > 0, win);
    }, 1200);
}

// Coinflip
function getCoinflipHTML(maxBet) {
    return '<div class="game-content"><div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' + getBetButtonsHTML(maxBet) + '</div></div>' +
        '<div class="game-display" id="coin-display"><span style="font-size: 64px">🪙</span></div>' +
        '<p style="text-align: center; color: var(--text-secondary);">Выигрыш: x1.95</p>' +
        '<div style="display: flex; gap: 12px;"><button class="play-btn" style="background: #f39c12;" onclick="playCoinflip(\'heads\')">🦅 Орёл</button>' +
        '<button class="play-btn" style="background: #95a5a6;" onclick="playCoinflip(\'tails\')">🪙 Решка</button></div></div>';
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
        
        var win = won ? Math.floor(state.selectedBet * 1.95) : 0;
        processGameResult('coinflip', state.selectedBet, won, win);
    }, 1000);
}

// Crash
function getCrashHTML(maxBet) {
    return '<div class="game-content"><div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' + getBetButtonsHTML(maxBet) + '</div></div>' +
        '<div class="bet-section"><h4>Выйти на</h4><div class="bet-buttons">' +
        '<button class="bet-btn" onclick="playCrash(1.5)">x1.5</button>' +
        '<button class="bet-btn" onclick="playCrash(2)">x2</button>' +
        '<button class="bet-btn" onclick="playCrash(3)">x3</button>' +
        '<button class="bet-btn" onclick="playCrash(5)">x5</button></div></div>' +
        '<div class="game-display" id="crash-display"><div style="text-align: center">' +
        '<div style="font-size: 48px">🚀</div><div style="font-size: 32px; font-weight: bold;">x1.00</div></div></div></div>';
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
    
    while (Math.random() > 0.05 && crash < 20) crash += 0.1;
    crash = Math.round(crash * 10) / 10;
    
    var current = 1.0;
    var interval = setInterval(function() {
        current += 0.1;
        current = Math.round(current * 10) / 10;
        
        if (current >= crash || current >= target) {
            clearInterval(interval);
            
            var won = target <= crash;
            var win = won ? Math.floor(state.selectedBet * target) : 0;
            
            if (won) {
                if (display) display.innerHTML = '<div style="text-align: center"><div style="font-size: 48px">🎉</div><div style="color: var(--success);">+' + win + ' ⭐</div></div>';
            } else {
                if (display) display.innerHTML = '<div style="text-align: center"><div style="font-size: 48px">💥</div><div style="color: var(--error);">Крэш на x' + crash + '</div></div>';
            }
            
            processGameResult('crash', state.selectedBet, won, win);
            return;
        }
        
        if (display) display.innerHTML = '<div style="text-align: center"><div style="font-size: 48px">🚀</div><div style="font-size: 32px; font-weight: bold;">x' + current.toFixed(1) + '</div></div>';
    }, 100);
}

// Dice
function getDiceHTML(maxBet) {
    return '<div class="game-content"><div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' + getBetButtonsHTML(maxBet) + '</div></div>' +
        '<div class="game-display" id="dice-display"><span style="font-size: 80px">🎲</span></div>' +
        '<p style="text-align: center; color: var(--text-secondary);">Угадай число (1-6). Выигрыш: x5</p>' +
        '<div class="bet-buttons" style="justify-content: center;">' +
        '<button class="bet-btn" onclick="playDice(1)">1</button><button class="bet-btn" onclick="playDice(2)">2</button>' +
        '<button class="bet-btn" onclick="playDice(3)">3</button><button class="bet-btn" onclick="playDice(4)">4</button>' +
        '<button class="bet-btn" onclick="playDice(5)">5</button><button class="bet-btn" onclick="playDice(6)">6</button></div></div>';
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
            var win = won ? state.selectedBet * 5 : 0;
            processGameResult('dice', state.selectedBet, won, win);
        }
    }, 100);
}

// Roulette
function getRouletteHTML(maxBet) {
    return '<div class="game-content"><div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' + getBetButtonsHTML(maxBet) + '</div></div>' +
        '<div class="game-display" id="roulette-display"><span style="font-size: 64px">🎡</span></div>' +
        '<p style="text-align: center; color: var(--text-secondary);">Красное x2 | Чёрное x2 | Зелёное x14</p>' +
        '<div style="display: flex; gap: 8px;">' +
        '<button class="play-btn" style="background: #e74c3c; flex: 1;" onclick="playRoulette(\'red\')">🔴</button>' +
        '<button class="play-btn" style="background: #27ae60; flex: 0.5;" onclick="playRoulette(\'green\')">🟢</button>' +
        '<button class="play-btn" style="background: #2c3e50; flex: 1;" onclick="playRoulette(\'black\')">⚫</button></div></div>';
}

function playRoulette(choice) {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    var display = document.getElementById('roulette-display');
    if (display) display.innerHTML = '<span style="font-size: 64px; animation: spin 0.5s infinite linear">🎡</span>';
    
    setTimeout(function() {
        var rand = Math.random();
        var result = rand < 0.07 ? 'green' : rand < 0.535 ? 'red' : 'black';
        var emoji = result === 'red' ? '🔴' : result === 'black' ? '⚫' : '🟢';
        
        if (display) display.innerHTML = '<span style="font-size: 64px">' + emoji + '</span>';
        
        var won = result === choice;
        var mult = result === 'green' ? 14 : 2;
        var win = won ? state.selectedBet * mult : 0;
        
        processGameResult('roulette', state.selectedBet, won, win);
    }, 2000);
}

// High Roller
function getHighRollerHTML(maxBet) {
    return '<div class="game-content"><div class="game-display" style="text-align: center; padding: 20px;">' +
        '<div style="font-size: 48px;">💰</div><h3 style="color: gold;">HIGH ROLLER</h3>' +
        '<p style="color: var(--text-secondary);">50/50 шанс удвоить!</p></div>' +
        '<div class="bet-section"><h4>Ставка</h4><div class="bet-buttons">' + getBetButtonsHTML(maxBet) + '</div></div>' +
        '<button class="play-btn" style="background: linear-gradient(135deg, gold, #ff6b00);" onclick="playHighRoller()">💰 ВА-БАНК</button></div>';
}

function playHighRoller() {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    setTimeout(function() {
        var won = Math.random() < 0.5;
        var win = won ? state.selectedBet * 2 : 0;
        processGameResult('highroller', state.selectedBet, won, win);
    }, 1500);
}

// VIP Slots
function getVIPSlotsHTML(maxBet) {
    return '<div class="game-content"><div class="bet-section"><h4>VIP Ставка</h4><div class="bet-buttons">' + getBetButtonsHTML(maxBet) + '</div></div>' +
        '<div class="game-display"><div class="slot-reels">' +
        '<div class="slot-reel vip" id="reel1">👑</div><div class="slot-reel vip" id="reel2">👑</div><div class="slot-reel vip" id="reel3">👑</div>' +
        '</div></div><button class="play-btn vip-btn" onclick="playVIPSlots()">👑 VIP КРУТИТЬ</button></div>';
}

function playVIPSlots() {
    if (state.balance < state.selectedBet) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= state.selectedBet;
    updateUI();
    
    var symbols = ['💎', '👑', '🌟', '💰', '🏆'];
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
            var mults = { '💎': 50, '👑': 75, '🌟': 40, '💰': 100, '🏆': 60 };
            win = state.selectedBet * (mults[results[0]] || 40);
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            win = Math.floor(state.selectedBet * 2.5);
        }
        
        processGameResult('vip_slots', state.selectedBet, win > 0, win);
    }, 1500);
}

// Unified game result processing
function processGameResult(game, bet, won, amount) {
    if (won && amount > 0) {
        state.balance += amount;
        state.totalWon += amount;
        if (amount > state.maxWin) state.maxWin = amount;
        state.currentWinStreak++;
        if (state.currentWinStreak > state.winStreak) state.winStreak = state.currentWinStreak;
        
        showToast('Победа! +' + amount + ' ⭐', 'success');
        haptic('success');
    } else {
        state.currentWinStreak = 0;
        showToast('Не повезло...', 'error');
        haptic('error');
    }
    
    updateUI();
    addToHistory(game, bet, won, amount);
    reportGameResult(game, bet, won, amount);
    checkAchievements();
}

function addToHistory(game, bet, won, amount) {
    state.history.unshift({ game: game, bet: bet, won: won, amount: amount, time: Date.now() });
    state.stats.games++;
    if (won) state.stats.wins++;
    state.stats.profit += won ? amount : -bet;
    saveUserData();
    updateHistoryUI();
}

// ==================== DUELS ====================
function updateDuelsUI() {
    var list = document.getElementById('duels-list');
    if (!list) return;
    
    list.innerHTML = '<div class="duel-create"><h4>⚔️ Дуэли с друзьями</h4>' +
        '<p style="color: var(--text-secondary); margin-bottom: 16px;">Бросай вызов друзьям и выигрывай!</p>' +
        '<div class="duel-amounts">' +
        '<button class="duel-amount-btn" onclick="createDuel(50)">50 ⭐</button>' +
        '<button class="duel-amount-btn" onclick="createDuel(100)">100 ⭐</button>' +
        '<button class="duel-amount-btn" onclick="createDuel(250)">250 ⭐</button>' +
        '</div>' +
        '<div style="margin-top: 20px; padding: 15px; background: var(--glass); border-radius: 12px;">' +
        '<p style="text-align: center; color: var(--text-muted); font-size: 13px;">🚧 Полная версия дуэлей скоро!</p>' +
        '</div></div>';
}

function createDuel(amount) {
    if (state.balance < amount) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    showToast('🚧 Дуэли скоро будут доступны!', 'info');
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
    var caseData = cases[type];
    if (!caseData) return;
    
    if (state.balance < caseData.price) {
        showToast('Недостаточно средств!', 'error');
        return;
    }
    
    state.balance -= caseData.price;
    state.casesOpened++;
    updateUI();
    
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
    
    state.inventory.push({ icon: reward.icon, name: reward.name, value: reward.value, id: Date.now() });
    
    addToHistory('case', caseData.price, true, reward.value);
    saveUserData();
    checkAchievements();
    
    var gameTitle = document.getElementById('game-title');
    var gameBody = document.getElementById('game-body');
    
    if (gameTitle) gameTitle.textContent = '📦 Кейс открыт!';
    if (gameBody) gameBody.innerHTML = '<div class="result-display animate-in">' +
        '<div class="result-icon">' + reward.icon + '</div>' +
        '<div class="result-text">' + reward.name + '</div>' +
        '<div class="result-amount win">' + reward.value + ' ⭐</div>' +
        '<button class="play-btn" onclick="closeGame()">Отлично!</button></div>';
    
    openModal('game-modal');
    haptic('success');
    showToast('Получен: ' + reward.name + '!', 'success');
}

// ==================== DEPOSIT ====================
function updateDepositUI() {
    var depositInfo = document.getElementById('deposit-info');
    if (depositInfo) {
        depositInfo.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px; text-align: center;">1 TON = ' + CONFIG.TON_TO_STARS + ' ⭐</p>';
    }
}

function selectDeposit(amountStars) {
    state.selectedDeposit = amountStars;
    document.querySelectorAll('.amount-btn').forEach(function(btn) {
        btn.classList.remove('selected');
        if (btn.textContent.includes(amountStars)) btn.classList.add('selected');
    });
    
    var depositBtn = document.getElementById('deposit-btn');
    var tonAmount = amountStars / CONFIG.TON_TO_STARS;
    if (depositBtn) {
        depositBtn.disabled = false;
        depositBtn.textContent = 'Оплатить ' + tonAmount.toFixed(2) + ' TON';
    }
}

async function processDeposit() {
    if (!state.selectedDeposit) {
        showToast('Выберите сумму', 'error');
        return;
    }
    
    if (!state.tonWallet) {
        showToast('Подключите TON кошелёк!', 'error');
        return;
    }
    
    var amountTON = state.selectedDeposit / CONFIG.TON_TO_STARS;
    
    if (amountTON < CONFIG.MIN_DEPOSIT_TON) {
        showToast('Минимум: ' + CONFIG.MIN_DEPOSIT_TON + ' TON', 'error');
        return;
    }
    
    var depositBtn = document.getElementById('deposit-btn');
    if (depositBtn) {
        depositBtn.disabled = true;
        depositBtn.textContent = 'Обработка...';
    }
    
    var result = await sendTONTransaction(amountTON);
    
    if (result.success) {
        showToast('⏳ Транзакция отправлена!', 'info');
        
        sendToBot('deposit', { 
            amount_ton: amountTON, 
            amount_stars: state.selectedDeposit,
            wallet: state.tonWallet?.account?.address || 'unknown',
            tx_hash: result.txHash || ''
        });
        
        state.totalDeposited += state.selectedDeposit;
        saveUserData();
        checkAchievements();
        
        haptic('success');
        closeWallet();
    }
    
    if (depositBtn) {
        depositBtn.disabled = false;
        depositBtn.textContent = 'Оплатить ' + amountTON.toFixed(2) + ' TON';
    }
}

// ==================== WITHDRAW ====================
var selectedWithdrawMethod = null;

function selectWithdrawMethod(method) {
    selectedWithdrawMethod = method;
    var inputSection = document.getElementById('withdraw-input-section');
    var input = document.getElementById('withdraw-amount-input');
    
    if (inputSection) inputSection.style.display = 'block';
    if (input) input.max = state.balance;
    
    document.querySelectorAll('.withdraw-option').forEach(function(opt) {
        opt.classList.remove('selected');
    });
    event.target.closest('.withdraw-option').classList.add('selected');
}

function processWithdraw() {
    var input = document.getElementById('withdraw-amount-input');
    var amount = parseInt(input?.value || 0);
    
    if (!selectedWithdrawMethod) {
        showToast('Выберите способ', 'error');
        return;
    }
    
    if (!state.tonWallet) {
        showToast('Подключите TON кошелёк!', 'error');
        return;
    }
    
    if (!amount || amount < CONFIG.MIN_WITHDRAW_STARS) {
        showToast('Минимум ' + CONFIG.MIN_WITHDRAW_STARS + ' ⭐', 'error');
        return;
    }
    
    if (amount > CONFIG.MAX_WITHDRAW_STARS) {
        showToast('Максимум ' + CONFIG.MAX_WITHDRAW_STARS + ' ⭐', 'error');
        return;
    }
    
    if (amount > state.balance) {
        showToast('Недостаточно средств', 'error');
        return;
    }
    
    sendToBot('withdraw_request', { 
        amount_stars: amount, 
        method: selectedWithdrawMethod,
        wallet: state.tonWallet?.account?.address || ''
    });
    
    var tonAmount = amount / CONFIG.TON_TO_STARS;
    showToast('📤 Заявка на ' + tonAmount.toFixed(2) + ' TON создана!', 'success');
    haptic('success');
    closeWithdraw();
}

// ==================== DAILY BONUS ====================
function initDailyBonus() {
    var today = new Date().toDateString();
    var bonusEl = document.getElementById('daily-bonus');
    var statusEl = document.getElementById('bonus-status');
    var streakEl = document.getElementById('bonus-streak');
    
    if (state.lastDailyBonus === today) {
        if (bonusEl) bonusEl.classList.add('claimed');
        if (statusEl) statusEl.textContent = 'Получен!';
    } else {
        if (bonusEl) bonusEl.classList.remove('claimed');
        if (statusEl) statusEl.textContent = 'Доступен!';
    }
    
    if (streakEl) streakEl.textContent = 'День ' + (state.dailyStreak + 1);
    
    var streakBonus = Math.min(state.dailyStreak, 7);
    var bonusAmount = 50 + (streakBonus * 10);
    var amountEl = document.getElementById('bonus-amount');
    if (amountEl) amountEl.textContent = '+' + bonusAmount + ' ⭐';
}

function claimDailyBonus() {
    var today = new Date().toDateString();
    
    if (state.lastDailyBonus === today) {
        showToast('Бонус уже получен! Приходи завтра.', 'error');
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
    checkAchievements();
    
    showToast('🎁 Бонус: +' + bonusAmount + ' ⭐ (День ' + (state.dailyStreak + 1) + ')', 'success');
    haptic('success');
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
    if (!state.settings.sound) return;
    
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
        setTimeout(function() { toast.classList.remove('show'); }, 3000);
    }
}

function showAllCases() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== GLOBAL ====================
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
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.openDuels = openDuels;
window.closeDuels = closeDuels;
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
window.playRoulette = playRoulette;
window.playHighRoller = playHighRoller;
window.playVIPSlots = playVIPSlots;
window.selectDeposit = selectDeposit;
window.processDeposit = processDeposit;
window.selectWithdrawMethod = selectWithdrawMethod;
window.processWithdraw = processWithdraw;
window.connectTON = connectTON;
window.sellItem = sellItem;
window.withdrawAll = withdrawAll;
window.filterHistory = filterHistory;
window.switchLeaderboard = switchLeaderboard;
window.claimDailyBonus = claimDailyBonus;
window.showAllCases = showAllCases;
window.toggleSetting = toggleSetting;
window.createDuel = createDuel;
