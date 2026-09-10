@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0link-wsl.ps1" %*
set "desktop_exit_code=%errorlevel%"
if not "%desktop_exit_code%"=="0" pause
exit /b %desktop_exit_code%
