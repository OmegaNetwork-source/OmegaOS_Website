document.getElementById('sendBtn').addEventListener('click', async () => {
    const method = document.getElementById('reqMethod').value;
    const url = document.getElementById('reqUrl').value;
    const headersStr = document.getElementById('reqHeaders').value;
    const body = document.getElementById('reqBody').value;
    const btn = document.getElementById('sendBtn');

    let headers = {};
    try {
        headers = JSON.parse(headersStr);
    } catch (e) {
        alert('Invalid Headers JSON format');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'SENDING...';
    document.getElementById('resStatus').innerText = 'Status: Sending';

    const startTime = Date.now();

    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            const res = await window.electronAPI.invoke('interceptor-send-request', {
                method, url, headers, body
            });

            const elapsed = Date.now() - startTime;
            document.getElementById('resTime').innerText = `Time: ${elapsed}ms`;

            if (res.success) {
                document.getElementById('resStatus').innerText = `Status: ${res.status} ${res.statusText}`;
                document.getElementById('responseBody').value = res.data;
                // Colorize status
                const s = res.status;
                const meta = document.getElementById('resStatus');
                if (s >= 200 && s < 300) meta.style.color = '#0f0';
                else if (s >= 400) meta.style.color = '#f00';
                else meta.style.color = '#fff';
            } else {
                document.getElementById('resStatus').innerText = 'Status: ERROR';
                document.getElementById('responseBody').value = `Error: ${res.error}`;
            }
        }
    } catch (e) {
        document.getElementById('responseBody').value = `IPC Error: ${e.message}`;
    }

    btn.disabled = false;
    btn.innerText = 'SEND REQUEST';
});
