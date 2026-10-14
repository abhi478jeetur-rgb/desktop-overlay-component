# Product Requirements Document (PRD) & Architecture Plan

## Project: Ambient Focus & Task Overlay (Desktop Companion)

### 1. Overview & Vision
A lightweight, aesthetically pleasing desktop companion widget running on Windows. It sits quietly as a compact tactile floating pill/icon in the top-right corner of the desktop (customizable/draggable) or directly embedded on the desktop workspace.
When hovered or clicked, it seamlessly expands into a full productivity workstation featuring:
- **Task / To-Do Manager** with active timer integration
- **Per-Task Focus Timer** (with elapsed/target tracking & auto-logging)
- **GitHub-style Contribution / Activity Heatmap** (green visual history of daily productivity & completed tasks)
- **Mindful Focus Accountability Reminders** ("Are you still on track?" check-ins with distraction counter & motivational boosts)
- **Quick Notes / Scratchpad**
- **Overlay Modes**: Always on Top (Floating Overlay) vs. Desktop Widget mode (Behind active apps / embedded on desktop), draggable anywhere.
- **Auto-start with Windows** capability and ultra-lightweight footprint.

---

### 2. Design System & Aesthetic Directions
Based on the provided references:
1. **Color Palette (Forest Sage & Tactile Cream)**:
   - Deep Forest: `#2D4A3E` / `#3B5E4F` / `#588157`
   - Sage Mid-tone: `#6B9080` / `#A3B18A`
   - Soft Cream / Off-White Surface: `#DAD7CD` / `#F4F6F0`
   - Dark Contrast Accent: `#1F2E2B`
   - Accent / Warning / Motivational Highlights: Soft warm accents
2. **Visual & Component Styling (Neumorphic / Soft Tactile 3D)**:
   - Soft inset and drop shadows (`box-shadow` layering for physical tactile feel like the UI Styleguide provided).
   - Smooth pill-shaped buttons, tactile switches, extruded input boxes.
   - Ultra-clean micro-animations (smooth scale, spring hover effects, pulse animations on active timers).
3. **Typography**:
   - Headings: Clean, modern Serif/Display touch inspired by Playfair / Outfit.
   - Body & Numerics: Plus Jakarta Sans / Inter for maximum legibility and crispness.

---

### 3. Architecture & Tech Stack Debate / Analysis
We need:
1. Native Windows integration (system tray, autostart, window positioning, transparency, always-on-top toggle, click-through / desktop pinning).
2. Ultra-light engine (runs 24/7 without hogging RAM or battery).
3. Native or Web-based renderer for rich, pixel-perfect CSS neumorphic UI.

**Options Evaluated**:
- **Electron (Optimized Lightweight Configuration)**:
  - Frameless, transparent window (`transparent: true`, `frame: false`).
  - Native Windows taskbar/tray support and Windows Auto-start on boot (`loginItemSettings`).
  - Draggable regions (`-webkit-app-region: drag` / custom pointer handlers).
  - Webview hardware acceleration tuned for ultra-low memory usage (< 50MB idle).
- **Frontend Architecture**:
  - HTML5 + Vanilla CSS3 (Custom design system based on Neumorphic tactile guidelines) + Vanilla JS / Modular ES6. Zero bundle bloat, instant boot time, zero delay.

---

### 4. Core Features & User Stories

#### 4.1 Floating Trigger (Pill / Bubble)
- Default location: Top-right corner (just as marked in screenshot).
- Draggable to any position on the screen.
- State indicator: Shows tiny pulsing dot when a task timer is active.
- Hover or Click to expand: Smooth expand transition into the main dashboard card.
- Controls:
  - **Pin on Top** (Overlay above all windows)
  - **Pin to Desktop** (Stays at the desktop wallpaper level)
  - **Auto-collapse on mouse leave** (toggleable)

#### 4.2 Interactive Task Manager & Stopwatch / Pomodoro
- Add task with one click / Enter.
- Each task item has:
  - Checkbox (triggers tactile pop animation & sound toggle).
  - Start / Pause Stopwatch button.
  - Live timer display (`00:24:15`).
  - Recorded total time logged to today's history upon completion.
- Big **STOP / PAUSE** button in header/menu when timer is running.

#### 4.3 GitHub-style Productivity Heatmap
- Visual grid showing past months/weeks.
- Color gradient based on tasks completed and focus time (using `#DAD7CD` for empty -> `#A3B18A` -> `#588157` -> deep green for intense focus).
- Tooltip on hover showing: Date, tasks completed, total focus minutes.

#### 4.4 Accountability "Are You On Track?" Reminder System
- Interval setting (e.g. every 15, 25, or 45 mins).
- Non-intrusive elegant slide-in notification prompt:
  - *"Still focused on [Current Task]?"*
  - Buttons: **"Yes, in the zone! 🎯"** | **"Got distracted 😅"**
- If "Got distracted":
  - Increments distraction counter.
  - Displays an energizing motivational quote and re-centers the focus.
- Summary metric: Shows ratio of focused checks vs strayed checks ("Distraction count: X times").

#### 4.5 Notes / Scratchpad
- Quick drawer or tab for instantaneous thoughts, URLs, quick jotting.
- Persistent local storage (`localStorage` / JSON file), zero cloud dependency, 100% private and safe.
