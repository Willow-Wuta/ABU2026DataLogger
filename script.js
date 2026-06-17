let interval = null;
let milli = 0;
let logs = [];

function start() {
    if (interval) return;

    interval = setInterval(() => {
        milli++;

        const m = String(Math.floor(milli / 6000)).padStart(2, '0');
        const s = String(Math.floor((milli % 6000) / 100)).padStart(2, '0');
        const ms = String(milli % 100).padStart(2, '0');

        document.getElementById('MainClock').textContent = `${m}:${s}:${ms}`;
        document.getElementById("SpearDisplay").textContent = `${m}:${s}:${ms}`;
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
    logs = []; // wipe logs

    document.getElementById("MainClock").textContent = "00:00:00";
    document.getElementById("SpearDisplay").textContent = "00:00:00";

    // Reset all checkboxes
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