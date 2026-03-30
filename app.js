// Configuration
const CONFIG = {
    // Direct Public CSV URL from Google Sheets
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLE1kQX5IZnCcEI4FogJjv2zlKYZPHhGaDvav4UY73Y9sMUUqAmtpAeMB9RFemawdlnWR6KmrRyYTu/pub?gid=0&single=true&output=csv',
    REFRESH_INTERVAL: 60000, 
};

// Fallback Dummy Data (only if fetch fails)
const TEAM_LOGOS = {
  "CSK": "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png",
  "DC": "https://documents.iplt20.com/ipl/DC/Logos/LogoOutline/DCoutline.png",
  "GT": "https://documents.iplt20.com/ipl/GT/Logos/Logooutline/GToutline.png",
  "KKR": "https://documents.iplt20.com/ipl/KKR/Logos/Logooutline/KKRoutline.png",
  "LSG": "https://documents.iplt20.com/ipl/LSG/Logos/Logooutline/LSGoutline.png",
  "MI": "https://documents.iplt20.com/ipl/MI/Logos/Logooutline/MIoutline.png",
  "PBKS": "https://documents.iplt20.com/ipl/PBKS/Logos/Logooutline/PBKSoutline.png",
  "RR": "https://documents.iplt20.com/ipl/RR/Logos/Logooutline/RRoutline.png",
  "RCB": "https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png",
  "SRH": "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png"
};

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
 * CSV Parser (Dynamic Layout Discovery)
 */
function parseCSV(csv) {
    const lines = csv.split('\n').map(l => l.split(',').map(v => v.trim().replace(/"/g, '')));
    if (lines.length < 1) return [];
    
    let matchNames = lines[0]; // Fallback to first row
    let matchNumbers = [];
    let dataStartRow = 1;

    // Discovery: Find Match Names and Numbers in first 5 rows
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const row = lines[i];
        // If row has " vs " in Col F (index 5)
        if (row[5] && row[5].toLowerCase().includes(' vs ')) {
            matchNames = row;
        }
        // If row has "1" in Col F (index 5)
        if (row[5] === "1") {
            matchNumbers = row;
        }
        // If row starts with a player name and it's not a header
        if (row[0] && !row[0].toLowerCase().includes('player name') && 
            !row[0].toLowerCase().includes('team name') && 
            !row[0].toLowerCase().includes('match')) {
            dataStartRow = Math.min(dataStartRow, i);
        }
    }

    const result = [];
    for (let i = dataStartRow; i < lines.length; i++) {
        const row = lines[i];
        if (row.length < 4 || !row[0] || row[0].toLowerCase().includes('player name')) continue;

        const matches = [];
        for (let j = 5; j < row.length; j++) {
            const points = row[j] || "";
            if (points !== "") {
                matches.push({
                    number: matchNumbers[j] || (j - 4),
                    name: matchNames[j] || `Match ${j - 4}`,
                    points: points
                });
            }
        }

        result.push({
            name: row[0],
            rank: row[1] || result.length + 1,
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
    if (!player) return;
    
    // Direct display switch for absolute reliability
    elements.mainView.style.setProperty('display', 'none', 'important');
    elements.detailsView.style.setProperty('display', 'block', 'important');
    elements.detailsView.classList.remove('hidden');
    
    elements.detailsName.textContent = player.name;
    elements.detailsTotal.textContent = `${player.points.toLocaleString()} Total Points`;
    
    elements.matchesList.innerHTML = '';
    
    if (!player.matches || player.matches.length === 0) {
        elements.matchesList.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.6; color:#fff;">No match points tracked for this player yet.</div>';
    } else {
        player.matches.forEach(m => {
            const row = document.createElement('div');
            row.className = 'match-item';
            
            const teamParts = m.name.split(' vs ').map(t => t.trim().toUpperCase());
            let logoHtml = '';
            if (teamParts.length === 2) {
                const logo1 = TEAM_LOGOS[teamParts[0]] || '';
                const logo2 = TEAM_LOGOS[teamParts[1]] || '';
                logoHtml = `
                    <div class="match-logos">
                        ${logo1 ? `<img src="${logo1}" class="mini-logo">` : ''}
                        <span class="vs-text">vs</span>
                        ${logo2 ? `<img src="${logo2}" class="mini-logo">` : ''}
                    </div>
                `;
            }

            row.innerHTML = `
                <div class="match-info">
                    ${logoHtml}
                    <span class="match-name">${m.name}</span>
                </div>
                <span class="match-points">${m.points}</span>
            `;
            elements.matchesList.appendChild(row);
        });
    }
    
    window.scrollTo(0, 0);
}

/**
 * Navigation: Back to Leaderboard
 */
function goBack() {
    elements.detailsView.style.setProperty('display', 'none', 'important');
    elements.mainView.style.setProperty('display', 'block', 'important');
    window.scrollTo(0, 0);
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

