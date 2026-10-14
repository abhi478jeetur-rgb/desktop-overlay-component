# Monitor active window and check for social / video distractions (YouTube, Facebook, Instagram, Twitter, Netflix, etc.)
import win32gui
import win32process
import psutil
import json
import sys
import time

DISTRACTION_KEYWORDS = [
    'youtube', 'facebook', 'instagram', 'twitter', 'x.com',
    'reddit', 'tiktok', 'netflix', 'reels', 'shorts',
    'twitch', 'prime video', 'hotstar'
]

def get_active_window_info():
    try:
        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return {"title": "", "process": "", "is_distracted": False}
        title = win32gui.GetWindowText(hwnd).strip()
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        proc_name = ""
        try:
            p = psutil.Process(pid)
            proc_name = p.name().lower()
        except Exception:
            pass

        title_lower = title.lower()
        is_distracted = False
        matching_keyword = ""

        # Check if browser process or window title matches distraction keywords
        for kw in DISTRACTION_KEYWORDS:
            if kw in title_lower:
                is_distracted = True
                matching_keyword = kw
                break

        return {
            "title": title,
            "process": proc_name,
            "is_distracted": is_distracted,
            "keyword": matching_keyword
        }
    except Exception as e:
        return {"title": "", "process": "", "is_distracted": False, "error": str(e)}

if __name__ == '__main__':
    info = get_active_window_info()
    print(json.dumps(info))
