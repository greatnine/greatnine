@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.  
echo ========================================
echo   Build : generate stories-data  "data.js"
echo   Show  : index.html
echo ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not detected.
    echo         Install from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

if not exist "stories\" (
    echo [ERROR] dist\stories\ directory not found.
    pause
    exit /b 1
)

:: stories-check
if not exist "check.py" (
    echo [ERROR] stories-manifest.py not found.
    pause
    exit /b 1
)

if not exist "index.html" (
    echo [ERROR] dist\index.html not found.
    pause
    exit /b 1
)

echo [1/2] Scanning stories\ ...
python "%~dp0check.py"
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to data.js.
    pause
    exit /b 1
)

echo.
echo [2/2] Opening index.html ...
start "" "%~dp0index.html"

echo.
echo [OK] Done!
echo.
timeout /t 1 >nul
