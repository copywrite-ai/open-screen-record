# Next Steps: Malu Recorder

## 1. Playback UI Redesign (CapCut Style) 🎨
**Goal**: Transform the simple playback page into a professional Video Editor interface (similar to CapCut/OpenCut).
**Plan**:
*   **Layout Structure**:
    *   **Header**: App Logo, Project Title, Primary "Export" Action.
    *   **Left Sidebar**: Assets/Media Library (Placeholder for now).
    *   **Center Stage**: The Preview Player (Canvas) with a "floating" shadow look.
    *   **Right Sidebar**: Properties Panel (Zoom Settings, Background Colors/Gradients).
    *   **Bottom Panel**: Timeline/Playback Controls (Play/Pause, Scrubber, Time Display).
*   **Theme**: Professional Dark Mode (`#1e1e1e` bg, `#252526` panels).
*   **Refactoring**: Extract UI components to keep `PlaybackApp.tsx` clean.

## 2. Audio Support 🔊
**Status**: Pending
**Plan**:
*   Enable system audio in `getDisplayMedia` constraints.
*   Ensure audio is preserved during the "Export" process (canvas stream usually loses audio, need to mix track).

## 3. Recorder Refinement (Dual Control)
**Status**: Functional, but can be polished.
**Plan**:
*   Ensure coordinate mapping is accurate for "Window" vs "Screen" recording.

## 4. Code Cleanup
**Status**: Pending
*   Remove unused `src/offscreen` folder.
