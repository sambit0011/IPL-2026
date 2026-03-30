/**
 * IPL 2026 Fantasy Leaderboard
 * Author: Antigravity AI
 */

const TEAM_LOGOS = {
    'RCB': 'https://www.iplt20.com/assets/images/teams-logo/secondary/RCB.png',
    'MI': 'https://static.iplt20.com/players/210/107.png',
    'SRH': 'https://static.iplt20.com/players/210/112.png',
    'CSK': 'https://static.iplt20.com/players/210/1.png',
    'KKR': 'https://static.iplt20.com/players/210/102.png',
    'RR': 'https://static.iplt20.com/players/210/110.png',
    'PBKS': 'https://static.iplt20.com/players/210/108.png',
    'GT': 'https://static.iplt20.com/players/210/118.png',
    'LSG': 'https://static.iplt20.com/players/210/117.png',
    'DC': 'https://static.iplt20.com/players/210/111.png'
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
    
    // 1. Discover Metadata Rows
    let matchNamesRow = lines.find(r => r[5] && r[5].toLowerCase().includes(' vs ')) || lines[0];
    let matchNumbersRow = lines.find(r => r[5] && (r[5] === "1" || r[5] === "Match 1")) || lines[1] || [];
    
    const result = [];
    matchSchedule = [];
    const completedMatchIds = new Set();

    // Pass 1: Parse Players & Detect Completed Matches
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

    // Pass 2: Map Match Ranks Table (Name in Col E / index 4)
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

    // 3. Build Global Schedule
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
    
    data.forEach((p, index) => {
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
 * Navigation: Show Details
 */
function showPlayerDetails(player) {
    if (!player) return;
    
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
 * Navigation: Back
 */
function goBack() {
    elements.detailsView.style.setProperty('display', 'none', 'important');
    elements.matchView.style.setProperty('display', 'none', 'important');
    elements.tabsNav.style.display = 'flex';
    
    if (elements.tabLeaderboard.classList.contains('active')) {
        elements.mainView.style.setProperty('display', 'block', 'important');
        elements.overviewStats.style.display = 'block';
    } else {
        elements.matchesView.style.setProperty('display', 'block', 'important');
        elements.overviewStats.style.display = 'none';
    }
    window.scrollTo(0, 0);
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
            <div class="rank">#${m.number.replace('Match ', '')}</div>
            <div class="player-info">
                ${logoHtml}
                <span class="player-name">${m.name}</span>
            </div>
            <div class="points" style="font-size:0.75rem; color:${m.isCompleted ? 'var(--gold)' : 'var(--text-secondary)'}; font-weight:700;">
                ${m.isCompleted ? 'RESULTS' : 'SOON'}
            </div>
        `;
        
        if (m.isCompleted) {
            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                e.stopPropagation();
                showMatchDetails(m);
            };
        }
        elements.allMatchesList.appendChild(item);
    });
}

/**
 * Render Match Logic
 */
function showMatchDetails(match) {
    elements.tabsNav.style.display = 'none';
    elements.overviewStats.style.display = 'none';
    elements.mainView.style.setProperty('display', 'none', 'important');
    elements.matchesView.style.setProperty('display', 'none', 'important');
    elements.matchView.style.setProperty('display', 'block', 'important');
    
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
        row.innerHTML = `
            <span class="rank" style="color:var(--text-secondary);">#${idx + 1}</span>
            <span class="player-name">${r.name}</span>
            <span class="match-points">${r.points}</span>
        `;
        elements.matchLeaderboardList.appendChild(row);
    });
    window.scrollTo(0, 0);
}

/**
 * Summary Stats
 */
function updateSummary(data) {
    elements.totalPlayers.textContent = data.length;
    elements.topScore.textContent = data.length > 0 ? Math.max(...data.map(p => p.points)).toLocaleString() : '--';
    
    if (data.length > 0 && data[0].matches.length > 0) {
        const latestMatch = data[0].matches[data[0].matches.length - 1];
        document.getElementById('update-match-info').textContent = `Points updated after Match ${latestMatch.number} ${latestMatch.name}`;
    }
}

/**
 * Events
 */
function setupEventListeners() {
    elements.backBtn.onclick = goBack;
    elements.matchBackBtn.onclick = goBack;
    
    elements.tabLeaderboard.onclick = () => {
        elements.tabLeaderboard.classList.add('active');
        elements.tabMatches.classList.remove('active');
        elements.mainView.style.setProperty('display', 'block', 'important');
        elements.matchesView.style.setProperty('display', 'none', 'important');
        elements.overviewStats.style.display = 'block';
    };
    
    elements.tabMatches.onclick = () => {
        elements.tabMatches.classList.add('active');
        elements.tabLeaderboard.classList.remove('active');
        elements.matchesView.style.setProperty('display', 'block', 'important');
        elements.mainView.style.setProperty('display', 'none', 'important');
        elements.overviewStats.style.display = 'none';
    };
}

document.addEventListener('DOMContentLoaded', init);
