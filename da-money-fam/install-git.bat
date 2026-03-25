@echo off
echo ========================================
echo     DMF APPS - Git Installation
echo ========================================
echo.

echo Downloading Git...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe' -OutFile '%USERPROFILE%\Downloads\Git-2.43.0-64-bit.exe'"

echo.
echo Running Git installer...
echo Please follow the installer steps:
echo   1. Click Next on Welcome screen
echo   2. Select "Git from the command line and also from 3rd-party software"
echo   3. Click Next until Install
echo   4. Click Install
echo.
start "" "%USERPROFILE%\Downloads\Git-2.43.0-64-bit.exe"

echo.
echo After installation, close this window and re-open Command Prompt
echo Then run: git-push.bat
pause