let interval = null;
let milli = 0;
let logs = [];
let assemPressed = false;

function start() {
    if (interval) return;

    interval = setInterval(() => {
        milli++;

        const m = String(Math.floor(milli / 6000)).padStart(2, '0');
        const s = String(Math.floor((milli % 6000) / 100)).padStart(2, '0');
        const ms = String(milli % 100).padStart(2, '0');

        document.getElementById('MainClock').textContent = `${m}:${s}:${ms}`;
    }, 10);
}

function stop() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }

    const m = String(Math.floor(milli / 6000)).padStart(2, '0');
    const s = String(Math.floor((milli % 6000) / 100)).padStart(2, '0');
    const ms = String(milli % 100).padStart(2, '0');

    document.getElementById('MainClock').textContent = `${m}:${s}:${ms}`;
}

function clearTimer() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }

    milli = 0;
    logs = [];
    assemPressed = false;

    document.getElementById("MainClock").textContent = "00:00:00";
    document.getElementById('zone1Start').disabled = true;

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function exportJSON() {
    const blob = new Blob(
        [JSON.stringify(logs, null, 2)],
        { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'abu_log.json';
    a.click();
}

function logEntry() {
    const m = String(Math.floor(milli / 6000)).padStart(2, '0');
    const s = String(Math.floor((milli % 6000) / 100)).padStart(2, '0');
    const ms = String(milli % 100).padStart(2, '0');

    const entry = {
        time: `${m}:${s}:${ms}`
    };

    logs.push(entry);
    console.log(logs);
}

function logEvent(type, checkbox) {
    if (checkbox.checked) {
        const m = String(Math.floor(milli / 6000)).padStart(2, '0');
        const s = String(Math.floor((milli % 6000) / 100)).padStart(2, '0');
        const ms = String(milli % 100).padStart(2, '0');

        const entry = {
            type: type,
            time: `${m}:${s}:${ms}`
        };

        logs.push(entry);
        console.log(logs);

    } else {
        // Find the LAST entry with this type and remove it
        const index = logs.findLastIndex(entry => entry.type === type);
        if (index !== -1) logs.splice(index, 1);
        console.log(logs);
    }
}

function SpearAssem() {
    const m = String(Math.floor(milli / 6000)).padStart(2, '0');
    const s = String(Math.floor((milli % 6000) / 100)).padStart(2, '0');
    const ms = String(milli % 100).padStart(2, '0');

    logs.push({ type: 'Assem', time: `${m}:${s}:${ms}` });
    console.log(logs);

    // Unlock Start after first Assem
    if (!assemPressed) {
        assemPressed = true;
        document.getElementById('zone1Start').disabled = false;
    }
}

function zone1Return() {
    const m = String(Math.floor(milli / 6000)).padStart(2, '0');
    const s = String(Math.floor((milli % 6000) / 100)).padStart(2, '0');
    const ms = String(milli % 100).padStart(2, '0');

    logs.push({ type: 'Zone1_Return', time: `${m}:${s}:${ms}` });
    console.log(logs);
}

function flashButton(btn) {
    btn.classList.add('blink');
    btn.addEventListener('animationend', () => btn.classList.remove('blink'), { once: true });
}

document.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') flashButton(e.target);
});