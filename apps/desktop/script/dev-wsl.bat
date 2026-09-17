@echo off
setlocal
cd /d "%~dp0.."

set "TAURI_APP_PATH=%CD%"
set "TAURI_FRONTEND_PATH=%CD%"
set "CARGO_TARGET_DIR=%CD%\target"

if not exist "node_modules\.bin\tsx.cmd" goto install_dependencies
if not exist "node_modules\@tauri-apps\cli\tauri.js" goto install_dependencies
goto dependencies_ready

:install_dependencies
echo Installing Windows-local Desktop dependencies...
call pnpm.cmd install
if errorlevel 1 goto dependency_install_failed

:dependencies_ready

call pnpm.cmd run dev -- --external-frontend
set "desktop_exit_code=%errorlevel%"
if not "%desktop_exit_code%"=="0" pause
exit /b %desktop_exit_code%

:dependency_install_failed
set "desktop_exit_code=%errorlevel%"
pause
exit /b %desktop_exit_code%
