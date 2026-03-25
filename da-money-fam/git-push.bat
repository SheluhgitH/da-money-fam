@echo off
cd /d "C:\Users\Pharp\Desktop\DMF APPS\Site 2\da-money-fam"

echo Initializing git...
git init

echo.
echo Setting remote origin...
git remote add origin https://github.com/SheluhgitH/Site-2.git

echo.
echo Checking status...
git status

echo.
echo Staging all changes...
git add .

echo.
echo Enter commit message (press Enter for default):
set /p msg=
if "%msg%"=="" set msg="Add artist galleries with new images"

git commit -m "%msg%"

echo.
echo Pushing to GitHub...
git push -u origin main || git push -u origin master

echo.
echo Done!
pause