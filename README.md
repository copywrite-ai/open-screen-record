# Malu Recorder 🎥

**Malu Recorder** is an intelligent Chrome Extension for creating high-quality, cinematic screen recordings. Unlike traditional screen recorders that just capture pixels, Malu records **metadata** (mouse clicks, movements) alongside the video stream. This allows for dynamic, automated zooming and camera movements during playback, turning boring screen captures into engaging tutorials or demos automatically.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Tech](https://img.shields.io/badge/tech-React%20%7C%20Vite%20%7C%20TypeScript-blueviolet)

## ✨ Key Features

*   **Auto-Zoom & Follow**: Automatically zooms in on mouse clicks and follows the cursor smoothly, creating a professional "camera operator" feel.
*   **Metadata-Driven Rendering**: Decouples the raw recording from the final presentation. The "Editor" re-renders the video in real-time on a Canvas.
*   **Cinematic Editor UI**: A professional, dark-mode interface inspired by tools like CapCut, featuring:
    *   Real-time preview canvas.
    *   Timeline controls.
    *   Properties panel (zoom intensity, background styles).
*   **Export to Video**: Render your zoomed/edited video to a standalone `.webm` file (VP9 codec) directly from the browser.
*   **Zero-Config Recording**: Click to record any tab, window, or screen.

## 🛠 Tech Stack

*   **Frontend**: React 18, TypeScript
*   **Build Tool**: Vite 5 + CRXJS (for seamless Chrome Extension HMR)
*   **Testing**: Vitest + React Testing Library
*   **Storage**: IndexedDB (idb-keyval) for handling large video blobs locally.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16 or higher)
*   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/malu-recorder.git
    cd malu-recorder
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start Development Server (HMR):
    ```bash
    npm run dev
    ```

### Loading in Chrome

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `dist` folder in your project directory.
5.  The extension icon should appear in your toolbar.

## 🏗 Architecture

Malu Recorder consists of three main parts:

1.  **Recorder (Popup/Window)**:
    *   Uses `navigator.mediaDevices.getDisplayMedia` to capture high-res video.
    *   Communicates with the content script to synchronize start/stop times.
2.  **Content Script (Metadata Logger)**:
    *   Injects into pages to record mouse coordinates (`mousemove`, `click`) with high precision.
    *   Syncs events to IndexedDB via the Background Service Worker.
3.  **Playback / Editor**:
    *   Loads the raw video blob and metadata events from IndexedDB.
    *   **Renderer Core**: A custom Canvas-based engine that draws the video frame and overlays a "Virtual Camera" transform based on mouse position logic (Linear Interpolation for smoothness).

## 🧪 Running Tests

Run unit tests for the Renderer, Popup, and logic:

```bash
npm test
```

## 📅 Roadmap

*   [x] Basic Screen Recording
*   [x] Metadata Capture (Mouse events)
*   [x] Auto-Zoom Playback Engine
*   [x] **New:** CapCut-style Editor UI
*   [x] **New:** Export to WebM
*   [ ] Audio Support (System & Mic)
*   [ ] Custom Zoom Keyframes
*   [ ] "Dual Control" Recorder UX Polishing

## 📄 License

MIT License
