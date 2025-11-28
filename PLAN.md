# Recora-like Extension MVP Development Plan

**Objective**: Build a Chrome Extension that records screen video and captures mouse metadata (coordinates, clicks) to enable auto-zoom effects in post-processing.

**Current Phase**: Phase 1 - Infrastructure & Basic Capture

## 🟢 Phase 1: Infrastructure & Basic Capture
**Goal**: Set up the project environment, testing framework, and implement raw video + metadata logging.

| ID | Task | Description | Test Strategy | Status |
|----|------|-------------|---------------|--------|
| 1.1 | **Project Initialization** | Setup Vite, React, TypeScript, CRXJS, and folder structure. | Build runs successfully. | 🟢 Completed |
| 1.2 | **Test Environment Setup** | Configure Vitest and JSDOM. | `npm test` runs a sample test. | 🟢 Completed |
| 1.3 | **Manifest V3 Config** | Create `manifest.json` with permissions (`tabCapture`, `storage`, `scripting`). | Unit test verifies manifest properties. | 🟢 Completed |
| 1.4 | **Popup UI (Recorder Control)** | Create a popup with Start/Stop buttons. | Unit test checks button rendering and event firing. | 🟢 Completed |
| 1.5 | **Background Service** | Handle message passing for "Start Recording". | Unit test mocks chrome.runtime.onMessage. | 🟢 Completed |
| 1.6 | **Content Script (Metadata)** | Inject script to log `mousemove` and `click`. | Unit test verifies event listeners attach and log data. | 🟢 Completed |
| 1.7 | **Offscreen Recorder** | Setup offscreen document for `tabCapture` (if needed) or use `getDisplayMedia` in popup/content. | Integration test (Manual). | 🟢 Completed |

## 🟡 Phase 2: Playback & MVP Rendering
**Goal**: Display the recorded video and overlay a "Virtual Mouse" using the captured metadata.

| ID | Task | Description | Test Strategy | Status |
|----|------|-------------|---------------|--------|
| 2.1 | **Playback Page** | specific page to load Blob video. | Page loads. | 🟢 Completed |
| 2.2 | **Data Syncing & Rendering** | Load metadata and sync with Video timestamp. | Unit test: Given T=5s, return correct X,Y. | 🟢 Completed |
| 2.3 | **Canvas Overlay** | Draw a red dot on Canvas following mouse metadata. | Visual verification. | 🟢 Completed |
| 2.4 | **Simple Auto-Zoom (MVP)** | CSS Transform Scale on click events. | Visual verification. | 🟢 Completed |

## 🔵 Phase 3 & Beyond (Future)
See `NEXT_STEPS.md` for detailed implementation plan of:
* Real Media Recording (Offscreen)
* Data Pipeline (IndexedDB)
* Video Export (Canvas Capture)

## ⚪ Phase 3: Export
**Goal**: Export the result.

| ID | Task | Description | Test Strategy | Status |
|----|------|-------------|---------------|--------|
| 3.1 | **Canvas Capture** | Capture stream from the manipulated Canvas. | Check output file size > 0. | ⚪ Pending |
| 3.2 | **Download** | Trigger file download. | Manual check. | ⚪ Pending |

---

## 🔄 Log & Retrospectives
*No logs yet.*
