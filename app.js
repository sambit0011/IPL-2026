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
    list: document.getElementById('leaderboard-list'),
    search: document.getElementById('playerSearch'),
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
 * CSV Parser (Custom for your sheet: Name@0, Rank@1, Total@3)
 */
function parseCSV(csv) {
    const lines = csv.split('\n');
    const result = [];

    // Skip Header Line
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (row.length < 4 || !row[0]) continue;

        result.push({
            name: row[0],
            rank: parseInt(row[1]) || i,
            previousRank: parseInt(row[2]) || null,
            points: parseFloat(row[3]) || 0,
            team: "POINTS TABLE" // Placeholder since it's not on the sheet
        });
    }

    // Sort by rank ascending (since rank is provided) or points descending if ranks are missing
    return result.sort((a, b) => a.rank - b.rank);
}

/**
 * Render List up to DOM
 */
function renderLeaderboard(data) {
    elements.list.innerHTML = '';
    
    if (data.length === 0) {
        elements.list.innerHTML = '<div class="no-results" style="text-align:center; padding:20px; color:var(--text-secondary);">No players found.</div>';
        return;
    }

    data.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = `leaderboard-item ${p.rank <= 3 ? 'top-three' : ''}`;
        
        // Calculate movement if previous rank exists
        let movementIcon = '';
        if (p.previousRank) {
            if (p.rank < p.previousRank) movementIcon = '<span style="color:#4ade80; font-size:0.7rem; margin-top:2px;">▲ Up</span>';
            else if (p.rank > p.previousRank) movementIcon = '<span style="color:#f87171; font-size:0.7rem; margin-top:2px;">▼ Down</span>';
        }

        item.innerHTML = `
            <div class="rank">#${p.rank} ${movementIcon}</div>
            <div class="player-info">
                <span class="player-name">${p.name}</span>
                <span class="team-name">${p.team}</span>
            </div>
            <div class="points">${p.points.toLocaleString()} pts</div>
        `;
        elements.list.appendChild(item);
    });
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
    elements.search.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allPlayerData.filter(p => 
            p.name.toLowerCase().includes(searchTerm)
        );
        renderLeaderboard(filtered);
    });
}

document.addEventListener('DOMContentLoaded', init);

