# Recora-like Extension MVP Development Plan

**Objective**: Build a Chrome Extension that records screen video and captures mouse metadata (coordinates, clicks) to enable auto-zoom effects in post-processing.

**Current Status**: ✅ **MVP Functional** (High Quality)

## 🟢 Phase 1: Infrastructure & Basic Capture
| ID | Task | Description | Status |
|----|------|-------------|--------|
| 1.1 | **Project Initialization** | Setup Vite, React, TypeScript, CRXJS. | 🟢 Completed |
| 1.2 | **Manifest V3** | Permissions: `desktopCapture`, `offscreen`, `storage`. | 🟢 Completed |
| 1.3 | **Recorder Architecture** | **PIVOTED**: Switched from Offscreen `tabCapture` to `Recorder Window` + `desktopCapture` to solve black bar issues. | 🟢 Completed |

## 🟢 Phase 2: Playback & Rendering
| ID | Task | Description | Status |
|----|------|-------------|--------|
| 2.1 | **Renderer Engine** | Canvas-based composition. Implements "Screen Studio" style auto-zoom. | 🟢 Completed |
| 2.2 | **Smart Zoom** | Logic: Base Zoom (0.9x) for floating effect, Click Zoom (1.8x) for focus. | 🟢 Completed |
| 2.3 | **Visuals** | Gradient background, drop shadow, no black bars (using desktopCapture). | 🟢 Completed |
| 2.4 | **Data Pipeline** | Video Blob -> IndexedDB -> Playback. | 🟢 Completed |

## 🟡 Known Issues & Future Work (Phase 3)
| Issue | Description | Solution Strategy |
|-------|-------------|-------------------|
| **Metadata Missing** | In "Recorder Window" mode, we lost the connection to Content Script metadata logging. | Re-implement metadata signaling via Background. |
| **Window Z-Index** | Recorder control window gets hidden behind full-screen apps. | Implement "Stop" control in Popup UI. |
| **Export** | Currently only plays in browser. | Implement `canvas.captureStream` + `MediaRecorder` to export MP4. |
| **Audio** | Audio recording is currently disabled. | Add `audio: true` constraints and merge streams. |

## 🔄 Log & Retrospectives
*   **Pivot to DesktopCapture**: `tabCapture` forced black bars on non-16:9 tabs. Switching to `desktopCapture` with a persistent popup window solved this and allowed full-screen recording.
*   **Renderer Logic**: Centering logic requires `drawImage` at `(0,0)` but with a Camera translation system that aligns `(W/2, H/2)` to origin.
