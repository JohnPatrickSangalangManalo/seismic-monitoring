# PHIVOLCS - Earthquake Tracker

A modern web application built with React, TypeScript, and Vite that displays real-time earthquake data from PHIVOLCS on an interactive map and list view.

## Features

- 🗺️ **Interactive Map**: View earthquakes on a map with color-coded markers based on magnitude
- 📋 **Earthquake List**: Browse recent earthquakes with detailed information
- 🔄 **Real-time Data**: Fetches latest earthquake data from PHIVOLCS website via web scraping
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful and intuitive user interface

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive maps
- **React-Leaflet** - React bindings for Leaflet
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **Puppeteer** - Web scraping tool
- **TypeScript** - Type safety

## Installation

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

## Running the Application

### Development Mode

You need to run both the backend and frontend servers:

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

**Terminal 2 - Frontend Server:**
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

Open your browser and navigate to `http://localhost:5173`

## Building for Production

### Frontend
```bash
npm run build
```

The built files will be in the `dist` directory.

### Backend
```bash
cd backend
npm run build
npm start
```

## Data Source

The application scrapes earthquake data directly from the PHIVOLCS website:
- **Source**: https://earthquake.phivolcs.dost.gov.ph/
- **Method**: Web scraping using Puppeteer
- **Backend API**: Node.js/Express server that handles the scraping

The backend service:
1. Uses Puppeteer to load the PHIVOLCS website
2. Extracts earthquake data from the HTML tables
3. Returns the data as JSON via REST API
4. Frontend fetches data from the backend API

## Project Structure

```
.
├── backend/                 # Backend scraping service
│   ├── src/
│   │   ├── server.ts       # Express server
│   │   └── scraper.ts      # PHIVOLCS scraper logic
│   └── package.json
├── src/                     # Frontend React app
│   ├── components/
│   │   ├── EarthquakeMap.tsx
│   │   └── EarthquakeList.tsx
│   ├── services/
│   │   └── earthquakeService.ts
│   └── App.tsx
└── package.json
```

## Troubleshooting

### Backend Connection Error

If you see "Cannot connect to backend server":
1. Make sure the backend server is running (`cd backend && npm run dev`)
2. Check that port 3001 is not being used by another application
3. Verify the backend is accessible at `http://localhost:3001/health`

### No Earthquake Data

If no earthquakes are displayed:
1. Check the backend console for scraping errors
2. The PHIVOLCS website might be temporarily unavailable
3. The website structure might have changed (scraper may need updates)

## License

MIT

