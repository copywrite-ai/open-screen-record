import { set } from 'idb-keyval';

export type MessageType = 'START_RECORDING' | 'STOP_RECORDING' | 'OFFSCREEN_LOADED' | 'RECORDING_SAVED' | 'LOG' | 'GET_STATUS'

// Check if offscreen document exists
async function hasOffscreenDocument(path: string) {
  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [path]
    });
    return contexts.length > 0;
  } else {
    // Fallback for older versions if needed, though MV3 usually supports getContexts
    const allClients = await (self as any).clients.matchAll();
    return allClients.some((client: any) => client.url.endsWith(path));
  }
}

// Store the offscreen document's tab ID
// let offscreenTabId: number | null = null;

async function setupOffscreenDocument(path: string) {
  if (await hasOffscreenDocument(path)) {
    return;
  }

  try {
    await chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Recording from tab'
    });
  } catch (e: any) {
    if (!e.message.startsWith('Only a single offscreen')) {
       throw e;
    }
    // If it already exists, that's fine
  }
}

// State
let isRecording = false;

// Helper to wait for a specific message type
function waitForMessage(type: string, timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    const listener = (message: any) => {
      if (message.type === type) {
        chrome.runtime.onMessage.removeListener(listener);
        resolve();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    // Timeout fallback
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      resolve(); // Resolve anyway to proceed with cleanup
    }, timeout);
  });
}

export const handleMessage = async (
  message: { type: string, target?: string, tabId?: number },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  // console.log('Received message:', message.type)

  // 0. Handle Status Check
  if (message.type === 'GET_STATUS') {
      sendResponse({ isRecording });
      return;
  }
  
  // 0.1 Handle Remote Logs
  if (message.type === 'LOG') {
      const args = (message as any).args || [];
      if ((message as any).level === 'error') {
          console.error('[OFFSCREEN]', ...args);
      } else {
          console.log('[OFFSCREEN]', ...args);
      }
      return;
  }

  // 1. Handle Offscreen Handshake
  if (message.type === 'OFFSCREEN_LOADED') {
      console.log('Offscreen loaded.');
      return;
  }
  
  // 2. Handle Recording Saved Confirmation (Ignored here, handled by waitForMessage in STOP logic)
  if (message.type === 'RECORDING_SAVED') {
      return;
  }

  if (message.type === 'START_RECORDING') {
    console.log('Starting recording sequence...')
    isRecording = true;
    
    const targetTabId = message.tabId;
    if (!targetTabId) {
        console.error('No target tab ID provided');
        return;
    }
    
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      const offscreenPath = 'src/offscreen/offscreen.html'; 
      await setupOffscreenDocument(offscreenPath);
      console.log('Offscreen document ensured.');
      
      // Wait a bit for initialization
      await new Promise(r => setTimeout(r, 500));

      // Generate Media Stream ID
      // We omit consumerTabId, hoping chrome defaults to allowing the extension context (including offscreen)
      chrome.tabCapture.getMediaStreamId({
          targetTabId: targetTabId
      }, async (streamId) => {
          if (!streamId) {
              console.error('Failed to get MediaStreamId');
              return;
          }
          
          console.log('Generated Stream ID:', streamId);

          // Forward message to offscreen document with streamId
          try {
            await chrome.runtime.sendMessage({ 
                type: 'START_RECORDING', 
                target: 'offscreen',
                streamId: streamId 
            });
          } catch (e) {
            console.warn('Failed to send message to offscreen:', e);
          }
      });
      
      // Also notify content script to start metadata logging
      chrome.tabs.sendMessage(targetTabId, { type: 'START_RECORDING' }).catch((e) => {
          console.log('Content script not ready', e);
      });
    }

    sendResponse({ status: 'started' })
  } else if (message.type === 'STOP_RECORDING') {
    console.log('Stopping recording sequence...')
    isRecording = false;
    
    // 1. Tell Offscreen to stop
    try {
        await chrome.runtime.sendMessage({ type: 'STOP_RECORDING', target: 'offscreen' });
    } catch (e) { console.log('Failed to send stop to offscreen', e) }
     
     // 2. Tell Content Script to stop AND receive metadata
     const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
     if (activeTab?.id) {
        try {
            // We wrap this in a promise to handle the callback response
            const metadata = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(activeTab.id!, { type: 'STOP_RECORDING' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response?.data);
                    }
                });
            });

            if (metadata) {
                console.log('Received metadata from content script, saving to IDB...');
                await set('latest-metadata', metadata);
                console.log('Metadata saved to Extension IDB');
            } else {
                console.warn('No metadata received from content script');
            }
        } catch (e) {
            console.log('Failed to get metadata from content script', e);
        }
     }
     
     // 3. Wait for Offscreen to save data (with timeout)
     if (typeof chrome !== 'undefined' && chrome.offscreen) {
         console.log('Waiting for Offscreen to save data...');
         await waitForMessage('RECORDING_SAVED');
         
         try {
            await chrome.offscreen.closeDocument();
            console.log('Offscreen document closed.');
         } catch(e) {
             console.log('No offscreen doc to close or error', e);
         }
     }

    sendResponse({ status: 'stopped' })
  }
  
  return true // Indicates async response
}

// Only attach listener if we are in a chrome environment (not during tests unless mocked)
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(handleMessage)
}