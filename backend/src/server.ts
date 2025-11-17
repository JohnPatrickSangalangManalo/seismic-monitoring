import express from 'express';
import cors from 'cors';
import { scrapePHIVOLCS } from './scraper.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PHIVOLCS Scraper API is running' });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Debug endpoint to see raw HTML
app.get('/api/debug/html', async (req, res) => {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://earthquake.phivolcs.dost.gov.ph/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const html = await page.content();
    const text = await page.evaluate(() => {
      // @ts-ignore
      return document.body.innerText;
    });
    
    await browser.close();
    
    res.json({
      htmlLength: html.length,
      htmlSample: html.substring(0, 5000),
      textSample: text.substring(0, 2000),
      url: 'https://earthquake.phivolcs.dost.gov.ph/'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch HTML',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API endpoint to get earthquakes
app.get('/api/earthquakes', async (req, res) => {
  // Set a longer timeout for this endpoint (3 minutes)
  req.setTimeout(180000); // 3 minutes
  res.setTimeout(180000);
  
  try {
    console.log('📥 Request received: Fetching earthquake data from PHIVOLCS...');
    const startTime = Date.now();
    
    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Scraping operation timed out after 3 minutes. The PHIVOLCS website may be slow or unresponsive.'));
      }, 180000); // 3 minutes
    });
    
    const earthquakes = await Promise.race([
      scrapePHIVOLCS(),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof scrapePHIVOLCS>>;
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Successfully fetched ${earthquakes.length} earthquakes in ${duration}ms`);
    
    // Return empty array if no data found (not an error)
    res.json(earthquakes);
  } catch (error) {
    console.error('❌ Error fetching earthquake data:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });
    
    // Don't send response if headers already sent
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch earthquake data',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      });
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 PHIVOLCS Scraper API running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/earthquakes`);
});

