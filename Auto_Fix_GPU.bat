@echo off
chcp 65001 >nul
echo =======================================================
echo TOOL TU DONG KICH HOAT CARD ROI (RTX 3050) CHO TRINH DUYET
echo =======================================================
echo.
echo Website bị giới hạn bảo mật nên không thể tự bật card đồ họa của máy tính.
echo Tool này sẽ tự động thay đổi Registry của Windows để ép Edge/Chrome luôn dùng Card rời.
echo.

set REG_KEY="HKCU\Software\Microsoft\DirectX\UserGpuPreferences"

echo [1/2] Dang thiet lap cho Microsoft Edge...
reg add %REG_KEY% /v "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" /t REG_SZ /d "GpuPreference=2;" /f >nul
if %errorlevel% equ 0 (echo   -^> Thanh cong!) else (echo   -^> That bai!)

echo [2/2] Dang thiet lap cho Google Chrome...
reg add %REG_KEY% /v "C:\Program Files\Google\Chrome\Application\chrome.exe" /t REG_SZ /d "GpuPreference=2;" /f >nul
if %errorlevel% equ 0 (echo   -^> Thanh cong!) else (echo   -^> That bai!)

echo.
echo =======================================================
echo XONG! DE AP DUNG, BAN HAY LAM TIEP 1 BUOC:
echo 1. Bam Ctrl + Shift + Esc de mo Task Manager.
echo 2. Tim Microsoft Edge (hoac Chrome), chuot phai chon "End Task".
echo 3. Mo lai trinh duyet va vao Tool.
echo =======================================================
pause
