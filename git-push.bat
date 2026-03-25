@echo off
setlocal enabledelayedexpansion

:: DMF Proper Git Push Script
:: This script ensures the repository is initialized, remote is correct, and changes are pushed to GitHub.

cd /d "%~dp0"

echo [1/5] Checking Git installation...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Git not found in PATH. Checking common locations...
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "GIT_EXE=C:\Program Files (x86)\Git\cmd\git.exe"
    ) else (
        echo [ERROR] Git is not installed or not found. Please install Git from https://git-scm.com/
        pause
        exit /b 1
    )
) else (
    set "GIT_EXE=git"
)

echo [2/5] Checking repository status...
if not exist ".git" (
    echo Initializing new Git repository...
    "%GIT_EXE%" init
)

:: Ensure the correct remote is set
set "REMOTE_URL=https://github.com/sheluhgitH/da-money-fam.git"
"%GIT_EXE%" remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo Adding remote origin: %REMOTE_URL%
    "%GIT_EXE%" remote add origin %REMOTE_URL%
) else (
    echo Updating remote origin to: %REMOTE_URL%
    "%GIT_EXE%" remote set-url origin %REMOTE_URL%
)

echo [3/5] Staging changes...
"%GIT_EXE%" add .

echo.
echo [4/5] Preparing commit...
set /p commit_msg="Enter commit message (default: Update site content): "
if "!commit_msg!"=="" set "commit_msg=Update site content"

"%GIT_EXE%" commit -m "!commit_msg!"

echo.
echo [5/5] Pushing to GitHub...
echo Note: If this is your first push, you may be asked to sign in.
"%GIT_EXE%" push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo Pushing to 'main' failed, trying 'master'...
    "%GIT_EXE%" push -u origin master
)

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo SUCCESS: Changes pushed to GitHub!
    echo ==========================================
) else (
    echo.
    echo [ERROR] Push failed. Please check your internet connection or GitHub permissions.
)

pause