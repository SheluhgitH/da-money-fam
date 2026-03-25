@echo off
echo Trying to install Git via winget (faster method)...

winget install --id Git.Git --exact --silent --accept-package-agreements --accept-source-agreements

if %errorlevel%==0 (
    echo.
    echo Git installed! Please close and reopen Command Prompt, then run git-push.bat
) else (
    echo.
    echo Winget failed. Run install-git.bat instead to download manually.
)

pause