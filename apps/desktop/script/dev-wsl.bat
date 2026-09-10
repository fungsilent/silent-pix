@echo off
setlocal
cd /d "%~dp0.."

if not exist "tauri.conf.json" (
    echo Tauri project not found. Place this script in the desktop script folder.
    pause
    exit /b 1
)

if not exist "tauri.wsl.conf.json" (
    > "tauri.wsl.conf.json" echo {"build":{"beforeDevCommand":"","devUrl":"http://127.0.0.1:1420"}}
    if errorlevel 1 (
        echo Failed to create WSL configuration.
        pause
        exit /b 1
    )
)

set "TAURI_APP_PATH=%CD%"
set "TAURI_FRONTEND_PATH=%CD%"
set "CARGO_TARGET_DIR=%CD%\target"

call pnpm.cmd tauri dev --config tauri.wsl.conf.json
set "desktop_exit_code=%errorlevel%"
if not "%desktop_exit_code%"=="0" pause
exit /b %desktop_exit_code%
