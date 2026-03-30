/**
 * IPL 2026 Fantasy Leaderboard
 * Fetching data from Google Sheets (via CSV export)
 */

// Configuration - USER: Replace with your actual Google Sheet ID
const CONFIG = {
    // Standard format: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=SHEET_NAME'
    SHEET_ID: '1T6E2K6G-Xf6oV9H66-K5Uq7zH3-3H-6G-H6vH-Xf6oV', // Placeholder
    SHEET_NAME: 'Sheet1', // Name of your sheet tab
    REFRESH_INTERVAL: 60000, // 1 minute
};

// Fallback Dummy Data (for initial demo)
const DUMMY_DATA = [
    { rank: 1, name: "Sambit Pradhan", team: "Mumbai Indians", points: 1250 },
    { rank: 2, name: "Rahul Sharma", team: "CSK", points: 1180 },
    { rank: 3, name: "Anish Kumar", team: "RCB", points: 1120 },
    { rank: 4, name: "Priya Singh", team: "KKR", points: 1050 },
    { rank: 5, name: "Vivek Das", team: "GT", points: 980 },
    { rank: 6, name: "Sita Ram", team: "LSG", points: 940 },
    { rank: 7, name: "Arjun Rao", team: "SRH", points: 890 },
    { rank: 8, name: "Kiran Patil", team: "RR", points: 850 },
    { rank: 9, name: "Deepak Ved", team: "DC", points: 820 },
    { rank: 10, name: "Mehul Jain", team: "PBKS", points: 790 },
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
    
    // Auto-refresh every minute
    setInterval(loadData, CONFIG.REFRESH_INTERVAL);
}

/**
 * Load Data from Google Sheet or Fallback
 */
async function loadData() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${CONFIG.SHEET_NAME}`;
        
        // Note: This will fail unless the Google Sheet is "Published to Web" as CSV
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const csvText = await response.text();
        allPlayerData = parseCSV(csvText);
        
        if (allPlayerData.length === 0) throw new Error('No data found');
        
        console.log('Fetched live data:', allPlayerData);
    } catch (error) {
        console.warn('Using demo data (live sheet not found or inaccessible). Error:', error.message);
        allPlayerData = DUMMY_DATA;
    }

    renderLeaderboard(allPlayerData);
    updateStats(allPlayerData);
    elements.lastUpdated.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Basic CSV Parser (Custom for these columns: Name, Team, Points)
 */
function parseCSV(csv) {
    const lines = csv.split('\n');
    const result = [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (currentLine.length < 3) continue;

        const player = {
            rank: i,
            name: currentLine[0],
            team: currentLine[1],
            points: parseInt(currentLine[2]) || 0,
        };
        result.push(player);
    }
    return result.sort((a, b) => b.points - a.points).map((p, idx) => ({ ...p, rank: idx + 1 }));
}

/**
 * Render List to DOM
 */
function renderLeaderboard(data) {
    elements.list.innerHTML = '';

    if (data.length === 0) {
        elements.list.innerHTML = '<div class="no-results">No players found matching your search.</div>';
        return;
    }

    data.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = `leaderboard-item ${p.rank <= 3 ? 'top-three' : ''}`;
        item.style.animationDelay = `${index * 0.05}s`;

        item.innerHTML = `
            <div class="rank">#${p.rank}</div>
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
            p.name.toLowerCase().includes(searchTerm) || 
            p.team.toLowerCase().includes(searchTerm)
        );
        renderLeaderboard(filtered);
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
