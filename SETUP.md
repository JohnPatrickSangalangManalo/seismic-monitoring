# Setup Guide - PHIVOLCS Earthquake Tracker

## Quick Start

### Step 1: Install Frontend Dependencies
```bash
npm install
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

**Note:** Puppeteer installation may take a few minutes as it downloads Chromium browser.

### Step 3: Run the Application

You need **TWO terminal windows**:

#### Terminal 1 - Backend Server:
```bash
cd backend
npm run dev
```

You should see:
```
🚀 PHIVOLCS Scraper API running on http://localhost:3001
📡 Endpoint: http://localhost:3001/api/earthquakes
```

#### Terminal 2 - Frontend Server:
```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 4: Open Browser
Navigate to: `http://localhost:5173`

## Troubleshooting

### Backend Server Error

**Error: "Cannot connect to backend server"**
- Make sure the backend server is running in Terminal 1
- Check if port 3001 is available
- Try accessing `http://localhost:3001/health` in your browser

**Error: "Backend server error. The PHIVOLCS website might be temporarily unavailable"**
- The PHIVOLCS website might be down or slow
- Check your internet connection
- Try refreshing the data after a few seconds
- Check the backend console for detailed error messages

**Error: "Cannot find module" errors**
- Make sure you ran `npm install` in the `backend` folder
- Delete `node_modules` and `package-lock.json` in backend folder, then run `npm install` again

### No Earthquake Data

If no earthquakes are displayed:
1. Check the backend console logs - it will show what was found
2. The PHIVOLCS website structure may have changed
3. There might genuinely be no recent earthquakes
4. Try refreshing the data

### Puppeteer Installation Issues

If Puppeteer fails to install:
- Make sure you have a stable internet connection
- Puppeteer downloads Chromium (~170MB) which may take time
- On Windows, you might need Visual C++ Redistributable
- Try: `npm install puppeteer --ignore-scripts` then `npm install`

## Testing the Backend

Test if the backend is working:
```bash
curl http://localhost:3001/health
```

Or open in browser: `http://localhost:3001/health`

You should see:
```json
{"status":"ok","message":"PHIVOLCS Scraper API is running"}
```

## Project Structure

```
.
├── backend/              # Backend scraping service
│   ├── src/
│   │   ├── server.ts    # Express server
│   │   └── scraper.ts   # PHIVOLCS scraper
│   └── package.json
├── src/                  # Frontend React app
│   ├── components/
│   ├── services/
│   └── App.tsx
└── package.json
```

## Need Help?

1. Check backend console for detailed logs
2. Check browser console (F12) for frontend errors
3. Verify PHIVOLCS website is accessible: https://earthquake.phivolcs.dost.gov.ph/









