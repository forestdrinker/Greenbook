@echo off
echo ========================================
echo       Updating Word Flashcards (GitHub)
echo ========================================

echo.
echo 1. Updating words from Excel (单词数据.xlsx)...
python convert_to_json.py

echo.
echo 2. Committing changes to Git...
git add .
set /p commit_msg="Enter commit message (default: Update words): "
if "%commit_msg%"=="" set commit_msg=Update words
git commit -m "%commit_msg%"

echo.
echo 3. Pushing to GitHub (origin)...
echo (If this fails, please turn on your VPN/Proxy)
git push origin master

echo.
echo 4. Pushing to Gitee (gitee)...
git push gitee master

echo.
echo ========================================
echo       Deployment Complete!
echo ========================================
echo GitHub: https://CodeLark08042.github.io/english-book/
echo Gitee:  https://happy-08042.gitee.io/english-book/
echo.
pause
