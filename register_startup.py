import os
import sys
import win32com.client

def setup_startup():
    try:
        app_dir = os.path.dirname(os.path.abspath(__file__))
        startup_dir = os.path.join(os.environ['APPDATA'], r'Microsoft\Windows\Start Menu\Programs\Startup')
        shortcut_path = os.path.join(startup_dir, 'AmbientFocusOverlay.lnk')
        
        target_vbs = os.path.join(app_dir, 'Launch-Silent.vbs')
        
        shell = win32com.client.Dispatch("WScript.Shell")
        shortcut = shell.CreateShortCut(shortcut_path)
        shortcut.Targetpath = target_vbs
        shortcut.WorkingDirectory = app_dir
        shortcut.WindowStyle = 7 # Minimized/silent
        shortcut.Description = "Ambient Focus Overlay Automatic Startup"
        shortcut.save()
        print(f"SUCCESS: Startup shortcut created at {shortcut_path}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == '__main__':
    setup_startup()
