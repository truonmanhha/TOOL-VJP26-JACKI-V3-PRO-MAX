@echo off
chcp 65001 >nul
echo =======================================================
echo KHOI DONG TOOL NESTING V3 VOI SUC MANH CARD ROI TOI DA
echo =======================================================
echo.
echo [1/2] Dang be khoa gioi han GPU cua Windows...
reg add "HKCU\Software\Microsoft\DirectX\UserGpuPreferences" /v "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" /t REG_SZ /d "GpuPreference=2;" /f >nul
reg add "HKCU\Software\Microsoft\DirectX\UserGpuPreferences" /v "C:\Program Files\Google\Chrome\Application\chrome.exe" /t REG_SZ /d "GpuPreference=2;" /f >nul

echo [2/2] Dang kich hoat Trinh duyet va vuot tuong lua GPU...
:: Khởi chạy Edge với các cờ (flags) ép buộc sử dụng card đồ họa rời mạnh nhất
start msedge.exe --disable-gpu-driver-bug-workarounds --ignore-gpu-blocklist --use-angle=d3d11on12 "http://localhost:5173"

echo.
echo Hoan tat! Trinh duyet dang duoc mo len.
timeout /t 2 >nul
exit
