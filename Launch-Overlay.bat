@echo off
title Launching Ambient Focus Companion...
cd /d "%~dp0"
start "" node_modules\electron\dist\electron.exe .
exit
