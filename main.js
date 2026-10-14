const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isPinnedAlwaysOnTop = true;
let isDesktopLevel = false;

// Configurable sizes
const COLLAPSED_WIDTH = 220;
const COLLAPSED_HEIGHT = 58;
const EXPANDED_WIDTH = 400;
const EXPANDED_HEIGHT = 650;

// Set proper Application ID for Windows taskbar icon binding
app.setAppUserModelId('com.ambientfocus.overlay');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Initial position: Top right near notification area
  const initialX = screenWidth - EXPANDED_WIDTH - 24;
  const initialY = 24;
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: EXPANDED_WIDTH,
    height: EXPANDED_HEIGHT,
    x: initialX,
    y: initialY,
    frame: false,
    transparent: true,
    resizable: true, // Allow user to freely resize smaller or larger
    minWidth: 280,
    minHeight: 380,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Keep timer accurate in background
    }
  });

  mainWindow.loadFile('index.html');

  // Handle window positioning & dragging
  ipcMain.on('window-drag', (event, { mouseX, mouseY }) => {
    if (mainWindow) {
      mainWindow.setPosition(mouseX, mouseY);
    }
  });

  // Toggle Always-On-Top vs Desktop-Widget mode
  ipcMain.on('toggle-pin-mode', (event, mode) => {
    if (!mainWindow) return;
    if (mode === 'always-on-top') {
      isPinnedAlwaysOnTop = true;
      isDesktopLevel = false;
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else if (mode === 'desktop') {
      isPinnedAlwaysOnTop = false;
      isDesktopLevel = true;
      mainWindow.setAlwaysOnTop(false);
      // On Windows, lowering behind active apps
      mainWindow.moveTop();
    } else {
      // Normal floating
      isPinnedAlwaysOnTop = false;
      isDesktopLevel = false;
      mainWindow.setAlwaysOnTop(false);
    }
  });

  // Resize window smoothly between collapsed pill & expanded dashboard
  ipcMain.on('set-window-size', (event, { expanded }) => {
    if (!mainWindow) return;
    const currentBounds = mainWindow.getBounds();
    const targetWidth = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
    const targetHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

    // Adjust X to keep right edge aligned nicely
    const deltaX = currentBounds.width - targetWidth;
    mainWindow.setBounds({
      x: currentBounds.x + deltaX,
      y: currentBounds.y,
      width: targetWidth,
      height: targetHeight
    });
  });

  // Auto-launch with Windows toggle
  ipcMain.handle('get-autostart-status', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('set-autostart-status', (event, openAtLogin) => {
    app.setLoginItemSettings({
      openAtLogin: openAtLogin,
      path: app.getPath('exe')
    });
    return app.getLoginItemSettings().openAtLogin;
  });

  // Check active window for distractions (YouTube, Facebook, etc.)
  ipcMain.handle('check-active-window', async () => {
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, 'window_monitor.py');
      const cp = require('child_process');
      cp.exec(`python "${scriptPath}"`, { windowsHide: true }, (err, stdout) => {
        if (err || !stdout) {
          resolve({ title: '', process: '', is_distracted: false });
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e) {
          resolve({ title: '', process: '', is_distracted: false });
        }
      });
    });
  });

  // Save note & task markdown into Obsidian Vault (D:\Documents\theme pages\theme pages)
  ipcMain.handle('save-obsidian-note', async (event, { date, content, tasks }) => {
    try {
      const vaultPath = 'D:\\Documents\\theme pages\\theme pages';
      if (!fs.existsSync(vaultPath)) {
        fs.mkdirSync(vaultPath, { recursive: true });
      }

      // Create a dedicated folder for overlay daily notes
      const notesDir = path.join(vaultPath, 'Daily Focus Logs');
      if (!fs.existsSync(notesDir)) {
        fs.mkdirSync(notesDir, { recursive: true });
      }

      // Obsidian markdown with bidirectional link tags for graph view!
      let md = `---
date: ${date}
tags:
  - focus-log
  - productivity
  - overlay
---

# 🌿 Focus & Activity Log - ${date}

[[my goal]] | [[solovibe code]] | [[FB pages]]

## 📝 Quick Notes
${content || '_No notes added today._'}

## ✅ Tasks Log
`;

      if (tasks && tasks.length > 0) {
        tasks.forEach(t => {
          const check = t.completed ? 'x' : ' ';
          const deadlineText = t.deadline ? ` (Due: ${t.deadline})` : '';
          const mins = Math.round((t.timeSpent || 0) / 60);
          md += `- [${check}] **${t.title}**${deadlineText} — _Focus: ${mins}m_\n`;
        });
      } else {
        md += `_No tasks recorded for this date._\n`;
      }

      const filePath = path.join(notesDir, `${date}.md`);
      fs.writeFileSync(filePath, md, 'utf-8');
      return { success: true, path: filePath };
    } catch (err) {
      console.error('Obsidian sync error:', err);
      return { success: false, error: err.message };
    }
  });

  // Minimize to tray
  ipcMain.on('minimize-to-tray', () => {
    if (mainWindow) mainWindow.hide();
  });

  // Close app
  ipcMain.on('close-app', () => {
    app.quit();
  });
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Productivity Overlay',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Always On Top',
        type: 'checkbox',
        checked: isPinnedAlwaysOnTop,
        click: (item) => {
          isPinnedAlwaysOnTop = item.checked;
          if (mainWindow) mainWindow.setAlwaysOnTop(item.checked, 'screen-saver');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Ambient Focus & Task Companion');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (err) {
    console.warn('Tray creation skipped or failed:', err);
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Generate fallback icon if needed before tray
    ensureIconExists();
    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function ensureIconExists() {
  const iconPath = path.join(__dirname, 'icon.png');
  if (!fs.existsSync(iconPath)) {
    // 1x1 transparent png or default buffer fallback
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifgWoG/P//n5GBgYGBkZERw5CYmBgzMDAwMCIL4DMWLFiAhhmxGsDIyIiQGBsbG07DkBgGDAwMSEbhMhgbQHYA2YxRDeC/j42N8XkF7k1UB8xRM8AEAwCR0xchY8oT+QAAAABJRU5ErkJggg==',
      'base64'
    );
    try {
      fs.writeFileSync(iconPath, minimalPng);
    } catch (e) {
      console.error(e);
    }
  }
}
