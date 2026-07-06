# How To Run (Windows)

Two ways to run the dashboard. Pick one.

---

## Way 1 — Easy (.bat file)

### First time only
1. Install **Python 3.10+** from python.org — tick **"Add python.exe to PATH"** during install.
2. Install **Node.js 18+ (LTS)** from nodejs.org.
3. Close and reopen Command Prompt.

### Run
- Double-click **`start.bat`**, or type in the project folder:
  ```
  start
  ```
- Localhost-only:
  ```
  start local
  ```

### Stop
- Double-click **`stop.bat`**, or type:
  ```
  stop
  ```

### Open the dashboard
- This PC: **http://localhost:5173**
- Another PC on the network: **http://<this-pc-ip>:5173** (find the IP with `ipconfig`; allow ports 5173 + 8000 in Windows Firewall).

---

## Way 2 — Manual (commands only)

### First time only

Install Python 3.10+ (tick "Add python.exe to PATH") and Node.js 18+ (LTS). Reopen Command Prompt.

Verify:
```
python --version
node --version
npm --version
```

Go to the project folder:
```
cd path\to\Navy_3d
```

Backend setup:
```
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Frontend setup:
```
cd ..\frontend
npm install
```

### Run every time

**Terminal 1 — backend** (leave open):
```
cd backend
.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

**Terminal 2 — frontend** (leave open):
```
cd frontend
npm run dev -- --host --port 5173
```

### Open the dashboard
- This PC: **http://localhost:5173**
- Another PC: **http://<this-pc-ip>:5173** (`ipconfig` for the IP; allow ports 5173 + 8000 in the firewall).

### Stop
- Press **Ctrl+C** in each terminal, or close both windows.

---

## What shows on Windows

**Real:** CPU usage, per-core, memory, swap, disk usage + I/O, network throughput, uptime, top processes, battery.

**Shows "---" / estimate / empty:** CPU temperature, fan RPM, measured power (shows "EST. POWER ~"), LOGS tab.
