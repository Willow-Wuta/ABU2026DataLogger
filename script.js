let interval = null;
let milli = 0;
let logs = [];
let assemPressed = false;
let assemCount = 0;

// ── Score state ──────────────────────────────────────────────
let z3R1Score = 0;
let z3R2Score = 0;
let enterBonus = 0;

// ── Zone 2 carry counts ──────────────────────────────────────
let z2R1Blocks = 0;
let z2R2Blocks = 0;

// ── Zone 3 ttt state ─────────────────────────────────────────
const TTT_POINTS = [80, 80, 80, 40, 40, 40, 30, 30, 30];
const TTT_OWNER  = ['R2','R2','R2','R2','R2','R2','R1','R1','R1'];
const tttState   = new Array(9).fill(false);

// ── Zone 2 square picker ─────────────────────────────────────
const SQUARE_COLORS = [
    '#007a3c', '#045713', '#007a3c',
    '#045713', '#007a3c', '#8bad56',
    '#007a3c', '#8bad56', '#007a3c',
    '#045713', '#007a3c', '#045713'
];
const R1_FORBIDDEN = new Set([4, 7]);
let activePlayer = null;
const squarePicks = {};

// ─────────────────────────────────────────────────────────────
// CLOCK
// ─────────────────────────────────────────────────────────────
function formatTime(t) {
    const m  = String(Math.floor(t / 6000)).padStart(2, '0');
    const s  = String(Math.floor((t % 6000) / 100)).padStart(2, '0');
    const ms = String(t % 100).padStart(2, '0');
    return `${m}:${s}:${ms}`;
}

function start() {
    if (interval) return;
    interval = setInterval(() => {
        milli++;
        document.getElementById('MainClock').textContent = formatTime(milli);
    }, 10);
}

function stop() {
    if (interval) { clearInterval(interval); interval = null; }
    document.getElementById('MainClock').textContent = formatTime(milli);
}

function clearTimer() {
    if (interval) { clearInterval(interval); interval = null; }
    milli = 0; logs = []; assemPressed = false; assemCount = 0;
    z3R1Score = 0; z3R2Score = 0; enterBonus = 0;
    z2R1Blocks = 0; z2R2Blocks = 0;
    tttState.fill(false);

    document.getElementById('MainClock').textContent = '00:00:00';
    document.getElementById('zone1Start').disabled = true;
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    activePlayer = null;
    for (const k in squarePicks) delete squarePicks[k];
    document.getElementById('btnR1').classList.remove('active-player');
    document.getElementById('btnR2').classList.remove('active-player');
    document.getElementById('btnFinish').disabled = true;

    buildGrid();
    buildTTT();
    updateScoreboard();
    renderLog();
}

// ─────────────────────────────────────────────────────────────
// LOG
// ─────────────────────────────────────────────────────────────
function logTimestamped(type) {
    logs.push({ type, time: formatTime(milli) });
    renderLog();
}

function renderLog() {
    const output = document.getElementById('logOutput');
    const team = document.getElementById('team-search').value || '—';
    const side = document.getElementById('color').value || '—';
    const header = `Team: ${team} &nbsp;|&nbsp; Side: ${side}`;
    if (logs.length === 0) {
        output.innerHTML = `${header}<br><br>No events logged yet.`;
        return;
    }
    output.innerHTML = `${header}<br><br>` + logs.map(e => `${e.time} — ${e.type}`).join('<br>');
}

function exportJSON() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'abu_log.json'; a.click();
}

function logEvent(type, checkbox) {
    if (checkbox.checked) {
        logs.push({ type, time: formatTime(milli) });
    } else {
        const index = logs.findLastIndex(e => e.type === type);
        if (index !== -1) logs.splice(index, 1);
    }
    renderLog();
}

// ─────────────────────────────────────────────────────────────
// ZONE 1
// ─────────────────────────────────────────────────────────────
function SpearAssem() {
    assemCount++;
    logTimestamped(`Assem(+10pt)`);
    if (!assemPressed) {
        assemPressed = true;
        document.getElementById('zone1Start').disabled = false;
    }
    updateScoreboard();
}

function zone1Return() { logTimestamped('Zone1_Return'); }

// ─────────────────────────────────────────────────────────────
// ZONE 2 — Enter
// ─────────────────────────────────────────────────────────────
function zone2BothStart() { logTimestamped('Z2_Enter_Both'); }
function zone2R1Start()   { logTimestamped('Z2_Enter_R1'); }
function zone2R2Start()   { logTimestamped('Z2_Enter_R2'); }

// ─────────────────────────────────────────────────────────────
// ZONE 2 — Square Picker
// ─────────────────────────────────────────────────────────────
function buildGrid() {
    const grid = document.getElementById('squareGrid');
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const sq = document.createElement('div');
        sq.className = 'sq';
        if (R1_FORBIDDEN.has(i)) sq.classList.add('sq-inner');
        sq.style.backgroundColor = SQUARE_COLORS[i];
        sq.dataset.index = i;
        sq.addEventListener('click', () => onSquareClick(i, sq));
        grid.appendChild(sq);
    }
}

function onSquareClick(index, el) {
    if (!activePlayer) return;

    if (squarePicks[index] === activePlayer) {
        delete squarePicks[index];
        el.classList.remove('picked-r1', 'picked-r2');
        if (activePlayer === 'R1') z2R1Blocks--;
        else z2R2Blocks--;
        logTimestamped(`${activePlayer}_Unpick_Z2Sq${index + 1} | R1:${z2R1Blocks}blk R2:${z2R2Blocks}blk`);
        updateScoreboard();
        return;
    }

    if (squarePicks[index] && squarePicks[index] !== activePlayer) return;

    if (activePlayer === 'R1' && R1_FORBIDDEN.has(index)) {
        logTimestamped(`R1_Blocked_Z2Sq${index + 1}(inner)`);
        return;
    }

    squarePicks[index] = activePlayer;
    el.classList.add(activePlayer === 'R1' ? 'picked-r1' : 'picked-r2');
    if (activePlayer === 'R1') z2R1Blocks++;
    else z2R2Blocks++;
    logTimestamped(`${activePlayer}_Pick_Z2Sq${index + 1} | R1:${z2R1Blocks}blk R2:${z2R2Blocks}blk`);
    updateScoreboard();
}

function activatePlayer(player) {
    activePlayer = player;
    document.getElementById('btnR1').classList.toggle('active-player', player === 'R1');
    document.getElementById('btnR2').classList.toggle('active-player', player === 'R2');
    document.getElementById('btnFinish').disabled = false;
    logTimestamped(`${player}_SelectMode`);
}

function finishPicking() {
    if (!activePlayer) return;
    logTimestamped(`${activePlayer}_FinishPicking`);
    activePlayer = null;
    document.getElementById('btnR1').classList.remove('active-player');
    document.getElementById('btnR2').classList.remove('active-player');
    document.getElementById('btnFinish').disabled = true;
}

// ─────────────────────────────────────────────────────────────
// ZONE 3 — Enter
// ─────────────────────────────────────────────────────────────
function zone3BothStart() {
    const bonus = (z2R1Blocks + z2R2Blocks) * 10;
    enterBonus += bonus;
    logTimestamped(`Z3_Enter_Both(+${bonus}pt) | R1:${z2R1Blocks}blk R2:${z2R2Blocks}blk`);
    updateScoreboard();
}

function zone3R1Start() {
    const bonus = z2R1Blocks * 10;
    enterBonus += bonus;
    logTimestamped(`Z3_Enter_R1(+${bonus}pt) | R1 carried ${z2R1Blocks}blk`);
    updateScoreboard();
}

function zone3R2Start() {
    const bonus = z2R2Blocks * 10;
    enterBonus += bonus;
    logTimestamped(`Z3_Enter_R2(+${bonus}pt) | R2 carried ${z2R2Blocks}blk`);
    updateScoreboard();
}

// ─────────────────────────────────────────────────────────────
// ZONE 3 — Tic-tac-toe grid
// ─────────────────────────────────────────────────────────────
function buildTTT() {
    const grid = document.getElementById('tttGrid');
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'ttt-cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => onTTTClick(i, cell));
        grid.appendChild(cell);
    }
}

function onTTTClick(index, el) {
    const owner = TTT_OWNER[index];
    const pts   = TTT_POINTS[index];

    const r1Used = tttState.reduce((n,v,i) => n + (v && TTT_OWNER[i]==='R1' ? 1 : 0), 0);
    const r2Used = tttState.reduce((n,v,i) => n + (v && TTT_OWNER[i]==='R2' ? 1 : 0), 0);

    if (!tttState[index]) {
        if (owner === 'R1' && r1Used >= z2R1Blocks) {
            logTimestamped(`R1_Z3Blocked(carry=${z2R1Blocks}, used=${r1Used})`);
            return;
        }
        if (owner === 'R2' && r2Used >= z2R2Blocks) {
            logTimestamped(`R2_Z3Blocked(carry=${z2R2Blocks}, used=${r2Used})`);
            return;
        }
        tttState[index] = true;
        el.classList.add(owner === 'R1' ? 'ttt-r1' : 'ttt-r2');
        if (owner === 'R1') z3R1Score += pts;
        else z3R2Score += pts;
        logTimestamped(`${owner}_Z3Score_Cell${index+1}(+${pts}pt)`);
    } else {
        tttState[index] = false;
        el.classList.remove('ttt-r1', 'ttt-r2');
        if (owner === 'R1') z3R1Score -= pts;
        else z3R2Score -= pts;
        logTimestamped(`${owner}_Z3Unscore_Cell${index+1}(-${pts}pt)`);
    }

    updateScoreboard();
}

// ─────────────────────────────────────────────────────────────
// SCOREBOARD
// ─────────────────────────────────────────────────────────────
function updateScoreboard() {
    document.getElementById('sbZ2R1').textContent = `R1: ${z2R1Blocks} blk`;
    document.getElementById('sbZ2R2').textContent = `R2: ${z2R2Blocks} blk`;
    document.getElementById('sbZ3R1').textContent = `R1: ${z3R1Score} pts`;
    document.getElementById('sbZ3R2').textContent = `R2: ${z3R2Score} pts`;
    document.getElementById('sbEnterBonus').textContent  = `${enterBonus} pts`;
    document.getElementById('sbAssemBonus').textContent  = `${assemCount * 10} pts`;
    const total = z3R1Score + z3R2Score + enterBonus + (assemCount * 10);
    document.getElementById('sbTotal').textContent = `${total} pts`;
}

// ─────────────────────────────────────────────────────────────
// MISC
// ─────────────────────────────────────────────────────────────
function flashButton(btn) {
    btn.classList.add('blink');
    btn.addEventListener('animationend', () => btn.classList.remove('blink'), { once: true });
}

document.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') flashButton(e.target);
});

document.getElementById('team-search').addEventListener('input', renderLog);
document.getElementById('color').addEventListener('change', renderLog);

buildGrid();
buildTTT();
updateScoreboard();
renderLog();
