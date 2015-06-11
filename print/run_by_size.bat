@echo off
set /p size=Enter the Size:
c:\\python27.32b\\python.exe %~dp0\\dropfiles.py "%~f1" %size%
echo Press any key to exit
pause > nul
