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
let metadataMatches = []; // Store match number + name globally

const elements = {
    mainView: document.getElementById('main-view'),
    detailsView: document.getElementById('details-view'),
    allMatchesView: document.getElementById('all-matches-view'),
    matchIndividualView: document.getElementById('match-individual-view'),
    list: document.getElementById('leaderboard-list'),
    matchesList: document.getElementById('matches-list'),
    matchPlayerList: document.getElementById('match-player-list'),
    allMatchesList: document.getElementById('all-matches-list'),
    tabLeaderboard: document.getElementById('tab-leaderboard'),
    tabMatches: document.getElementById('tab-matches'),
    detailsName: document.getElementById('details-name'),
    detailsTotal: document.getElementById('details-total-points'),
    matchDetailsTitle: document.getElementById('match-details-title'),
    matchDetailsSubtitle: document.getElementById('match-details-subtitle'),
    backBtn: document.getElementById('back-btn'),
    backToMatchesBtn: document.getElementById('back-to-matches-btn'),
    statsSection: document.getElementById('stats-section'),
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
    updateSummary(allPlayerData);
    elements.lastUpdated.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * CSV Parser (Dynamic Layout Discovery)
 */
function parseCSV(csv) {
    const lines = csv.split('\n').map(l => l.split(',').map(v => v.trim().replace(/"/g, '')));
    if (lines.length < 1) return [];
    
    // Pass 1: Parse headers and match data metadata
    const headers = lines[0];
    const matchNumbers = lines[1] || [];
    const matchNames = lines[2] || [];
    
    // Reset and populate metadata
    metadataMatches = [];
    for (let j = 5; j < headers.length; j++) {
        if (headers[j] || matchNames[j]) {
            metadataMatches.push({
                index: j,
                number: matchNumbers[j] || (j - 4),
                name: matchNames[j] || headers[j]
            });
        }
    }
    
    const result = [];

    // Pass 2: Main data and Ranks
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        
        // Case A: Main Player Row (Name in Column A)
        if (row[0] && !row[0].toLowerCase().includes('player name') && 
            !row[0].toLowerCase().includes('team name') && 
            !row[0].toLowerCase().includes('match')) {
            
            const matches = [];
            for (let j = 5; j < row.length; j++) {
                const points = row[j] || "";
                if (points !== "") {
                    matches.push({
                        id: j, // Unique index for mapping
                        number: matchNumbers[j] || (j - 4),
                        name: matchNames[j] || (headers[j] && (headers[j].includes(' vs ') || headers[j].length > 5) ? headers[j] : `Match ${j - 4}`),
                        points: points,
                        rank: null // Link later
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
        
        // Case B: Rank Table Row (Empty Col A, Name in Column E / index 4)
        else if (!row[0] && row[4] && row[4].trim() !== "") {
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

    // Sort by rank ascending (1 to last)
    return result.sort((a, b) => {
        const rA = parseInt(a.rank) || 999;
        const rB = parseInt(b.rank) || 999;
        return rA - rB;
    });
}

/**
 * Render Leaderboard
 */
function renderLeaderboard(data) {
    elements.list.innerHTML = '';
    
    data.forEach((p, index) => {
        const item = document.createElement('div');
        
        const r = parseInt(p.rank);
        let medalClass = '';
        if (r === 1) medalClass = 'rank-1';
        else if (r === 2) medalClass = 'rank-2';
        else if (r === 3) medalClass = 'rank-3';
        else if (r === 4) medalClass = 'rank-4';
        
        item.className = `leaderboard-item ${medalClass}`;
        
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
    elements.statsSection.style.setProperty('display', 'none', 'important');
    elements.detailsView.style.setProperty('display', 'block', 'important');
    elements.detailsView.classList.remove('hidden');
    
    elements.detailsName.textContent = player.name;
    
    // Calculate movement for header
    let movementText = '';
    if (player.previousRank && player.rank !== player.previousRank) {
        const cur = parseInt(player.rank);
        const prev = parseInt(player.previousRank);
        if (cur < prev) movementText = ` <span style="color:#4ade80;">▲ Up</span>`;
        else if (cur > prev) movementText = ` <span style="color:#f87171;">▼ Down</span>`;
    }
    
    elements.detailsTotal.innerHTML = `
        <span>${player.points.toLocaleString()} Total Points</span>
        <span style="margin: 0 10px; opacity: 0.3;">|</span>
        <span>Rank #${player.rank}${movementText}</span>
    `;
    
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
    elements.statsSection.style.setProperty('display', 'grid', 'important'); // Use grid to match CSS
    elements.mainView.style.setProperty('display', 'block', 'important');
    window.scrollTo(0, 0);
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
            info.textContent = `Points updated after ${latestMatch.number} ${latestMatch.name}`;
        }
    }
}

/**
 * Render All Matches Tab
 */
function renderAllMatches() {
    elements.allMatchesList.innerHTML = '';
    
    metadataMatches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'match-card';
        
        // Check if any player has data for this match to make it clickable
        const hasData = allPlayerData.some(p => {
            const match = p.matches.find(pm => pm.id === m.index);
            return match && match.points !== "";
        });

        if (hasData) {
            item.classList.add('has-results');
            item.onclick = () => showMatchIndividualDetails(m);
        }
        
        const teamParts = m.name.split(' vs ').map(t => t.trim().toUpperCase());
        let logoHtml = '';
        if (teamParts.length === 2) {
            const logo1 = TEAM_LOGOS[teamParts[0]] || '';
            const logo2 = TEAM_LOGOS[teamParts[1]] || '';
            logoHtml = `
                <div class="match-card-logos">
                    <img src="${logo1}" class="card-logo">
                    <span class="vs-text">VS</span>
                    <img src="${logo2}" class="card-logo">
                </div>
            `;
        }

        item.innerHTML = `
            <div class="card-header">${m.number} ${hasData ? '✓' : ''}</div>
            ${logoHtml}
            <div class="match-name-small">${m.name}</div>
        `;
        elements.allMatchesList.appendChild(item);
    });
}

/**
 * Show Match Individual Performance
 */
function showMatchIndividualDetails(m) {
    elements.allMatchesView.classList.add('hidden');
    elements.matchIndividualView.classList.remove('hidden');
    elements.matchIndividualView.style.display = 'block';

    elements.matchDetailsTitle.textContent = m.number;
    elements.matchDetailsSubtitle.textContent = m.name;

    // Collect Data
    const scores = allPlayerData.map(p => {
        const matchInfo = p.matches.find(pm => pm.id === m.index);
        return {
            name: p.name,
            points: parseFloat(matchInfo ? matchInfo.points : 0) || 0
        };
    });

    // Sort by points
    scores.sort((a, b) => b.points - a.points);

    // Render ranks
    elements.matchPlayerList.innerHTML = '';
    let currentRank = 1;
    scores.forEach((s, i) => {
        if (i > 0 && s.points < scores[i-1].points) currentRank = i + 1;
        
        const row = document.createElement('div');
        row.className = 'match-item';
        row.innerHTML = `
            <span class="match-num">#${currentRank}</span>
            <div class="match-info">
                <span class="match-name">${s.name}</span>
            </div>
            <span class="match-points">${s.points.toLocaleString()}</span>
        `;
        elements.matchPlayerList.appendChild(row);
    });

    window.scrollTo(0, 0);
}

/**
 * Navigation: Back to Matches
 */
function goBackToMatches() {
    elements.matchIndividualView.classList.add('hidden');
    elements.matchIndividualView.style.display = 'none';
    elements.allMatchesView.classList.remove('hidden');
}

/**
 * Tab Switching Logic
 */
function switchTab(tab) {
    if (tab === 'leaderboard') {
        elements.tabLeaderboard.classList.add('active');
        elements.tabMatches.classList.remove('active');
        elements.mainView.style.setProperty('display', 'block', 'important');
        elements.statsSection.style.setProperty('display', 'grid', 'important');
        elements.allMatchesView.classList.add('hidden');
    } else {
        elements.tabMatches.classList.add('active');
        elements.tabLeaderboard.classList.remove('active');
        elements.mainView.style.setProperty('display', 'none', 'important');
        elements.statsSection.style.setProperty('display', 'none', 'important');
        elements.allMatchesView.classList.remove('hidden');
        renderAllMatches();
    }
    // Always hide details when switching main tabs
    elements.detailsView.style.setProperty('display', 'none', 'important');
    elements.matchIndividualView.style.setProperty('display', 'none', 'important');
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    elements.backBtn.onclick = goBack;
    elements.backToMatchesBtn.onclick = goBackToMatches;
    elements.tabLeaderboard.onclick = () => switchTab('leaderboard');
    elements.tabMatches.onclick = () => switchTab('matches');
}

document.addEventListener('DOMContentLoaded', init);

