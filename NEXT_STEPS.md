# Next Steps: Malu Recorder (Session 2)

We have successfully implemented a high-quality screen recorder with auto-zoom playback. However, the switch to "Recorder Window" architecture introduced some regressions (missing metadata) and UX challenges.

## 1. Restore Metadata Recording (Critical)
**Problem**: The `Recorder Window` starts recording independently. It sends `BROADCAST_START`, but the Service Worker needs to accurately tell the *Active Tab's* content script to start logging mouse events.
**Plan**:
*   In `service-worker.ts`: Listen for `BROADCAST_START`.
*   Use `chrome.tabs.query({active: true})` to find the user's current tab (assuming they start recording while looking at the target tab).
*   Send `START_RECORDING` to that tab.
*   On `BROADCAST_STOP`, collect metadata from that tab and save to IDB.

## 2. Improve Recorder UX (Dual Control)
**Problem**: The recorder window gets hidden behind full-screen apps.
**Status**: 🟢 In Progress
**Plan**:
*   **Refined Flow (Recora-style)**:
    *   Click Extension Icon -> Opens `recorder.html` (Pinned Tab).
    *   User selects source (Window/Screen) via native picker.
    *   "Start Recording" button jumps user back to the original tab.
    *   Metadata is synced via `BROADCAST_START` -> Background -> Content Script.
*   **Next**: Verify coordinate mapping accuracy when recording "Entire Screen" vs "Window".

## 3. Export to MP4
**Problem**: Currently we can only watch the result in the Playback page.
**Plan**:
*   In `PlaybackApp.tsx`: Implement `canvas.captureStream()`.
*   Use `MediaRecorder` to record the canvas stream in real-time (faster than real-time if possible, but real-time is easier).
*   Combine with original audio track (if any).
*   Generate a downloadable file.

## 4. Audio Support
**Problem**: Current implementation has `audio: false`.
**Plan**:
*   Enable system audio in `getDisplayMedia`.
*   Merge audio tracks into the final Blob.

## 5. Code Cleanup
*   Remove unused `src/offscreen` folder and related logic in `service-worker.ts` (since we moved to Recorder Window).