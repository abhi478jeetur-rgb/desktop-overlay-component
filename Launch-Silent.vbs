Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "d:\Desktop\Desktop overlay component"
WshShell.Run "node_modules\electron\dist\electron.exe .", 0, False
