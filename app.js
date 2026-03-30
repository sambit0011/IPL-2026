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
 * CSV Parser (Name@0, Rank@1, Total@3, MatchNum@Row2, MatchName@Row3, Points@Row4+)
 */
function parseCSV(csv) {
    const lines = csv.split('\n');
    if (lines.length < 3) return [];
    
    // Line 0 is Row 1 (Main headers)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Line 1 is Row 2 (Match Numbers)
    const matchNumbers = lines[1].split(',').map(v => v.trim().replace(/"/g, ''));
    
    // Line 2 is Row 3 (Match Names)
    const matchNames = lines[2].split(',').map(v => v.trim().replace(/"/g, ''));
    
    const result = [];

    // Skip Row 1 (headers), Row 2 (match nums), Row 3 (match names). Data starts at Row 4.
    for (let i = 3; i < lines.length; i++) {
        const row = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        // Skip if row is empty or name is "Player Name"
        if (row.length < 4 || !row[0] || row[0].toLowerCase().includes('player name')) continue;

        // Capture match data (starting from index 5 / Column F)
        const matches = [];
        for (let j = 5; j < row.length; j++) {
            const points = row[j] ? row[j].trim() : "";
            
            // Get match number from Row 2 and name from Row 3
            const mNum = matchNumbers[j] || (j - 4);
            const mName = matchNames[j] || "Unnamed Match";
            
            if (points !== "" && points !== null) {
                matches.push({
                    number: mNum,
                    name: mName,
                    points: points
                });
            }
        }

        result.push({
            name: row[0],
            rank: row[1] || i - 2, // Fallback rank
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
    
    // Smoothly hide main view and show details
    elements.mainView.style.display = 'none';
    elements.detailsView.style.display = 'block';
    
    elements.detailsName.textContent = player.name;
    elements.detailsTotal.textContent = `${player.points.toLocaleString()} Total Points`;
    
    // Render Match List
    elements.matchesList.innerHTML = '';
    
    if (player.matches.length === 0) {
        elements.matchesList.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5;">No match points data available yet.</div>';
    }

    player.matches.forEach(m => {
        const row = document.createElement('div');
        row.className = 'match-item';
        
        // Extract teams and logos (e.g., "RCB vs SRH")
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
            <span class="match-num">${m.number}</span>
            <div class="match-info">
                ${logoHtml}
                <span class="match-name">${m.name}</span>
            </div>
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
    elements.detailsView.style.display = 'none';
    elements.mainView.style.display = 'block'; // Use block to ensure full width
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

