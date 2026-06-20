let interval = null;
let milli = 0;
let logs = [];
let assemPressed = false;
let assemCount = 0;

let z3R1Score = 0;
let z3R2Score = 0;
let enterBonus = 0;
let z2R1Blocks = 0;
let z2R2Blocks = 0;
let z2R1PaidOut = 0;   // blocks already rewarded for R1
let z2R2PaidOut = 0;   // blocks already rewarded for R2

// Ground-pickup state: null = not picking, else epoch-ms when button pressed
let groundPickR1Start = null;
let groundPickR2Start = null;

const TTT_POINTS = [80, 80, 80, 40, 40, 40, 30, 30, 30];
const TTT_OWNER  = ['R2','R2','R2','R2','R2','R2','R1','R1','R1'];
const tttState   = new Array(9).fill(false);

const SQUARE_COLORS_RED = [
    '#007a3c', '#045713', '#007a3c',
    '#045713', '#007a3c', '#8bad56',
    '#007a3c', '#8bad56', '#007a3c',
    '#045713', '#007a3c', '#045713'
];
const SQUARE_COLORS_BLUE = [
    '#007a3c', '#045713', '#007a3c',
    '#8bad56', '#007a3c', '#045713',
    '#007a3c', '#8bad56', '#007a3c',
    '#045713', '#007a3c', '#045713'
];
function getSquareColors() {
    return getSide() === 'Blue' ? SQUARE_COLORS_BLUE : SQUARE_COLORS_RED;
}
const R1_FORBIDDEN = new Set([4, 7]);
let activePlayer = null;
const squarePicks = {};

// ── Helpers ───────────────────────────────────────────────────
function formatTime(t) {
    const m  = String(Math.floor(t / 6000)).padStart(2, '0');
    const s  = String(Math.floor((t % 6000) / 100)).padStart(2, '0');
    const ms = String(t % 100).padStart(2, '0');
    return `${m}:${s}:${ms}`;
}

function getTeam() { return document.getElementById('team-search').value || 'unknown'; }
function getSide() { return document.getElementById('color').value || 'unknown'; }

function logTimestamped(type) {
    logs.push({ type, time: formatTime(milli) });
    renderLog();
}

// ── Clock ─────────────────────────────────────────────────────
let startEpoch = null;  // Date.now() when timer last started
let frozenMilli = 0;    // accumulated time before last stop

function start() {
    if (interval) return;
    startEpoch = Date.now() - frozenMilli * 10;
    interval = setInterval(() => {
        milli = Math.floor((Date.now() - startEpoch) / 10);
        document.getElementById('MainClock').textContent = formatTime(milli);
    }, 50);
}

function stop() {
    if (interval) { clearInterval(interval); interval = null; }
    frozenMilli = milli;
    document.getElementById('MainClock').textContent = formatTime(milli);
}

function clearTimer() {
    if (interval) { clearInterval(interval); interval = null; }
    milli = 0; frozenMilli = 0; startEpoch = null; logs = []; assemPressed = false; assemCount = 0;
    z3R1Score = 0; z3R2Score = 0; enterBonus = 0;
    z2R1Blocks = 0; z2R2Blocks = 0;
    z2R1PaidOut = 0; z2R2PaidOut = 0;
    groundPickR1Start = null; groundPickR2Start = null;
    setGroundBtn('R1', false);
    setGroundBtn('R2', false);
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

// ── Log ───────────────────────────────────────────────────────
function renderLog() {
    const output = document.getElementById('logOutput');
    const header = `Team: ${getTeam()} &nbsp;|&nbsp; Side: ${getSide()}`;
    if (logs.length === 0) {
        output.innerHTML = `${header}<br><br>No events logged yet.`;
        return;
    }
    output.innerHTML = `${header}<br><br>` + logs.map(e => `${e.time} — ${e.type}`).join('<br>');
}

function exportTXT() {
    const team = getTeam();
    const side = getSide();
    const header = `Team: ${team} | Side: ${side}\n${'─'.repeat(30)}\n`;
    const entries = logs.length
        ? logs.map(e => `${e.time}  ${e.type}`).join('\n')
        : 'No events logged yet.';
    const blob = new Blob([header + entries], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team}_${side}_log.txt`;
    a.click();
}

function exportJSON() {
    const team = getTeam();
    const side = getSide();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team}_${side}_log.json`;
    a.click();
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

// ── Zone 1 ────────────────────────────────────────────────────
function SpearAssem() {
    assemCount++;
    logTimestamped('Assem(+10pt)');
    if (!assemPressed) {
        assemPressed = true;
        document.getElementById('zone1Start').disabled = false;
    }
    updateScoreboard();
}

function zone1Return() { logTimestamped('Zone1_Return'); }

// ── Zone 2 Enter ──────────────────────────────────────────────
function zone2BothStart() { logTimestamped('Z2_Enter_Both'); }
function zone2R1Start()   { logTimestamped('Z2_Enter_R1'); }
function zone2R2Start()   { logTimestamped('Z2_Enter_R2'); }

// ── Zone 2 Square Picker ──────────────────────────────────────
function applyGridOrientation() {
    const grid = document.getElementById('squareGrid');
    if (!grid) return;
    const colors = getSquareColors();
    grid.querySelectorAll('.sq').forEach(sq => {
        const i = Number(sq.dataset.index);
        sq.style.backgroundColor = colors[i];
    });
}

function buildGrid() {
    const grid = document.getElementById('squareGrid');
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const sq = document.createElement('div');
        sq.className = 'sq';
        if (R1_FORBIDDEN.has(i)) sq.classList.add('sq-inner');
        sq.dataset.index = i;
        sq.addEventListener('click', () => onSquareClick(i, sq));
        grid.appendChild(sq);
    }
    applyGridOrientation();
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

// ── Zone 3 Enter ──────────────────────────────────────────────
function zone3BothStart() {
    const newR1 = Math.max(0, z2R1Blocks - z2R1PaidOut);
    const newR2 = Math.max(0, z2R2Blocks - z2R2PaidOut);
    const bonus = (newR1 + newR2) * 10;
    enterBonus += bonus;
    z2R1PaidOut += newR1;
    z2R2PaidOut += newR2;
    logTimestamped(`Z3_Enter_Both(+${bonus}pt) | R1:${z2R1Blocks}blk(+${newR1}new) R2:${z2R2Blocks}blk(+${newR2}new)`);
    updateScoreboard();
}

function zone3R1Start() {
    const newR1 = Math.max(0, z2R1Blocks - z2R1PaidOut);
    const bonus = newR1 * 10;
    enterBonus += bonus;
    z2R1PaidOut += newR1;
    logTimestamped(`Z3_Enter_R1(+${bonus}pt) | R1 carried ${z2R1Blocks}blk(+${newR1}new)`);
    updateScoreboard();
}

function zone3R2Start() {
    const newR2 = Math.max(0, z2R2Blocks - z2R2PaidOut);
    const bonus = newR2 * 10;
    enterBonus += bonus;
    z2R2PaidOut += newR2;
    logTimestamped(`Z3_Enter_R2(+${bonus}pt) | R2 carried ${z2R2Blocks}blk(+${newR2}new)`);
    updateScoreboard();
}

// ── Ground Pickup (Zone 3) ────────────────────────────────────
function setGroundBtn(player, active) {
    const btn = document.getElementById(`groundPick${player}`);
    if (!btn) return;
    btn.classList.toggle('ground-active', active);
    btn.textContent = active ? `${player} — Picking…` : `${player} Pickup`;
}

function toggleGroundPick(player) {
    if (player === 'R1') {
        if (groundPickR1Start === null) {
            groundPickR1Start = Date.now();
            logTimestamped(`R1_GroundPickup_Start`);
            setGroundBtn('R1', true);
        } else {
            groundPickR1Start = null;
            logTimestamped(`R1_GroundPickup_Cancel`);
            setGroundBtn('R1', false);
        }
    } else {
        if (groundPickR2Start === null) {
            groundPickR2Start = Date.now();
            logTimestamped(`R2_GroundPickup_Start`);
            setGroundBtn('R2', true);
        } else {
            groundPickR2Start = null;
            logTimestamped(`R2_GroundPickup_Cancel`);
            setGroundBtn('R2', false);
        }
    }
}

function resolveGroundPick(player) {
    if (player === 'R1' && groundPickR1Start !== null) {
        const elapsed = ((Date.now() - groundPickR1Start) / 1000).toFixed(1);
        logTimestamped(`R1_GroundPickup_Done(${elapsed}s)`);
        groundPickR1Start = null;
        setGroundBtn('R1', false);
    } else if (player === 'R2' && groundPickR2Start !== null) {
        const elapsed = ((Date.now() - groundPickR2Start) / 1000).toFixed(1);
        logTimestamped(`R2_GroundPickup_Done(${elapsed}s)`);
        groundPickR2Start = null;
        setGroundBtn('R2', false);
    }
}

function finishGroundPickupNoPlace(player) {
    if (player === 'R1' && groundPickR1Start !== null) {
        const elapsed = ((Date.now() - groundPickR1Start) / 1000).toFixed(1);
        logTimestamped(`R1_GroundPickup_NoPlace(${elapsed}s)`);
        groundPickR1Start = null;
        setGroundBtn('R1', false);
    } else if (player === 'R2' && groundPickR2Start !== null) {
        const elapsed = ((Date.now() - groundPickR2Start) / 1000).toFixed(1);
        logTimestamped(`R2_GroundPickup_NoPlace(${elapsed}s)`);
        groundPickR2Start = null;
        setGroundBtn('R2', false);
    } else {
        logTimestamped(`${player}_GroundPickup_NoPlace(none active)`);
    }
}
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
        resolveGroundPick(owner);   // auto-finish pickup timer if running
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

// ── Scoreboard ────────────────────────────────────────────────
function updateScoreboard() {
    document.getElementById('sbZ2R1').textContent = `R1: ${z2R1Blocks} blk`;
    document.getElementById('sbZ2R2').textContent = `R2: ${z2R2Blocks} blk`;
    document.getElementById('sbZ3R1').textContent = `R1: ${z3R1Score} pts`;
    document.getElementById('sbZ3R2').textContent = `R2: ${z3R2Score} pts`;
    document.getElementById('sbEnterBonus').textContent = `${enterBonus} pts`;
    document.getElementById('sbAssemBonus').textContent = `${assemCount * 10} pts`;
    const total = z3R1Score + z3R2Score + enterBonus + (assemCount * 10);
    document.getElementById('sbTotal').textContent = `${total} pts`;
}

// ── Misc ──────────────────────────────────────────────────────
function flashButton(btn) {
    btn.classList.add('blink');
    btn.addEventListener('animationend', () => btn.classList.remove('blink'), { once: true });
}

document.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') flashButton(e.target);
});

document.getElementById('team-search').addEventListener('input', renderLog);
document.getElementById('color').addEventListener('change', () => {
    renderLog();
    applyGridOrientation();
});

buildGrid();
buildTTT();
updateScoreboard();
renderLog();
