// Omega Crack Logic (Batch Mode)

// Simple MD5 implementation (for client-side simulation/real cracking)
const MD5 = function (d) { var r = M(V(Y(X(d), 8 * d.length))); return r.toLowerCase() }; function M(d) { for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++)_ = d.charCodeAt(r), f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _); return f } function X(d) { for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++)_[m] = 0; for (m = 0; m < 8 * d.length; m += 8)_[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32; return _ } function V(d) { for (var _ = "", m = 0; m < 32 * d.length; m += 8)_ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255); return _ } function Y(d, _) { d[_ >> 5] |= 128 << _ % 32, d[14 + (_ + 64 >>> 9 << 4)] = _; for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) { var h = m, t = f, g = r, e = i; m = md5_ii(m = md5_ii(m = md5_ii(m = md5_ii(m = md5_hh(m = md5_hh(m = md5_hh(m = md5_hh(m = md5_gg(m = md5_gg(m = md5_gg(m = md5_gg(m = md5_ff(m = md5_ff(m = md5_ff(m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, i, d[n + 1], 12, -389564586), f, r, i, d[n + 2], 17, 606105819), f, r, i, d[n + 3], 22, -1044525330), f, r, i, d[n + 4], 7, -176418897), f, r, i, d[n + 5], 12, 1200080426), f, r, i, d[n + 6], 17, -1473231341), f, r, i, d[n + 7], 22, -45705983), f, r, i, d[n + 8], 7, 1770035416), f, r, i, d[n + 9], 12, -1958414417), f, r, i, d[n + 10], 17, -42063), f, r, i, d[n + 11], 22, -1990404162), f, r, i, d[n + 12], 7, 1804603682), f, r, i, d[n + 13], 12, -40341101), f, r, i, d[n + 14], 17, -1502002290), f, r, i, d[n + 15], 22, 1236535329), m = md5_add(m, h), f = md5_add(f, t), r = md5_add(r, g), i = md5_add(i, e) } return String.fromCharCode(m & 255, m >>> 8 & 255, m >>> 16 & 255, m >>> 24 & 255) + String.fromCharCode(f & 255, f >>> 8 & 255, f >>> 16 & 255, f >>> 24 & 255) + String.fromCharCode(r & 255, r >>> 8 & 255, r >>> 16 & 255, r >>> 24 & 255) + String.fromCharCode(i & 255, i >>> 8 & 255, i >>> 16 & 255, i >>> 24 & 255) } function md5_cmn(d, _, m, f, r, i) { return md5_add(bit_rol(md5_add(md5_add(_, d), md5_add(f, i)), r), m) } function md5_ff(d, _, m, f, r, i, n) { return md5_cmn(_ & m | ~_ & f, d, _, r, i, n) } function md5_gg(d, _, m, f, r, i, n) { return md5_cmn(_ & f | m & ~f, d, _, r, i, n) } function md5_hh(d, _, m, f, r, i, n) { return md5_cmn(_ ^ m ^ f, d, _, r, i, n) } function md5_ii(d, _, m, f, r, i, n) { return md5_cmn(m ^ (_ | ~f), d, _, r, i, n) } function md5_add(d, _) { var m = (65535 & d) + (65535 & _); return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m } function bit_rol(d, _) { return d << _ | d >>> 32 - _ }

const WORDLIST = [
    'password', '123456', '12345678', '1234', 'qwerty', '12345', 'dragon',
    'pussy', 'baseball', 'football', 'letmein', 'master', 'michael', 'shadow',
    'hunter2', 'admin', 'root', 'superman', 'batman', 'welcome', 'genesis', 'omega',
    'hackerman', 'system', 'cyberpunk', '111111', 'password123', 'love', 'cookie', 'shell'
];

let isRunning = false;
let attempts = 0;
let startTime = 0;
let targets = []; // Array of {user, hash, cracked}

document.getElementById('startBtn').addEventListener('click', () => {
    if (isRunning) return;

    // Check if targetList exists (Batch Mode) or fallback to targetHash
    const listEl = document.getElementById('targetList');
    let rawInput = '';

    if (listEl) {
        rawInput = listEl.value.trim();
    } else {
        // Fallback for safety if HTML didn't update but JS did
        rawInput = document.getElementById('targetHash').value.trim();
    }

    const mode = document.getElementById('attackMode').value;

    if (!rawInput) {
        log('Error: Please enter hashes.');
        return;
    }

    // Parse Input (Robust: handles both single hash and user:hash list)
    targets = rawInput.split('\n').map(line => {
        const parts = line.split(':');
        if (parts.length > 1) {
            return { user: parts[0].trim(), hash: parts[1].trim().toLowerCase(), cracked: false };
        } else {
            // Assume just hash if no colon
            return { user: 'Unknown', hash: line.trim().toLowerCase(), cracked: false };
        }
    }).filter(t => t.hash.length > 0);

    if (targets.length === 0) return;

    isRunning = true;
    attempts = 0;
    startTime = Date.now();
    document.getElementById('startBtn').disabled = true;

    log(`> LOADED ${targets.length} TARGETS. STARTING ${mode.toUpperCase()} ATTACK...`);

    if (mode === 'dict') {
        runDictionary();
    } else {
        runBruteForce();
    }
});

function log(msg, highlight = false) {
    const el = document.getElementById('logArea');
    const d = document.createElement('div');
    d.innerText = msg;
    if (highlight) d.classList.add('highlight');
    el.prepend(d);
}

function updateStats() {
    const el = document.getElementById('attemptDisplay');
    const sp = document.getElementById('speedDisplay');
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = Math.round(attempts / (elapsed || 1));
    const crackedCount = targets.filter(t => t.cracked).length;

    el.innerText = `Attempts: ${attempts} | Cracked: ${crackedCount}/${targets.length}`;
    sp.innerText = `${speed} H/s`;
}

async function runDictionary() {
    for (const word of WORDLIST) {
        if (!isRunning) break;
        if (targets.every(t => t.cracked)) break; // All done

        attempts++;
        const h = MD5(word);

        // Check against ALL uncracked targets
        checkHash(h, word);

        if (attempts % 10 === 0) {
            updateStats();
            log(`Checking: ${word}`);
            await new Promise(r => setTimeout(r, 20));
        }
    }
    finish();
}

async function runBruteForce() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    // Ultra simple iteration (depth 4 max for demo)

    const recurse = async (curr) => {
        if (!isRunning) return;
        if (targets.every(t => t.cracked)) return;
        if (curr.length >= 4) return; // Limit depth

        for (let i = 0; i < chars.length; i++) {
            if (!isRunning) return;
            const word = curr + chars[i];
            attempts++;

            checkHash(MD5(word), word);

            if (attempts % 100 === 0) {
                updateStats();
                if (attempts % 500 === 0) log(`Current: ${word}...`);
                await new Promise(r => setTimeout(r, 0));
            }

            if (targets.every(t => t.cracked)) return;
            await recurse(word);
        }
    };

    await recurse('');
    finish();
}

function checkHash(generatedHash, plaintext) {
    targets.forEach(t => {
        if (!t.cracked && t.hash === generatedHash) {
            t.cracked = true;
            log(`[+] CRACKED ${t.user}: ${plaintext}`, true);
        }
    });
}

function finish() {
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    updateStats();

    const crackedCount = targets.filter(t => t.cracked).length;
    if (crackedCount === targets.length) {
        log(`> ALL TARGETS ELIMINATED.`, true);
    } else {
        log(`> EXHAUSTED WORDLIST. DONE.`);
    }
}
