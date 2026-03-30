/**
 * IPL 2026 Fantasy Leaderboard
 * Final Fixed Version
 */

const TEAM_LOGOS = {
    'RCB': 'https://www.iplt20.com/assets/images/teams-logo/secondary/RCB.png',
    'MI': 'https://www.iplt20.com/assets/images/teams-logo/secondary/MI.png',
    'SRH': 'https://www.iplt20.com/assets/images/teams-logo/secondary/SRH.png',
    'CSK': 'https://www.iplt20.com/assets/images/teams-logo/secondary/CSK.png',
    'KKR': 'https://www.iplt20.com/assets/images/teams-logo/secondary/KKR.png',
    'RR': 'https://www.iplt20.com/assets/images/teams-logo/secondary/RR.png',
    'PBKS': 'https://www.iplt20.com/assets/images/teams-logo/secondary/PBKS.png',
    'GT': 'https://www.iplt20.com/assets/images/teams-logo/secondary/GT.png',
    'LSG': 'https://www.iplt20.com/assets/images/teams-logo/secondary/LSG.png',
    'DC': 'https://www.iplt20.com/assets/images/teams-logo/secondary/DC.png',
    'PBK': 'https://www.iplt20.com/assets/images/teams-logo/secondary/PBKS.png' // Alias
};

let allPlayerData = [];
let matchSchedule = [];

const elements = {
    mainView: document.getElementById('main-view'),
    matchesView: document.getElementById('matches-view'),
    detailsView: document.getElementById('details-view'),
    matchView: document.getElementById('match-details-view'),
    overviewStats: document.getElementById('overview-stats'),
    tabsNav: document.querySelector('.tabs-nav'),
    tabLeaderboard: document.getElementById('tab-leaderboard'),
    tabMatches: document.getElementById('tab-matches'),
    list: document.getElementById('leaderboard-list'),
    allMatchesList: document.getElementById('all-matches-list'),
    matchLeaderboardList: document.getElementById('match-leaderboard-list'),
    matchesList: document.getElementById('matches-list'),
    detailsName: document.getElementById('details-name'),
    detailsTotal: document.getElementById('details-total-points'),
    matchName: document.getElementById('match-details-name'),
    backBtn: document.getElementById('back-btn'),
    matchBackBtn: document.getElementById('match-back-btn'),
    totalPlayers: document.getElementById('total-players'),
    topScore: document.getElementById('top-score'),
    lastUpdated: document.getElementById('last-update-time'),
};

/**
 * Initialize the App
 */
async function init() {
    setupEventListeners();
    await loadData();
}

/**
 * Fetch and Parse Data
 */
async function loadData() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLE1kQX5IZnCcEI4FogJjv2zlKYZPHhGaDvav4UY73Y9sMUUqAmtpAeMB9RFemawdlnWR6KmrRyYTu/pub?output=csv';
    
    try {
        const response = await fetch(`${csvUrl}&t=${Date.now()}`);
        const csvText = await response.text();
        allPlayerData = parseCSV(csvText);
        
        console.log("Parsed Player Data:", allPlayerData);
        
        renderLeaderboard(allPlayerData);
        renderAllMatches();
        updateSummary(allPlayerData);
        elements.lastUpdated.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

/**
 * CSV Parser (Discovery Mode)
 */
function parseCSV(csv) {
    const lines = csv.split('\n').map(l => l.split(',').map(v => v.trim().replace(/"/g, '')));
    if (lines.length < 2) return [];
    
    // Discover Meta
    let matchNamesRow = lines.find(r => r[5] && r[5].toLowerCase().includes(' vs ')) || lines[0];
    let matchNumbersRow = lines.find(r => r[5] && (r[5] === "1" || r[5] === "Match 1")) || lines[1] || [];
    
    const result = [];
    matchSchedule = [];
    const completedMatchIds = new Set();

    // Pass 1: Parse Players
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i];
        if (row[0] && row[0].length > 2 && !row[0].toLowerCase().includes('player name')) {
            const matches = [];
            for (let j = 5; j < row.length; j++) {
                const points = row[j] ? row[j].trim() : "";
                if (points !== "" && points !== null && points !== "-") {
                    matches.push({
                        id: j,
                        number: matchNumbersRow[j] || (j - 4).toString(),
                        name: matchNamesRow[j] || `Match ${j - 4}`,
                        points: points,
                        rank: null
                    });
                    completedMatchIds.add(j);
                }
            }
            result.push({
                name: row[0],
                rank: Number(row[1]) || (result.length + 1),
                previousRank: row[2] || null,
                points: Number(row[3]) || 0,
                matches: matches
            });
        }
    }

    // Pass 2: Ranks Table Mapping
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i];
        if (!row[0] && row[4] && row[4].trim() !== "" && !row[4].toLowerCase().includes('player name')) {
            const pName = row[4].trim();
            const player = result.find(p => p.name === pName);
            if (player) {
                for (let j = 5; j < row.length; j++) {
                    const mRank = row[j] ? row[j].trim() : "";
                    if (mRank !== "" && player.matches) {
                        const m = player.matches.find(match => match.id === j);
                        if (m) m.rank = mRank;
                    }
                }
            }
        }
    }

    // Build Schedule
    for (let j = 5; j < matchNamesRow.length; j++) {
        const mName = matchNamesRow[j] || "";
        if (mName !== "" && mName.length > 2) {
            matchSchedule.push({
                id: j,
                number: matchNumbersRow[j] || (j - 4).toString(),
                name: mName,
                isCompleted: completedMatchIds.has(j)
            });
        }
    }

    return result.sort((a, b) => a.rank - b.rank);
}

/**
 * Render Leaderboard
 */
function renderLeaderboard(data) {
    elements.list.innerHTML = '';
    data.forEach((p) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.onclick = () => showPlayerDetails(p);

        item.innerHTML = `
            <div class="rank">#${p.rank}</div>
            <div class="player-info">
                <span class="player-name">${p.name}</span>
            </div>
            <div class="points">${p.points.toLocaleString()}</div>
        `;
        elements.list.appendChild(item);
    });
}

/**
 * View Switching Logic
 */
function switchView(viewId) {
    // Hide everything
    elements.mainView.classList.add('hidden');
    elements.matchesView.classList.add('hidden');
    elements.detailsView.classList.add('hidden');
    elements.matchView.classList.add('hidden');
    
    // Show requested
    if (viewId === 'leaderboard') {
        elements.mainView.classList.remove('hidden');
        elements.overviewStats.classList.remove('hidden');
        elements.tabsNav.classList.remove('hidden');
        elements.tabLeaderboard.classList.add('active');
        elements.tabMatches.classList.remove('active');
    } else if (viewId === 'matches') {
        elements.matchesView.classList.remove('hidden');
        elements.overviewStats.classList.add('hidden');
        elements.tabsNav.classList.remove('hidden');
        elements.tabMatches.classList.add('active');
        elements.tabLeaderboard.classList.remove('active');
    } else if (viewId === 'details') {
        elements.detailsView.classList.remove('hidden');
        elements.overviewStats.classList.add('hidden');
        elements.tabsNav.classList.add('hidden');
    } else if (viewId === 'match-results') {
        elements.matchView.classList.remove('hidden');
        elements.overviewStats.classList.add('hidden');
        elements.tabsNav.classList.add('hidden');
    }
    
    window.scrollTo(0, 0);
}

/**
 * Navigation Actions
 */
function showPlayerDetails(player) {
    if (!player) return;
    switchView('details');
    elements.detailsName.textContent = player.name;
    elements.detailsTotal.textContent = `${player.points.toLocaleString()} Total Points`;
    
    elements.matchesList.innerHTML = '';
    if (!player.matches || player.matches.length === 0) {
        elements.matchesList.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.6; color:#fff;">No match points yet.</div>';
    } else {
        player.matches.forEach(m => {
            const row = document.createElement('div');
            row.className = 'match-item';
            
            const teamParts = m.name.split(/\s+[vV][sS]\s+/).map(t => t.trim().toUpperCase());
            let logos = '';
            if (teamParts.length === 2) {
                const logo1 = TEAM_LOGOS[teamParts[0]] || '';
                const logo2 = TEAM_LOGOS[teamParts[1]] || '';
                logos = `<div class="match-logos">${logo1 ? `<img src="${logo1}" class="mini-logo">` : ''}<span class="vs-text">vs</span>${logo2 ? `<img src="${logo2}" class="mini-logo">` : ''}</div>`;
            }

            row.innerHTML = `<span class="match-num">${m.number}</span><div class="match-info">${logos}<span class="match-name">${m.name}</span></div><div class="match-points-col"><span class="match-points">${m.points}</span>${m.rank ? `<span class="match-rank">#${m.rank} Rank</span>` : ''}</div>`;
            elements.matchesList.appendChild(row);
        });
    }
}

function showMatchResults(match) {
    switchView('match-results');
    elements.matchName.textContent = `Match ${match.number}: ${match.name}`;
    elements.matchLeaderboardList.innerHTML = '';
    
    const rankings = allPlayerData
        .map(p => {
            const mData = p.matches.find(m => m.id === match.id);
            return { name: p.name, points: mData ? parseFloat(mData.points) || 0 : 0 };
        })
        .sort((a, b) => b.points - a.points);
        
    rankings.forEach((r, idx) => {
        const row = document.createElement('div');
        row.className = 'match-item';
        row.style.gridTemplateColumns = '50px 1fr 100px';
        row.innerHTML = `<span class="rank">#${idx + 1}</span><span class="player-name" style="font-weight:600;">${r.name}</span><span class="match-points">${r.points}</span>`;
        elements.matchLeaderboardList.appendChild(row);
    });
}

function goBack() {
    if (elements.tabLeaderboard.classList.contains('active')) switchView('leaderboard');
    else switchView('matches');
}

/**
 * Render All Matches Tab
 */
function renderAllMatches() {
    elements.allMatchesList.innerHTML = '';
    matchSchedule.forEach(m => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.style.gridTemplateColumns = '50px 1fr auto';
        
        const teamParts = m.name.split(/\s+vs\s+/i).map(t => t.trim().toUpperCase());
        let logos = '';
        if (teamParts.length === 2) {
            const l1 = TEAM_LOGOS[teamParts[0]] || '';
            const l2 = TEAM_LOGOS[teamParts[1]] || '';
            logos = `<div class="match-logos">${l1 ? `<img src="${l1}" class="mini-logo">` : ''}<span class="vs-text">vs</span>${l2 ? `<img src="${l2}" class="mini-logo">` : ''}</div>`;
        }

        item.innerHTML = `<div class="rank">#${m.number.replace('Match ', '')}</div><div class="player-info">${logos}<span class="player-name">${m.name}</span></div><div class="points" style="font-size:0.7rem; font-weight:700; color:${m.isCompleted ? 'var(--gold)' : 'var(--text-secondary)'}">${m.isCompleted ? 'RESULTS' : 'SOON'}</div>`;
        
        if (m.isCompleted) {
            item.style.cursor = 'pointer';
            item.onclick = (e) => { e.stopPropagation(); showMatchResults(m); };
        }
        elements.allMatchesList.appendChild(item);
    });
}

/**
 * Update Stats
 */
function updateSummary(data) {
    elements.totalPlayers.textContent = data.length;
    const top = data.length > 0 ? Math.max(...data.map(p => Number(p.points))) : 0;
    elements.topScore.textContent = top.toLocaleString();
    
    if (data.length > 0 && data[0].matches.length > 0) {
        const lastM = data[0].matches[data[0].matches.length - 1];
        document.getElementById('update-match-info').textContent = `Summary as of Match ${lastM.number}: ${lastM.name}`;
    }
}

/**
 * Events
 */
function setupEventListeners() {
    elements.backBtn.onclick = goBack;
    elements.matchBackBtn.onclick = goBack;
    elements.tabLeaderboard.onclick = () => switchView('leaderboard');
    elements.tabMatches.onclick = () => switchView('matches');
}

document.addEventListener('DOMContentLoaded', init);
