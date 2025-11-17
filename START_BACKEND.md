# How to Start the Backend Server

## Quick Start

### Option 1: Using npm (Recommended)
```bash
cd backend
npm run dev
```

### Option 2: Using the batch file (Windows)
Double-click `backend/start.bat`

### Option 3: Using PowerShell
```powershell
cd backend
npm run dev
```

## What to Expect

When the backend starts successfully, you should see:
```
🚀 PHIVOLCS Scraper API running on http://localhost:3001
📡 Endpoint: http://localhost:3001/api/earthquakes
```

## Verify Backend is Running

Open in browser: `http://localhost:3001/health`

You should see:
```json
{"status":"ok","message":"PHIVOLCS Scraper API is running"}
```

## Troubleshooting

### Port 3001 already in use
If you get an error about port 3001 being in use:
1. Find and close the process using port 3001
2. Or change the port in `backend/src/server.ts` (line 92)

### Backend keeps stopping
- Make sure you're running it in a separate terminal window
- Don't close the terminal while the backend is running
- Check for errors in the console

### Dependencies not installed
```bash
cd backend
npm install
```

## Keep Backend Running

**IMPORTANT:** The backend server must be running for the frontend to work!

- Keep the terminal window open
- Don't close it while using the application
- If it stops, restart it using the commands above







