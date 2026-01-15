// Window Controls Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Get Window ID
    let windowId = null;
    if (window.electronAPI) {
        windowId = await window.electronAPI.getWindowId();
    }

    // Attach listeners
    const minBtn = document.querySelector('.btn-minimize');
    const maxBtn = document.querySelector('.btn-maximize');
    const closeBtn = document.querySelector('.btn-close');

    if (minBtn) {
        minBtn.addEventListener('click', () => {
            if (window.electronAPI) window.electronAPI.appWindowMinimize(windowId);
        });
    }

    if (maxBtn) {
        maxBtn.addEventListener('click', () => {
            if (window.electronAPI) window.electronAPI.appWindowMaximize(windowId);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.electronAPI) window.electronAPI.appWindowClose(windowId);
        });
    }
});
