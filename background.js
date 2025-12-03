function createContextMenu() {
    // Avoid duplicates: clear existing items first
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'send-selection',
            title: 'Send selection to Error Decoder',
            contexts: ['selection'], // only show when text is selected
            icons: {
                16: 'icon_2.png',
                32: 'icon_2.png',
            },
        });
    });
}

// Create the context menu item once on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed, creating context menu');
    createContextMenu();
});

// Also create context menu on startup (in case it was cleared)
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started up, creating context menu');
    createContextMenu();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== 'send-selection') return;

    const selectedText = info.selectionText || '';

    const params = new URLSearchParams();
    params.append('t', selectedText);

    // Get backend URL from storage
    getBackendUrl()
        .then((backendUrl) => {
            return fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });
        })
        .then((res) => {
            console.log('Response status:', res.status);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }
            return res.text();
        })
        .then((body) => {
            if (!tab || tab.id === undefined) return;

            // Get dismissSeconds from storage
            getDismissSeconds().then((dismissSeconds) => {
                chrome.tabs.executeScript(tab.id, {
                    code: `${iifeInvokable}(${JSON.stringify(
                        body
                    )}, ${JSON.stringify(dismissSeconds)})`,
                });
            });
        })
        .catch((err) => {
            console.error('Failed to send selection:', err.message);
        });
});

function getBackendUrl() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('backendUrl', (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            if (!result.backendUrl) {
                return reject(new Error('No backend URL configured'));
            }
            resolve(result.backendUrl);
        });
    });
}

function getDismissSeconds() {
    const defaultTimeoutSeconds = 15;

    return new Promise((resolve, reject) => {
        chrome.storage.local.get('popupDismissSeconds', (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            const val = result.popupDismissSeconds;
            if (val === undefined || val === null) {
                return resolve(defaultTimeoutSeconds);
            }
            resolve(val);
        });
    });
}

const iifeInvokable = `
(function (responseHTML, dismissSeconds) {
    // Parse HTML and extract <pre> text
    const parser = new DOMParser();
    const doc = parser.parseFromString(responseHTML, 'text/html');
    const pre = doc.querySelector('pre');
    const extractedText = pre
        ? pre.textContent.trim()
        : 'No <pre> tag found in response';

    // Remove any existing overlay
    const existing = document.getElementById('fs-error-decoder-overlay');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'fs-error-decoder-overlay';
    Object.assign(container.style, {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        maxWidth: '1000px',
        maxHeight: '300px',
        minHeight: '50px',
        padding: '28px 14px 12px 14px',
        background: 'white',
        color: '#111',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: '2147483647',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'x';
    Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '4px',
        right: '8px',
        border: 'none',
        background: 'transparent',
        fontSize: '16px',
        cursor: 'pointer',
    });
    closeBtn.onclick = () => container.remove();

    const bodyEl = document.createElement('div');
    Object.assign(bodyEl.style, {
        overflowX: 'auto',
        overflowY: 'auto',
        whiteSpace: 'pre',
        flex: '1',
        padding: '6px 6px 12px 6px',
    });
    bodyEl.textContent = extractedText;

    container.appendChild(closeBtn);
    container.appendChild(bodyEl);
    document.body.appendChild(container);

    // Auto-dismiss after specified seconds
    const seconds = Number(dismissSeconds);
    const ms = seconds * 1000;
    setTimeout(() => {
        if (container && container.parentNode) container.remove();
    }, ms);
})
`;
