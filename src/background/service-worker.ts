import { set } from 'idb-keyval';

// New Entry Point: Action Clicked
if (typeof chrome !== 'undefined' && chrome.action) {
    chrome.action.onClicked.addListener(async (tab) => {
        if (tab.id) {
            // Open the recorder window/tab
            // We pass the current tab ID so the recorder knows where to jump back to / record metadata from
            await chrome.tabs.create({
                url: `recorder.html?targetTabId=${tab.id}`,
                active: true,
                pinned: true
            });
        }
    });
}

// Handle Broadcasts from Recorder Window
// Handle Broadcasts from Recorder Window
export const handleMessage = (message: any, _sender: any, sendResponse: (response?: any) => void) => {
    if (message.type === 'BROADCAST_START') {
        const targetTabId = message.targetTabId;
        if (targetTabId) {
            console.log(`Broadcasting START to tab ${targetTabId}`);

            const startMetadata = async () => {
                try {
                    // Try sending immediately
                    await chrome.tabs.sendMessage(targetTabId, { type: 'START_RECORDING' });
                } catch (e: any) {
                    console.warn('Initial connect failed, attempting injection...', e);
                    // If failed, try injecting the script
                    try {
                        // Dynamically get the correct filename from manifest (handles hashed filenames in build)
                        const manifest = chrome.runtime.getManifest();
                        const scriptFile = manifest.content_scripts?.[0]?.js?.[0];

                        if (scriptFile) {
                            await chrome.scripting.executeScript({
                                target: { tabId: targetTabId },
                                files: [scriptFile]
                            });

                            // Robust Retry Logic (Polling) instead of hard wait
                            let retries = 20;
                            while (retries > 0) {
                                try {
                                    await chrome.tabs.sendMessage(targetTabId, { type: 'START_RECORDING' });
                                    console.log('Injection and handshake successful');
                                    return; // Success
                                } catch (e) {
                                    // Wait 50ms and retry
                                    await new Promise(r => setTimeout(r, 50));
                                    retries--;
                                }
                            }
                            throw new Error('Content script handshake timeout');
                        } else {
                            console.error('Could not find content script in manifest');
                        }
                    } catch (injectErr) {
                        console.error('Failed to inject or retry content script', injectErr);
                    }
                }
            };
            startMetadata();
        }
    }

    if (message.type === 'BROADCAST_STOP') {
        const targetTabId = message.targetTabId;
        if (targetTabId) {
            console.log(`Broadcasting STOP to tab ${targetTabId}`);
            // Async metadata collection
            (async () => {
                try {
                    const response: any = await new Promise((resolve) => {
                        chrome.tabs.sendMessage(targetTabId, { type: 'STOP_RECORDING' }, (resp) => {
                            if (chrome.runtime.lastError) {
                                console.warn('Error fetching metadata:', chrome.runtime.lastError);
                                resolve(null);
                            } else {
                                resolve(resp);
                            }
                        });
                    });

                    if (response && response.data) {
                        console.log('Metadata received via broadcast, saving...', response.data.length);
                        await set('latest-metadata', response.data);
                    } else {
                        console.log('No metadata received.');
                        await set('latest-metadata', []);
                    }
                    sendResponse({ success: true });
                } catch (e) {
                    console.error('Error in BROADCAST_STOP handler:', e);
                    sendResponse({ success: false });
                }
            })();
            return true; // Indicate async response
        } else {
            console.warn('BROADCAST_STOP received but no targetTabId provided');
            sendResponse({ success: false, error: 'No targetTabId' });
        }
    }
};

chrome.runtime.onMessage.addListener(handleMessage);