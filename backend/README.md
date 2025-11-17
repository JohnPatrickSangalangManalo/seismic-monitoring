# PHIVOLCS Scraper Backend

Backend service that scrapes earthquake data from the PHIVOLCS website (https://earthquake.phivolcs.dost.gov.ph/).

## Installation

```bash
cd backend
npm install
```

## Development

Run the server in development mode with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Production

Build and run:

```bash
npm run build
npm start
```

## API Endpoints

### GET /health
Health check endpoint.

### GET /api/earthquakes
Fetches earthquake data from PHIVOLCS website.

**Response:**
```json
[
  {
    "id": "phivolcs-0-0-1234567890-abc123",
    "magnitude": 4.5,
    "place": "10 km N of Manila",
    "time": 1234567890000,
    "longitude": 120.9842,
    "latitude": 14.5995,
    "depth": 10.5
  }
]
```

## Notes

- The scraper uses Puppeteer to load and parse the PHIVOLCS website
- Scraping may take 10-30 seconds depending on website load time
- Make sure to respect the website's terms of service and rate limits







