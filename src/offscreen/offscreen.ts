import { set } from 'idb-keyval';

// Forward logs to background
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
    originalLog(...args);
    chrome.runtime.sendMessage({ type: 'LOG', level: 'log', args });
}
console.error = (...args) => {
    originalError(...args);
    chrome.runtime.sendMessage({ type: 'LOG', level: 'error', args });
}

console.log('Offscreen document loaded')

// Notify background that we are ready (Handshake)
// This allows background to know our tabId for tabCapture
chrome.runtime.sendMessage({ type: 'OFFSCREEN_LOADED' });

let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'START_RECORDING') {
    console.log('Offscreen: Starting recording...', message);
    
    const streamId = message.streamId;
    if (!streamId) {
      console.error('No streamId provided');
      return;
    }

    try {
      // 1. Get the media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, 
        video: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId
          }
        } as any 
      });
      
      console.log('Stream obtained:', stream.id, 'Active:', stream.active);
      if (stream.getVideoTracks().length > 0) {
          console.log('Video track state:', stream.getVideoTracks()[0].readyState);
      } else {
          console.error('No video tracks found in stream!');
      }

      // 2. Start Recorder - Let browser pick default mimeType if vp9 fails
      // Try widely supported types
      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.log('VP9 not supported, trying default webm');
          options = { mimeType: 'video/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.log('WebM not supported, letting browser choose');
          options = undefined as any;
      }

      recorder = new MediaRecorder(stream, options);
      chunks = [];

      recorder.ondataavailable = (e) => {
        console.log(`Data available: ${e.data.size} bytes`);
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onerror = (e) => {
          console.error('Recorder error:', e);
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log(`Recording finished. Chunks: ${chunks.length}, Total size: ${(blob.size / 1024).toFixed(2)} KB`);
        
        if (blob.size === 0) {
             console.error('Recording failed: Blob size is 0');
        }

        try {
          await set('latest-video', blob);
          console.log('Video saved to IndexedDB');
          // Notify background that we are done
          chrome.runtime.sendMessage({ type: 'RECORDING_SAVED' });
        } catch (err) {
          console.error('Failed to save video to IndexedDB', err);
          chrome.runtime.sendMessage({ type: 'RECORDING_SAVED', error: err }); // Still notify to allow cleanup
        }
        
        // Stop all tracks to release the camera/tab indicator
        stream.getTracks().forEach(t => t.stop());
      };

      // Request data every 200ms to ensure we have chunks even for short recordings
      recorder.start(200); 
      console.log('MediaRecorder started');

    } catch (err) {
      console.error('Failed to start recording:', err);
    }

  } else if (message.type === 'STOP_RECORDING') {
    console.log('Offscreen: Stopping recording...')
    if (recorder && recorder.state !== 'inactive') {
      // Force flush any pending data
      recorder.requestData();
      recorder.stop();
    }
  }
})
