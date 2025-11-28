# Next Steps: Malu Recorder

We have established the extension architecture, messaging pipeline, and the core "Auto-Zoom" rendering engine. The next phases focus on connecting the real data pipes.

## 1. Implement Real Video Recording (Offscreen)
Currently, `offscreen.ts` logs messages but doesn't record.
*   **Action**: Implement `navigator.mediaDevices.getUserMedia` in `src/offscreen/offscreen.ts`.
    *   Target: `chrome.tabCapture.getMediaStreamId` (passed from background) or `navigator.mediaDevices.getDisplayMedia` (user selection).
    *   *Note*: Since we are in an offscreen doc, `getDisplayMedia` might prompt on the wrong surface. The standard MV3 approach for tab recording is:
        1.  Background: `chrome.tabCapture.getMediaStreamId({ConsumerTabId: offscreenDocId})`.
        2.  Offscreen: `getUserMedia({ video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } })`.
*   **Action**: Use `MediaRecorder` to record the stream to chunks.

## 2. Data Storage Pipeline
Passing large Video Blobs via `sendMessage` is inefficient and can crash.
*   **Action**: Implement IndexedDB storage (e.g., using `idb` library).
    *   Store: `recordingId`, `videoBlob`, `metadataJSON`, `createdAt`.
*   **Flow**:
    1.  Offscreen: Saves Video Blob to IndexedDB.
    2.  Content Script: Sends Metadata to Background -> Background saves to IndexedDB (or forwards to Offscreen to save together).
    3.  Playback: Reads from IndexedDB by ID.

## 3. Connect Playback to Real Data
Currently, `PlaybackApp.tsx` uses `MOCK_METADATA` and a flower video URL.
*   **Action**: Parse URL params (e.g., `playback.html?id=123`).
*   **Action**: Fetch Blob and Metadata from IndexedDB.
*   **Action**: `URL.createObjectURL(blob)` for the video source.

## 4. Polish the Renderer
*   **Canvas Resolution**: Ensure the canvas matches the recorded video's resolution (which might be high DPI).
*   **Audio**: Currently we only render video. Need to ensure `audioContext` is handled if we want sound.
*   **Smoothing**: Tweak the Lerp values in `Renderer.ts` for best feel.
*   **Cursor**: Replace the red dot with a nice SVG cursor image.

## 5. Export Feature
*   **Action**: In `PlaybackApp`, implement `canvas.captureStream()`.
*   **Action**: Use `MediaRecorder` again to record the *rendered* canvas (the one with zoom effects).
*   **Action**: Generate a `.mp4` or `.webm` download.

## 6. UI/UX
*   **Popup**: Show recording duration.
*   **Permissions**: Handle "Permission Denied" gracefully.
