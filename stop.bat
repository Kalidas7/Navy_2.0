@echo off
setlocal enabledelayedexpansion
rem ===========================================================================
rem  stop.bat - stop the frontend + backend started by start.bat.
rem
rem      stop
rem
rem  Finds whatever is listening on the app's two ports (5173 = Vite frontend,
rem  8000 = Django backend) and terminates it, then closes the two server
rem  console windows start.bat opened. The Windows equivalent of stop.sh's
rem  lsof-based port scan.
rem ===========================================================================

set "STOPPED=0"

call :kill_port 5173 frontend
call :kill_port 8000 backend

rem --- also close the titled console windows start.bat opened -----------------
taskkill /FI "WINDOWTITLE eq NDS-CMS backend*"  /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq NDS-CMS frontend*" /T /F >nul 2>&1

if "%STOPPED%"=="0" (
  echo ==^> Nothing was listening on ports 5173 or 8000.
)
echo ==^> Done.
endlocal
exit /b 0

rem ---------------------------------------------------------------------------
rem  :kill_port PORT LABEL  - kill every PID with a LISTENING socket on PORT.
rem ---------------------------------------------------------------------------
:kill_port
set "PORT=%~1"
set "LABEL=%~2"
for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /R /C:"LISTENING" ^| findstr /C:":%PORT% "') do (
  if not "%%P"=="0" (
    echo ==^> Stopping %LABEL% ^(PID %%P on port %PORT%^) ...
    taskkill /PID %%P /T /F >nul 2>&1
    set "STOPPED=1"
  )
)
exit /b 0
