// Configuration
const CONFIG = {
    // Direct Public CSV URL from Google Sheets
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLE1kQX5IZnCcEI4FogJjv2zlKYZPHhGaDvav4UY73Y9sMUUqAmtpAeMB9RFemawdlnWR6KmrRyYTu/pub?gid=0&single=true&output=csv',
    REFRESH_INTERVAL: 60000, 
};

// Fallback Dummy Data (only if fetch fails)
const DUMMY_DATA = [
    { rank: 1, name: "Pritam", team: "Fantasy Manager", points: 1764.5 },
];

let allPlayerData = [];

const elements = {
    mainView: document.getElementById('main-view'),
    detailsView: document.getElementById('details-view'),
    list: document.getElementById('leaderboard-list'),
    matchesList: document.getElementById('matches-list'),
    detailsName: document.getElementById('details-name'),
    detailsTotal: document.getElementById('details-total-points'),
    backBtn: document.getElementById('back-btn'),
    totalPlayers: document.getElementById('total-players'),
    topScore: document.getElementById('top-score'),
    lastUpdated: document.getElementById('last-update-time'),
};

/**
 * Initialize the App
 */
async function init() {
    await loadData();
    setupEventListeners();
    setInterval(loadData, CONFIG.REFRESH_INTERVAL);
}

/**
 * Load Data from Google Sheet
 */
async function loadData() {
    try {
        const response = await fetch(CONFIG.CSV_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const csvText = await response.text();
        allPlayerData = parseCSV(csvText);
        
        if (allPlayerData.length === 0) throw new Error('No data found');
        console.log('Fetched live data:', allPlayerData);
    } catch (error) {
        console.warn('Sync failed. Error:', error.message);
        if (allPlayerData.length === 0) allPlayerData = DUMMY_DATA;
    }

    renderLeaderboard(allPlayerData);
    updateStats(allPlayerData);
    elements.lastUpdated.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * CSV Parser (Name@0, Rank@1, PrevRank@2, Total@3, Matches@5+)
 */
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (row.length < 4 || !row[0] || row[0].toLowerCase().includes('player name')) continue;

        // Parse matches
        const matches = [];
        for (let j = 5; j < row.length; j++) {
            if (headers[j] && (row[j] || row[j] === "0")) {
                matches.push({
                    number: j - 4,
                    name: headers[j],
                    points: row[j] || "0"
                });
            }
        }

        result.push({
            name: row[0],
            rank: row[1] || i,
            previousRank: row[2] || null,
            points: row[3] || 0,
            matches: matches
        });
    }

    return result;
}

/**
 * Render Leaderboard
 */
function renderLeaderboard(data) {
    elements.list.innerHTML = '';
    
    data.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = `leaderboard-item ${index < 3 ? 'top-three' : ''}`;
        
        let movementIcon = '';
        if (p.previousRank && p.rank !== p.previousRank) {
            const current = parseInt(p.rank);
            const prev = parseInt(p.previousRank);
            if (current < prev) {
                movementIcon = `<div style="color:#4ade80; font-size:0.65rem; font-weight:700; margin-top:2px;">▲ Up</div>`;
            } else if (current > prev) {
                movementIcon = `<div style="color:#f87171; font-size:0.65rem; font-weight:700; margin-top:2px;">▼ Down</div>`;
            }
        }

        item.onclick = () => showPlayerDetails(p);

        item.innerHTML = `
            <div class="rank" style="display:flex; flex-direction:column; align-items:center;">
                <span>#${p.rank}</span>
                ${movementIcon}
            </div>
            <div class="player-info">
                <span class="player-name">${p.name}</span>
                <span class="team-name">Prev Rank: ${p.previousRank || '--'}</span>
            </div>
            <div class="points">${p.points.toLocaleString()}</div>
        `;
        elements.list.appendChild(item);
    });
}

/**
 * Navigation: Show Details
 */
function showPlayerDetails(player) {
    elements.mainView.classList.add('hidden');
    elements.detailsView.classList.remove('hidden');
    
    elements.detailsName.textContent = player.name;
    elements.detailsTotal.textContent = `${player.points.toLocaleString()} Total Points`;
    
    elements.matchesList.innerHTML = '';
    player.matches.forEach(m => {
        const row = document.createElement('div');
        row.className = 'match-item';
        row.innerHTML = `
            <span class="match-num">${m.number}</span>
            <span class="match-name">${m.name}</span>
            <span class="match-points">${m.points}</span>
        `;
        elements.matchesList.appendChild(row);
    });
    
    window.scrollTo(0, 0);
}

/**
 * Navigation: Back to Leaderboard
 */
function goBack() {
    elements.detailsView.classList.add('hidden');
    elements.mainView.classList.remove('hidden');
}

/**
 * Update Stats Cards
 */
function updateStats(data) {
    elements.totalPlayers.textContent = data.length;
    elements.topScore.textContent = data.length > 0 ? data[0].points.toLocaleString() : '--';
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    elements.backBtn.onclick = goBack;
}

document.addEventListener('DOMContentLoaded', init);

