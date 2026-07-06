@echo off
setlocal enabledelayedexpansion
rem ===========================================================================
rem  start.bat - ONE command to host the whole app on a Windows PC.
rem
rem      start            (LAN mode: other PCs on the network can view it)
rem      start local      (localhost-only; nothing exposed to the network)
rem
rem  On a fresh machine this will, with no other setup:
rem    1. Create the Python virtualenv + install backend deps (first run only).
rem    2. Install frontend deps via npm (first run only).
rem    3. Start the Django backend  (this PC's real metrics via psutil).
rem    4. Start the Vite frontend    (the dashboard UI).
rem
rem  The dashboard always shows THIS computer's stats. On Windows, CPU / memory /
rem  disk / network / battery are REAL; temperature, fans, measured power, and the
rem  logs feed are Linux-only sensors and will show "---". Run stop.bat to stop.
rem ===========================================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

rem --- bind address: LAN is the default; "start local" = localhost-only --------
if /I "%~1"=="local" (
  set "DJANGO_BIND=127.0.0.1:8000"
  set "HOST_FLAG="
  set "LAN_IP=localhost"
  echo ==^> Localhost-only mode.
) else (
  set "DJANGO_BIND=0.0.0.0:8000"
  set "HOST_FLAG=--host"
  set "DJANGO_ALLOWED_HOSTS=*"
  for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    if not defined LAN_IP set "LAN_IP=%%I"
  )
  if defined LAN_IP set "LAN_IP=!LAN_IP: =!"
  if not defined LAN_IP set "LAN_IP=localhost"
  echo ==^> LAN mode: hosting on all network interfaces.
)

rem --- pick a python interpreter ----------------------------------------------
set "PY="
where python >nul 2>&1 && set "PY=python"
if not defined PY (
  where py >nul 2>&1 && set "PY=py -3"
)
if not defined PY (
  echo ERROR: Python is not installed. Install Python 3.10+ and re-run.>&2
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm ^(Node.js^) is not installed. Install Node.js 18+ and re-run.>&2
  exit /b 1
)

rem --- first-run setup: backend venv + deps -----------------------------------
set "VENV_PY=%BACKEND%\.venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
  echo ==^> First run: creating Python virtualenv + installing backend deps ...
  %PY% -m venv "%BACKEND%\.venv"
  if errorlevel 1 (
    echo ERROR: failed to create the Python virtualenv.>&2
    exit /b 1
  )
  "%VENV_PY%" -m pip install --quiet --upgrade pip
  "%VENV_PY%" -m pip install --quiet -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo ERROR: failed to install backend Python dependencies.>&2
    exit /b 1
  )
)

rem --- repair: deps present but Django missing (e.g. partial first run) --------
"%VENV_PY%" -c "import django" >nul 2>&1
if errorlevel 1 (
  echo ==^> Repairing backend environment: installing Python dependencies ...
  "%VENV_PY%" -m pip install --quiet --upgrade pip
  "%VENV_PY%" -m pip install --quiet -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo ERROR: failed to install backend Python dependencies.>&2
    exit /b 1
  )
)

rem --- first-run setup: frontend deps -----------------------------------------
if not exist "%FRONTEND%\node_modules" (
  echo ==^> First run: installing frontend deps ^(npm install^) ...
  pushd "%FRONTEND%"
  call npm install
  popd
  if errorlevel 1 (
    echo ERROR: npm install failed.>&2
    exit /b 1
  )
)

rem --- start backend ----------------------------------------------------------
echo ==^> Starting backend on http://%DJANGO_BIND% ...
start "NDS-CMS backend" cmd /k "cd /d "%BACKEND%" && set DJANGO_ALLOWED_HOSTS=%DJANGO_ALLOWED_HOSTS% && "%VENV_PY%" manage.py runserver %DJANGO_BIND%"

rem --- start frontend ---------------------------------------------------------
echo ==^> Starting frontend on http://%LAN_IP%:5173 ...
start "NDS-CMS frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev -- %HOST_FLAG% --port 5173"

echo.
echo -------------------------------------------------------------------
echo   Dashboard:  http://%LAN_IP%:5173
if /I not "%~1"=="local" (
  echo   From other PCs on this network, open the SAME URL above.
  echo   ^(If they can't connect, allow ports 5173 + 8000 in this PC's firewall.^)
)
echo   Shows THIS computer's live stats.
echo   Two console windows opened ^(backend + frontend^). Run stop.bat to stop both.
echo -------------------------------------------------------------------

endlocal
