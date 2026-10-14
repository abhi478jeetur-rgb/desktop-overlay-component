# Multi-Agent Architectural Review & Implementation Strategy

## Agent Discussion Summary

### Agent 1: Windows Native & Runtime Specialist
- **Verdict**: Use **Electron** with a transparent, frameless window, optimized specifically for ultra-low memory usage (`--disable-background-timer-throttling`, hardware acceleration tuning, minimal dependencies).
- **Window Positioning & Behavior**:
  - `transparent: true`, `frame: false`, `skipTaskbar: false` (with system tray integration).
  - Can switch between `alwaysOnTop: true` (Overlay mode on top of all active apps) and `alwaysOnTop: false` with level lowered to desktop level (Desktop Widget mode).
  - Window starts positioned exactly at the top-right corner where indicated in your screenshot (`screen.getPrimaryDisplay().workAreaSize.width - 420px`).
  - Draggable header bar or grip region allowing full free drag-and-drop repositioning anywhere on the screen.
  - Windows Auto-Start: Integrated via `app.setLoginItemSettings({ openAtLogin: true })` toggle in settings.

### Agent 2: UI/UX & Neumorphic Tactile Designer
- **Verdict**: Exact alignment with the provided styleguide and color palette:
  - **Colors**:
    - `#2D4A3E` (Deep forest headers & active badges)
    - `#588157` (Primary forest green for focus states, high activity cells)
    - `#A3B18A` (Mid-tone sage for chips, secondary buttons, medium activity)
    - `#DAD7CD` (Soft tactile cream surface for background cards, neutral borders)
    - `#F4F6F0` (Crisp highlight cream for bevels, elevated surfaces)
  - **Neumorphism**:
    - Dual soft shadows (`box-shadow: 6px 6px 14px rgba(45,74,62,0.12), -6px -6px 14px rgba(255,255,255,0.8)`).
    - Inset shadows for inputs and pressed button states (`box-shadow: inset 3px 3px 6px rgba(45,74,62,0.1), inset -3px -3px 6px rgba(255,255,255,0.7)`).
    - Rounded pill shapes (`border-radius: 9999px` or `20px`).
  - **Typography**: Google Fonts Playfair / Serif for titles + Plus Jakarta Sans for clean readable UI text.
  - **Pill vs Full Expansion**:
    - Collapsed state: A sleek, tactile floating pill (showing active task icon, mini timer if running, and an expand chevron).
    - Expanded state: The full 380px wide elegant dashboard card. Hovering or clicking the pill smoothly springs open the card; mouse leave or minimize button collapses it.

### Agent 3: Productivity & Habit Architecture Specialist
- **Verdict**:
  - **To-Do List**: Quick task creation, completion checkmarks with satisfying micro-animation, drag-to-reorder or prioritize.
  - **Per-Task Focus Timer**: Start/Stop stopwatch on individual tasks. When running, a persistent prominent top bar displays the **STOP** button, current task name, and ticking timer.
  - **Productivity Contribution Heatmap**:
    - GitHub-style matrix of squares (weeks x 7 days) representing the last 16-20 weeks.
    - Each day's color intensity reflects completed tasks and focus duration.
    - Tooltips showing day details on hover.
  - **Accountability "Are You on Track?" Reminder**:
    - Configurable intervals (default 15/20/30 mins).
    - Friendly chime/popup: *"Are you still working on [Task Name]?"*
    - Options: "Yes, focused! 🎯" or "Got distracted 😅".
    - If distracted: increments distraction tally and displays an encouraging quote.
    - Stats show: "Focus efficiency: X% (Y focus checks vs Z distractions)".
  - **Local Persistence**: Data stored in local JSON/local storage so user data remains 100% private and persistent across computer restarts.

---

## Technical Architecture Plan
1. **Engine**: Lightweight Electron App + HTML5/CSS3 + Modern Vanilla JS.
2. **File Structure**:
   - `main.js`: Electron main process (transparent window, tray icon, autostart toggle, always-on-top toggle, window resize/drag handlers).
   - `preload.js`: Secure IPC bridge between renderer and Windows OS APIs.
   - `index.html`: Main widget interface (Pill + Expanded Dashboard + Modal Check-in).
   - `styles.css`: Tactile Neumorphic design system, animations, custom scrollbars, typography.
   - `app.js`: Task management, timer engine, GitHub activity heatmap generator, accountability popups, storage management.
   - `package.json`: Project metadata and dependencies.
