@echo off
setlocal enabledelayedexpansion

set "REAL_7ZA=E:\excalidraw-desktop\node_modules\7zip-bin\win\x64\7za.exe"
set "args=%*"
set "args=!args:-snld =!"
set "args=!args:-snld=!"

"!REAL_7ZA!" !args!
set "EXIT_CODE=%ERRORLEVEL%"
if %EXIT_CODE% EQU 2 exit /b 0
exit /b %EXIT_CODE%
