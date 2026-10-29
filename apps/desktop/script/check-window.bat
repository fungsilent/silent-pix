@echo off
setlocal
:check
cls
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-window.ps1"
echo Press any key to check again, or close this window to exit.
pause >nul
goto check
