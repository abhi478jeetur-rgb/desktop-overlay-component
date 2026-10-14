const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowSize: (expanded) => ipcRenderer.send('set-window-size', { expanded }),
  togglePinMode: (mode) => ipcRenderer.send('toggle-pin-mode', mode),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  closeApp: () => ipcRenderer.send('close-app'),
  getAutostartStatus: () => ipcRenderer.invoke('get-autostart-status'),
  setAutostartStatus: (val) => ipcRenderer.invoke('set-autostart-status', val),
  checkActiveWindow: () => ipcRenderer.invoke('check-active-window'),
  onWindowDrag: (mouseX, mouseY) => ipcRenderer.send('window-drag', { mouseX, mouseY })
});
