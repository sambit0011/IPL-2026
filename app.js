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
    matchesView: document.getElementById('matches-view'),
    detailsView: document.getElementById('details-view'),
    overviewStats: document.getElementById('overview-stats'),
    tabsNav: document.querySelector('.tabs-nav'),
    tabLeaderboard: document.getElementById('tab-leaderboard'),
    tabMatches: document.getElementById('tab-matches'),
    list: document.getElementById('leaderboard-list'),
    allMatchesList: document.getElementById('all-matches-list'),
    matchesList: document.getElementById('matches-list'),
    detailsName: document.getElementById('details-name'),
    detailsTotal: document.getElementById('details-total-points'),
    backBtn: document.getElementById('back-btn'),
    totalPlayers: document.getElementById('total-players'),
    topScore: document.getElementById('top-score'),
    lastUpdated: document.getElementById('last-update-time'),
};

let matchSchedule = [];

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
    renderAllMatches();
    updateSummary(allPlayerData);
    elements.lastUpdated.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * CSV Parser (Discovery Mode)
 */
function parseCSV(csv) {
    const lines = csv.split('\n').map(l => l.split(',').map(v => v.trim().replace(/"/g, '')));
    if (lines.length < 2) return [];
    
    // 1. Discover Metadata Rows
    let matchNamesRow = lines.find(r => r[5] && r[5].toLowerCase().includes(' vs ')) || lines[0];
    let matchNumbersRow = lines.find(r => r[5] && (r[5] === "1" || r[5] === "Match 1")) || lines[1] || [];
    
    // 2. Build Global Schedule
    matchSchedule = [];
    for (let j = 5; j < matchNamesRow.length; j++) {
        const mName = matchNamesRow[j] || "";
        if (mName !== "" && mName.length > 2) {
            matchSchedule.push({
                number: matchNumbersRow[j] || (j - 4).toString(),
                name: mName
            });
        }
    }

    const result = [];

    // Pass 1: Parse All Players (Row starts with Name)
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i];
        if (row[0] && row[0].length > 2 && !row[0].toLowerCase().includes('player name')) {
            const matches = [];
            for (let j = 5; j < row.length; j++) {
                const points = row[j] || "";
                if (points !== "" && points !== null) {
                    matches.push({
                        id: j,
                        number: matchNumbersRow[j] || (j - 4).toString(),
                        name: matchNamesRow[j] || `Match ${j - 4}`,
                        points: points,
                        rank: null
                    });
                }
            }
            result.push({
                name: row[0],
                rank: parseInt(row[1]) || (result.length + 1), // Sorting rank
                previousRank: row[2] || null,
                points: row[3] || 0,
                matches: matches
            });
        }
    }

    // Pass 2: Map Match Ranks (Row starts with Empty Col A, Name in Col E / index 4)
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i];
        if (!row[0] && row[4] && row[4].trim() !== "" && !row[4].toLowerCase().includes('player name')) {
            const pName = row[4].trim();
            const player = result.find(p => p.name === pName);
            if (player) {
                for (let j = 5; j < row.length; j++) {
                    const mRank = row[j] ? row[j].trim() : "";
                    if (mRank !== "") {
                        const m = player.matches.find(match => match.id === j);
                        if (m) m.rank = mRank;
                    }
                }
            }
        }
    }

    // Final Sort: Descending (Top Rank #1 at top)
    return result.sort((a, b) => a.rank - b.rank);
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
    
    // Hide tabs, overview stats, and main views
    elements.tabsNav.style.display = 'none';
    elements.overviewStats.style.display = 'none';
    elements.mainView.style.setProperty('display', 'none', 'important');
    elements.matchesView.style.setProperty('display', 'none', 'important');
    elements.detailsView.style.setProperty('display', 'block', 'important');
    
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
                <span class="match-num">${m.number}</span>
                <div class="match-info">
                    ${logoHtml}
                    <span class="match-name">${m.name}</span>
                </div>
                <div class="match-points-col">
                    <span class="match-points">${m.points}</span>
                    ${m.rank ? `<span class="match-rank">#${m.rank} Rank</span>` : ''}
                </div>
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
    elements.tabsNav.style.display = 'flex';
    elements.overviewStats.style.display = 'block';
    
    // Switch to whichever tab was active
    if (elements.tabLeaderboard.classList.contains('active')) {
        elements.mainView.style.setProperty('display', 'block', 'important');
    } else {
        elements.matchesView.style.setProperty('display', 'block', 'important');
    }
    window.scrollTo(0, 0);
}

/**
 * Render All Matches List
 */
function renderAllMatches() {
    elements.allMatchesList.innerHTML = '';
    
    if (matchSchedule.length === 0) {
        elements.allMatchesList.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.6; color:#fff;">Updating match schedule...</div>';
        return;
    }

    matchSchedule.forEach(m => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.style.gridTemplateColumns = '50px 1fr';
        
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

        item.innerHTML = `
            <div class="rank">#${m.number}</div>
            <div class="player-info" style="display:flex; align-items:center; gap:12px;">
                ${logoHtml}
                <span class="player-name">${m.name}</span>
            </div>
        `;
        elements.allMatchesList.appendChild(item);
    });
}

/**
 * Update Stats Cards and Footer Match Info
 */
function updateSummary(data) {
    elements.totalPlayers.textContent = data.length;
    elements.topScore.textContent = data.length > 0 ? data[0].points.toLocaleString() : '--';
    
    // Update footer with latest match info
    if (data.length > 0 && data[0].matches.length > 0) {
        const latestMatch = data[0].matches[data[0].matches.length - 1];
        const info = document.getElementById('update-match-info');
        if (info) {
            info.textContent = `Points updated after Match ${latestMatch.number} ${latestMatch.name}`;
        }
    }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    elements.backBtn.onclick = goBack;
    
    elements.tabLeaderboard.onclick = () => {
        elements.tabLeaderboard.classList.add('active');
        elements.tabMatches.classList.remove('active');
        elements.overviewStats.style.display = 'block';
        elements.mainView.style.setProperty('display', 'block', 'important');
        elements.matchesView.style.setProperty('display', 'none', 'important');
    };
    
    elements.tabMatches.onclick = () => {
        elements.tabMatches.classList.add('active');
        elements.tabLeaderboard.classList.remove('active');
        elements.overviewStats.style.display = 'none';
        elements.matchesView.style.setProperty('display', 'block', 'important');
        elements.mainView.style.setProperty('display', 'none', 'important');
    };
}

document.addEventListener('DOMContentLoaded', init);

