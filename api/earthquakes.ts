import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';
import { load } from 'cheerio';

export const config = {
  runtime: 'nodejs18.x',
  maxDuration: 60,
};

// Helper function to parse date strings
function parseDate(dateStr: string, timeStr: string): number {
  try {
    const formats = [
      `${dateStr} ${timeStr}`,
      dateStr.replace(/\//g, '-'),
      dateStr,
    ];

    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }

    if (timeStr) {
      const combined = `${dateStr}T${timeStr}`;
      const date = new Date(combined);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }

    return Date.now();
  } catch {
    return Date.now();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let browser = null;

  try {
    console.log('🚀 Starting PHIVOLCS scraper on Vercel...');

    // Get executable path from chrome-aws-lambda
    const executablePath = await chromium.executablePath;
    console.log('🔍 Chrome executable path:', executablePath);

    // Launch browser with chrome-aws-lambda
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    console.log('✅ Browser launched successfully');

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to PHIVOLCS
    console.log('📍 Navigating to PHIVOLCS website...');
    await page.goto('https://earthquake.phivolcs.dost.gov.ph/', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract HTML
    const html = await page.content();
    console.log(`✅ Page content extracted (${html.length} characters)`);

    // Parse with cheerio
    const $ = load(html);
    const earthquakes: any[] = [];

    // Parse tables
    const tables = $('table');
    console.log(`Found ${tables.length} table(s)`);

    tables.each((tableIndex, table) => {
      const rows = $(table).find('tr');

      rows.each((rowIndex, row) => {
        if (rowIndex === 0) return; // Skip header

        const cells = $(row).find('td');
        if (cells.length < 6) return;

        try {
          const dateCell = $(cells[0]).text().trim();
          const timeCell = $(cells[1]).text().trim();
          const latCell = $(cells[2]).text().trim();
          const lonCell = $(cells[3]).text().trim();
          const depthCell = $(cells[4]).text().trim();
          const magCell = $(cells[5]).text().trim();
          const placeCell = cells.length > 6 ? $(cells[6]).text().trim() : 'Unknown';

          const latitude = parseFloat(latCell);
          const longitude = parseFloat(lonCell);
          const depth = parseFloat(depthCell);
          const magnitude = parseFloat(magCell);
          const time = parseDate(dateCell, timeCell);

          if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(magnitude)) {
            earthquakes.push({
              id: `${dateCell}-${timeCell}-${latitude}-${longitude}`,
              magnitude,
              place: placeCell || 'Unknown Location',
              time,
              longitude,
              latitude,
              depth: isNaN(depth) ? 0 : depth,
              url: '',
              detail: '',
            });
          }
        } catch (err) {
          console.error('Error parsing row:', err);
        }
      });
    });

    await browser.close();
    browser = null;

    console.log(`✅ Scraped ${earthquakes.length} earthquakes`);
    res.status(200).json(earthquakes);
  } catch (error) {
    console.error('❌ Error scraping PHIVOLCS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      error: 'Failed to fetch earthquake data',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing browser:', err);
      }
    }
  }
}
