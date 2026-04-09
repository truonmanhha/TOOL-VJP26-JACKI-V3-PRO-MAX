@echo off
chcp 65001 >nul
TITLE Khoi Dong Tool Nesting V3 - Kiem Tra GPU

echo =======================================================
echo HE THONG KIEM TRA VA KICH HOAT CARD ROI (RTX/AMD)
echo =======================================================
echo.

set REG_KEY="HKCU\Software\Microsoft\DirectX\UserGpuPreferences"
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
set NEED_RESTART=0

:: Kiem tra Registry cua Edge
reg query %REG_KEY% /v %EDGE_PATH% 2>nul | find "GpuPreference=2;" >nul
if %errorlevel% neq 0 (
    echo [!] Phat hien Edge chua duoc cap quyen dung Card Roi. Dang mo khoa...
    reg add %REG_KEY% /v %EDGE_PATH% /t REG_SZ /d "GpuPreference=2;" /f >nul
    set NEED_RESTART=1
) else (
    echo [OK] Edge da duoc cap quyen truoc do. Bo qua.
)

:: Kiem tra Registry cua Chrome
reg query %REG_KEY% /v %CHROME_PATH% 2>nul | find "GpuPreference=2;" >nul
if %errorlevel% neq 0 (
    echo [!] Phat hien Chrome chua duoc cap quyen dung Card Roi. Dang mo khoa...
    reg add %REG_KEY% /v %CHROME_PATH% /t REG_SZ /d "GpuPreference=2;" /f >nul
    set NEED_RESTART=1
) else (
    echo [OK] Chrome da duoc cap quyen truoc do. Bo qua.
)

echo.
if %NEED_RESTART% equ 1 (
    echo [!] Vi moi cap quyen nen dang dong tat ca trinh duyet an de cap nhat...
    taskkill /F /IM msedge.exe /T 2>nul
    taskkill /F /IM chrome.exe /T 2>nul
    timeout /t 1 >nul
)

echo.
echo [!] DANG KHOI CHAY TOOL VOI CONG SUAT TOI DA...
:: Chạy thẳng vào Tool qua Chrome hoặc Edge với cờ ép buộc phần cứng
start msedge.exe --disable-gpu-driver-bug-workarounds --ignore-gpu-blocklist --use-angle=d3d11on12 "http://localhost:5173" 2>nul || start chrome.exe --disable-gpu-driver-bug-workarounds --ignore-gpu-blocklist --use-angle=d3d11on12 "http://localhost:5173"

exit
