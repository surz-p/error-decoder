const urlInput = document.getElementById('url');
const saveBtn = document.getElementById('save');
const popupSecondsInput = document.getElementById('popup');

chrome.storage.local.get('popupDismissSeconds', result => {
    if (result.popupDismissSeconds) {
        console.log('Got popup dismiss seconds value:', result.popupDismissSeconds);
        popupSecondsInput.value = result.popupDismissSeconds;
    }
});

chrome.storage.local.get('backendUrl', result => {
    if (result.backendUrl) {
        console.log('Got backend URL value:', result.backendUrl);
        urlInput.value = result.backendUrl;
    }
});

saveBtn.addEventListener('click', () => {
    const v = urlInput.value.trim();
    if (!v) {
        chrome.storage.local.remove('backendUrl', () => {
            console.log('Backend URL key removed from storage');
        });
        return;
    }
    chrome.storage.local.set({ backendUrl: v }, () => {
        console.log('Backend URL saved:', v);
    });

    const w = popupSecondsInput.value.trim();
    const num = parseInt(w, 10);
    if (isNaN(num) || num < 0 || num > 90) {
        chrome.storage.local.remove('popupDismissSeconds', () => {
            console.log('Popup dismiss seconds key removed from storage');
        });
        return;
    }
    chrome.storage.local.set({ popupDismissSeconds: num }, () => {
        console.log('Popup dismiss seconds saved:', num);
    });
});
