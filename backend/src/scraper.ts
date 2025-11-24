import puppeteer, { Browser } from "puppeteer";
import * as cheerio from "cheerio";

export interface PHIVOLCSEarthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  longitude: number;
  latitude: number;
  depth: number;
  url?: string;
  detail?: string;
}

// Helper function to parse date strings in various formats
function parseDate(dateStr: string, timeStr: string): number {
  try {
    // PHIVOLCS format: "16 November 2025 - 02:35 PM" or "16 November 2025" with separate time
    // First, try to parse the combined format if dateStr contains " - "
    if (dateStr.includes(' - ')) {
      const parts = dateStr.split(' - ');
      if (parts.length === 2) {
        const datePart = parts[0].trim(); // "16 November 2025"
        const timePart = parts[1].trim(); // "02:35 PM"
        const combined = `${datePart} ${timePart}`;
        const date = new Date(combined);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
    }

    // Try different date formats
    const formats = [
      `${dateStr} ${timeStr}`, // Direct combination: "16 November 2025 02:35 PM"
      dateStr.replace(/\//g, '-'), // Replace slashes with dashes
      dateStr,
    ];

    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }

    // Try parsing with ISO format
    if (timeStr) {
      // Try "16 November 2025T02:35 PM" format
      const combined = `${dateStr}T${timeStr}`;
      const date = new Date(combined);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
      
      // Try with space instead of T
      const combined2 = `${dateStr} ${timeStr}`;
      const date2 = new Date(combined2);
      if (!isNaN(date2.getTime())) {
        return date2.getTime();
      }
    }

    // If all else fails, return current time (but log a warning)
    console.warn(`⚠️  Could not parse date: "${dateStr}" with time: "${timeStr}", using current time`);
    return Date.now();
  } catch (error) {
    console.warn(`⚠️  Error parsing date: "${dateStr}" with time: "${timeStr}":`, error);
    return Date.now();
  }
}

export async function scrapePHIVOLCS(year?: number, month?: number): Promise<PHIVOLCSEarthquake[]> {
  let browser: Browser | null = null;
  
  try {
    console.log('🚀 Starting PHIVOLCS scraper...');
    
    // Build URL based on parameters
    let targetUrl = 'https://earthquake.phivolcs.dost.gov.ph/';
    if (year && month) {
      const monthName = new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' });
      targetUrl = `https://earthquake.phivolcs.dost.gov.ph/EQLatest-Monthly/${year}/${year}_${monthName}.html`;
      console.log(`📅 Fetching earthquakes for ${monthName} ${year} from: ${targetUrl}`);
    } else {
      console.log('📅 Fetching latest earthquakes (default)');
    }
    
    console.log('Launching browser...');
    
    try {
      // Launch options for both local and cloud environments
      const launchOptions: any = {
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--no-proxy-server',
          '--disable-web-security',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-default-apps',
          '--disable-features=TranslateUI',
          '--disable-hang-monitor',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain'
        ]
      };

      // Try to launch; if it fails attempt a best-effort recovery:
      try {
        browser = await puppeteer.launch(launchOptions);
        console.log('✅ Browser launched successfully');
      } catch (launchError) {
        console.error('❌ Initial Puppeteer launch failed:', launchError instanceof Error ? launchError.message : launchError);
        // Log the default executable path Puppeteer knows about (if any)
        try {
          const defaultPath = puppeteer.executablePath();
          console.log('🔍 puppeteer.executablePath() =', defaultPath);
        } catch (e) {
          console.log('🔍 Could not read puppeteer.executablePath()');
        }

        // 1) If there's an env var override, try that
        const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
        if (envPath) {
          console.log('🔁 Trying PUPPETEER_EXECUTABLE_PATH:', envPath);
          try {
            browser = await puppeteer.launch({ ...launchOptions, executablePath: envPath });
            console.log('✅ Browser launched with PUPPETEER_EXECUTABLE_PATH');
          } catch (envErr) {
            console.error('❌ Launch with PUPPETEER_EXECUTABLE_PATH failed:', envErr instanceof Error ? envErr.message : envErr);
          }
        }

        // 2) Try to run puppeteer's install script (downloads Chromium) then retry
        if (!browser) {
          try {
            console.log('🔁 Attempting to run Puppeteer install script to download Chromium...');
            const { execSync } = await import('child_process');
            // run install script (best-effort). Allow failure without crashing here.
            execSync('node ./node_modules/puppeteer/install.js', { stdio: 'inherit' });
            console.log('🔁 Puppeteer install script finished, retrying launch...');
            browser = await puppeteer.launch(launchOptions);
            console.log('✅ Browser launched after running install script');
          } catch (installErr) {
            console.error('❌ Puppeteer install / retry failed:', installErr instanceof Error ? installErr.message : installErr);
          }
        }

        // 3) If still no browser, throw a clear error so caller knows remediation steps
        if (!browser) {
          throw new Error('Puppeteer failed to launch. Ensure Chromium is available: run `npm install` in backend (which runs Puppeteer postinstall), or set PUPPETEER_EXECUTABLE_PATH to a valid Chrome/Chromium binary. Check server logs for details.');
        }
      }
    } catch (launchError) {
      console.error('❌ Failed to launch browser:', launchError);
      const errorMessage = launchError instanceof Error ? launchError.message : 'Unknown error';
      const errorStack = launchError instanceof Error ? launchError.stack : 'No stack trace';
      
      console.error('Launch error details:', {
        message: errorMessage,
        stack: errorStack,
        platform: process.platform,
        nodeVersion: process.version
      });
      
      // Provide more helpful error messages
      if (errorMessage.includes('Executable doesn\'t exist') || errorMessage.includes('Could not find')) {
        throw new Error('Puppeteer Chromium not found. Please run "npm install" in the backend directory to download Chromium, or install Chrome/Chromium manually.');
      } else if (errorMessage.includes('spawn') || errorMessage.includes('ENOENT')) {
        throw new Error('Cannot find browser executable. Please ensure Chromium is installed. Try running "npm install" in the backend directory.');
      } else {
        throw new Error(`Failed to launch browser: ${errorMessage}. This might be a system configuration issue. Check backend console for details.`);
      }
    }

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      // @ts-ignore - navigator is available in browser context
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    // Set up error handlers (before navigation)
    page.on('error', (error) => {
      console.log('⚠️  Page error (non-fatal):', error.message);
    });
    
    page.on('pageerror', (error) => {
      console.log('⚠️  Page script error (non-fatal):', error.message);
    });

    console.log('🌐 Navigating to PHIVOLCS website...');
    
    let response;
    try {
      response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 90000 // Increased timeout
      });
    } catch (navError) {
      const errorMsg = navError instanceof Error ? navError.message : 'Unknown error';
      console.error('⚠️  Navigation error:', errorMsg);
      
      // Check if it's a proxy error
      if (errorMsg.includes('proxy') || errorMsg.includes('PROXY') || errorMsg.includes('net::ERR_PROXY')) {
        console.log('💡 Proxy error detected. Trying alternative approach...');
        // Try without request interception
        try {
          response = await page.goto('https://earthquake.phivolcs.dost.gov.ph/', {
            waitUntil: 'load',
            timeout: 90000
          });
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          throw new Error(`Proxy error: Cannot connect to PHIVOLCS website. Please check your network/proxy settings.`);
        }
      } else {
        // For other errors, try to continue anyway
        response = null;
      }
    }

    if (response && response.status() && response.status() !== 200) {
      console.log(`⚠️  Page returned status ${response.status()}, but continuing anyway...`);
    }

    console.log('✅ Page loaded successfully');
    
    // Wait for content to load (especially if it's JavaScript-rendered)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to wait for common selectors
    try {
      await page.waitForSelector('table, .earthquake, [class*="earthquake"], [id*="earthquake"]', { timeout: 10000 });
      console.log('✅ Found earthquake-related elements');
    } catch (e) {
      console.log('⚠️  No specific earthquake selectors found, continuing with general parsing...');
    }

    // Get page HTML for parsing
    console.log('📄 Extracting page content...');
    let html: string;
    let $: any;
    
    try {
      html = await page.content();
      console.log(`✅ Page content extracted (${html.length} characters)`);
      
      // Log a sample of the HTML for debugging (first 2000 chars)
      console.log('📋 HTML sample (first 2000 chars):', html.substring(0, 2000));
      
      $ = cheerio.load(html);
    } catch (contentError) {
      console.error('❌ Failed to extract page content:', contentError);
      throw new Error(`Failed to extract page content: ${contentError instanceof Error ? contentError.message : 'Unknown error'}`);
    }
    
    const earthquakes: PHIVOLCSEarthquake[] = [];
    
    // Method 1: Parse tables
    console.log('🔍 Method 1: Parsing tables...');
    const tables = $('table');
    console.log(`Found ${tables.length} table(s)`);
    
    // Also check for div-based layouts
    const divsWithData = $('div').filter((i, el) => {
      const text = $(el).text();
      return /magnitude|earthquake|quake|lat|lon|depth/i.test(text) && 
             /\d+\.\d+/.test(text); // Has numbers (likely magnitude/coordinates)
    });
    console.log(`Found ${divsWithData.length} div(s) with potential earthquake data`);
    
    tables.each((tableIndex, table) => {
      const rows = $(table).find('tr');
      console.log(`  Table ${tableIndex + 1}: ${rows.length} rows`);
      
      // Log first few rows for debugging
      if (rows.length > 0) {
        const firstRow = $(rows[0]);
        const firstRowCells = firstRow.find('td, th').map((_, cell) => $(cell).text().trim()).get();
        console.log(`    First row (header?) cells (${firstRowCells.length}):`, firstRowCells.slice(0, 10));
        
        // Log a few data rows too (skip first row as it might be header)
        const dataRowsToLog = Math.min(3, rows.length - 1);
        for (let i = 1; i <= dataRowsToLog; i++) {
          const dataRow = $(rows[i]);
          const dataCells = dataRow.find('td').map((_, cell) => $(cell).text().trim()).get();
          if (dataCells.length >= 6) {
            console.log(`    Sample data row ${i} (${dataCells.length} cells):`, dataCells.slice(0, 6).map(c => c.length > 30 ? c.substring(0, 30) + '...' : c));
          }
        }
      }
      
      rows.each((rowIndex, row) => {
        const cells = $(row).find('td, th');
        const cellTexts = cells.map((_, cell) => $(cell).text().trim()).get();
        
        // Skip header rows (usually have th elements or specific text)
        const isHeader = $(row).find('th').length > 0 || 
                        cellTexts.some(text => 
                          /date|time|magnitude|location|latitude|longitude|depth|header|seismological|observation/i.test(text)
                        );
        
        // Need at least 6 cells for the PHIVOLCS format
        if (isHeader || cells.length < 6) {
          if (cells.length > 0 && !isHeader) {
            console.log(`    ⚠️  Skipping row ${rowIndex}: Only ${cells.length} cells (need at least 6). Cells:`, cellTexts.slice(0, 3));
          }
          return;
        }
        
        // Try to extract data
        try {
          let dateStr = '';
          let timeStr = '';
          let magnitude = 0;
          let latitude = 0;
          let longitude = 0;
          let depth = 0;
          let place = '';

          // Try different column arrangements
          // Look for magnitude in any cell first
          for (let i = 0; i < cellTexts.length; i++) {
            const text = cellTexts[i];
            const mag = parseFloat(text);
            if (!isNaN(mag) && mag > 0 && mag < 10) {
              magnitude = mag;
              // Try to infer other data based on position
              if (i > 0) {
                dateStr = cellTexts[0] || '';
                timeStr = cellTexts[1] || '';
              }
              break;
            }
          }
          
          // Try different column arrangements
          // PHIVOLCS format: Date/Time | Latitude | Longitude | Depth | Magnitude | Location
          // Example: "16 November 2025 - 02:35 PM	06.34	126.35	048	4.1	046 km S 42° E of Governor Generoso"
          
          if (cellTexts.length >= 6) {
            // Format 1: Date/Time combined, Lat, Lon, Depth, Magnitude, Location
            // Check if first cell contains date and time together
            const firstCell = cellTexts[0];
            if (firstCell.includes('November') || firstCell.includes('January') || firstCell.includes('February') || 
                firstCell.includes('March') || firstCell.includes('April') || firstCell.includes('May') ||
                firstCell.includes('June') || firstCell.includes('July') || firstCell.includes('August') ||
                firstCell.includes('September') || firstCell.includes('October') || firstCell.includes('December') ||
                firstCell.match(/\d{4}/)) {
              // Date and time are in first cell
              // Format: "16 November 2025 - 02:35 PM"
              const dashIndex = firstCell.indexOf(' - ');
              if (dashIndex > 0) {
                dateStr = firstCell.substring(0, dashIndex).trim(); // "16 November 2025"
                timeStr = firstCell.substring(dashIndex + 3).trim(); // "02:35 PM"
              } else {
                // Try splitting by spaces
                const parts = firstCell.split(/\s+/);
                if (parts.length >= 4) {
                  dateStr = parts.slice(0, 3).join(' '); // Date
                  timeStr = parts.slice(3).join(' '); // Time
                } else {
                  dateStr = firstCell;
                  timeStr = '';
                }
              }
              
              // Columns: 0=Date/Time, 1=Lat, 2=Lon, 3=Depth, 4=Magnitude, 5=Location
              // Handle leading zeros in coordinates (e.g., "06.34" -> 6.34)
              latitude = parseFloat(cellTexts[1].replace(/^0+/, '')) || parseFloat(cellTexts[1]);
              longitude = parseFloat(cellTexts[2].replace(/^0+/, '')) || parseFloat(cellTexts[2]);
              // Depth might have leading zeros (e.g., "048" -> 48)
              depth = parseFloat(cellTexts[3].replace(/^0+/, '')) || parseFloat(cellTexts[3]);
              magnitude = parseFloat(cellTexts[4]);
              place = cellTexts[5] || cellTexts.slice(5).join(' ');
              
              console.log(`    📍 Parsed: Date="${dateStr} ${timeStr}", Lat=${latitude}, Lon=${longitude}, Depth=${depth}, Mag=${magnitude}, Place="${place}"`);
            } else {
              // Format 2: Separate Date, Time, Lat, Lon, Depth, Magnitude, Location
              dateStr = cellTexts[0];
              timeStr = cellTexts[1] || '';
              
              // Try to find coordinates and magnitude in remaining cells
              const val1 = parseFloat(cellTexts[2] || '0');
              const val2 = parseFloat(cellTexts[3] || '0');
              const val3 = parseFloat(cellTexts[4] || '0');
              const val4 = parseFloat(cellTexts[5] || '0');
              
              // Check which values are coordinates (Lat: 3-22, Lon: 115-128) and which is magnitude (0.1-10)
              if (val1 >= 3 && val1 <= 22 && val2 >= 115 && val2 <= 128) {
                latitude = val1;
                longitude = val2;
                depth = val3;
                magnitude = val4;
              } else if (val2 >= 3 && val2 <= 22 && val1 >= 115 && val1 <= 128) {
                latitude = val2;
                longitude = val1;
                depth = val3;
                magnitude = val4;
              } else {
                // Try all combinations
                const values = [val1, val2, val3, val4].filter(v => !isNaN(v) && v !== 0);
                for (let i = 0; i < values.length; i++) {
                  for (let j = 0; j < values.length; j++) {
                    if (i === j) continue;
                    if (values[i] >= 3 && values[i] <= 22 && values[j] >= 115 && values[j] <= 128) {
                      latitude = values[i];
                      longitude = values[j];
                      // Remaining values might be depth and magnitude
                      const remaining = values.filter((_, idx) => idx !== i && idx !== j);
                      if (remaining.length >= 1) depth = remaining[0];
                      if (remaining.length >= 2) magnitude = remaining[1];
                      break;
                    }
                  }
                  if (latitude !== 0 && longitude !== 0) break;
                }
              }
              
              place = cellTexts[cellTexts.length - 1] || 'Unknown';
            }
          } else if (cellTexts.length >= 5) {
            // Try format: Date, Time, Lat, Lon, Magnitude or Date/Time, Lat, Lon, Depth, Magnitude
            const firstCell = cellTexts[0];
            if (firstCell.includes('November') || firstCell.match(/\d{4}/)) {
              // Combined date/time
              const dateTimeParts = firstCell.split(/\s+-\s+|\s+/);
              dateStr = dateTimeParts.slice(0, 3).join(' ');
              timeStr = dateTimeParts.slice(3).join(' ');
              
              latitude = parseFloat(cellTexts[1]);
              longitude = parseFloat(cellTexts[2]);
              depth = parseFloat(cellTexts[3]);
              magnitude = parseFloat(cellTexts[4]);
              place = 'Philippines';
            } else {
              dateStr = cellTexts[0];
              timeStr = cellTexts[1] || '';
              latitude = parseFloat(cellTexts[2]);
              longitude = parseFloat(cellTexts[3]);
              magnitude = parseFloat(cellTexts[4]);
              place = 'Philippines';
            }
          } else if (cellTexts.length >= 3) {
            // Try to find coordinates and other data
            const potentialLats: number[] = [];
            const potentialLons: number[] = [];
            
            for (const text of cellTexts) {
              const num = parseFloat(text);
              if (isNaN(num)) continue;
              
              // Philippines latitude: 4-21°N (with tolerance)
              if (num >= 3 && num <= 22) {
                potentialLats.push(num);
              }
              // Philippines longitude: 116-127°E (with tolerance)
              else if (num >= 115 && num <= 128) {
                potentialLons.push(num);
              }
              // Look for depth (usually positive number, but not coordinates)
              else if (num > 0 && num < 1000 && num < 100) {
                if (depth === 0) depth = num;
              }
            }
            
            // Use first valid lat/lon found
            if (potentialLats.length > 0 && latitude === 0) {
              latitude = potentialLats[0];
            }
            if (potentialLons.length > 0 && longitude === 0) {
              longitude = potentialLons[0];
            }
            
            if (!dateStr) dateStr = cellTexts[0];
            if (!timeStr) timeStr = cellTexts[1] || '';
            if (!place) place = cellTexts[cellTexts.length - 1] || 'Unknown';
          }
          
          // Log parsed data for debugging
          console.log(`    🔍 Row ${rowIndex}: Lat=${latitude}, Lon=${longitude}, Mag=${magnitude}, Depth=${depth}, Place="${place.substring(0, 40)}"`);
          
          // Validate magnitude first
          if (magnitude === 0 || isNaN(magnitude) || magnitude < 0 || magnitude > 10) {
            // Log why we're skipping this row
            if (cellTexts.length > 0) {
              console.log(`    ⚠️  Row ${rowIndex}: No valid magnitude found. Cells:`, cellTexts.slice(0, 6));
            }
            return;
          }
          
          // Validate Philippines coordinates (with some tolerance)
          // Philippines approximate bounds: Lat 4-21°N, Lon 116-127°E
          // But allow slightly outside for edge cases
          if (latitude === 0 || longitude === 0 || 
              latitude < 3 || latitude > 22 || 
              longitude < 115 || longitude > 128) {
            console.log(`    ⚠️  Row ${rowIndex}: Invalid Philippines coordinates: Lat ${latitude}, Lon ${longitude}. Skipping.`);
            return;
          }

          const time = parseDate(dateStr, timeStr);
          const id = `phivolcs-${tableIndex}-${rowIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          console.log(`    ✅ Row ${rowIndex}: Found earthquake - Mag ${magnitude}, Location: ${place.substring(0, 50)}, Lat: ${latitude.toFixed(4)}°N, Lon: ${longitude.toFixed(4)}°E`);
          
          earthquakes.push({
            id,
            magnitude,
            latitude: latitude || 0,
            longitude: longitude || 0,
            depth: depth || 0,
            place: place || 'Unknown Location',
            time,
          });
        } catch (error) {
          // Skip this row if parsing fails
          console.log(`    ⚠️  Error parsing row ${rowIndex}:`, error);
        }
      });
    });
    
    console.log(`✅ Method 1 found ${earthquakes.length} earthquakes`);

    // Method 2: Try to find data in divs or other structures
    if (earthquakes.length === 0) {
      console.log('🔍 Method 2: Searching for earthquake data in other elements...');
      
      // Look for divs with earthquake information
      const earthquakeDivs = $('[class*="earthquake"], [id*="earthquake"], [class*="quake"], [id*="quake"]');
      console.log(`Found ${earthquakeDivs.length} potential earthquake containers`);
      
      earthquakeDivs.each((index, elem) => {
        const text = $(elem).text();
        const magnitudeMatch = text.match(/magnitude[:\s]+([\d.]+)/i);
        const latMatch = text.match(/lat[itude]*[:\s]+([\d.]+)/i);
        const lonMatch = text.match(/lon[gitude]*[:\s]+([\d.]+)/i);
        const depthMatch = text.match(/depth[:\s]+([\d.]+)/i);
        
        if (magnitudeMatch) {
          const magnitude = parseFloat(magnitudeMatch[1]);
          if (!isNaN(magnitude) && magnitude > 0 && magnitude < 10) {
            earthquakes.push({
              id: `phivolcs-div-${index}-${Date.now()}`,
              magnitude,
              latitude: latMatch ? parseFloat(latMatch[1]) : 0,
              longitude: lonMatch ? parseFloat(lonMatch[1]) : 0,
              depth: depthMatch ? parseFloat(depthMatch[1]) : 0,
              place: 'Philippines',
              time: Date.now(),
            });
          }
        }
      });
      
      console.log(`✅ Method 2 found ${earthquakes.length} total earthquakes`);
    }

    // Method 3: Try JavaScript evaluation for dynamic content
    if (earthquakes.length === 0) {
      console.log('🔍 Method 3: Trying JavaScript evaluation...');
      
      const jsEarthquakes = await page.evaluate(() => {
        // This code runs in browser context, so document/navigator are available
        // @ts-ignore - document is available in browser context
        const results: any[] = [];
        
        // Look for JSON data in script tags
        // @ts-ignore - document is available in browser context
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const content = (script as any).textContent || '';
          // Try to find JSON data
          const jsonMatch = content.match(/\[.*?\{.*?magnitude.*?\}.*?\]/is);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[0]);
              if (Array.isArray(data)) {
                data.forEach((item: any, index: number) => {
                  if (item.magnitude || item.mag) {
                    results.push({
                      id: `phivolcs-js-${index}-${Date.now()}`,
                      magnitude: item.magnitude || item.mag || 0,
                      latitude: item.latitude || item.lat || 0,
                      longitude: item.longitude || item.lon || item.lng || 0,
                      depth: item.depth || 0,
                      place: item.place || item.location || 'Philippines',
                      time: item.time ? new Date(item.time).getTime() : Date.now(),
                    });
                  }
                });
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }
        }
        
        return results;
      }) as PHIVOLCSEarthquake[];
      
      if (jsEarthquakes.length > 0) {
        earthquakes.push(...jsEarthquakes);
        console.log(`✅ Method 3 found ${jsEarthquakes.length} earthquakes`);
      }
    }

    // If still no data, try to extract from page text directly
    if (earthquakes.length === 0) {
      console.log('⚠️  No earthquake data found in tables. Trying text extraction...');
      
      // @ts-ignore - document is available in browser context
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('📄 Page text sample (first 1000 chars):', pageText.substring(0, 1000));
      
      // Try to find magnitude patterns in text
      const magnitudeMatches = pageText.match(/\b(Magnitude|Mag\.?|M)\s*:?\s*([\d.]+)/gi);
      if (magnitudeMatches) {
        console.log(`Found ${magnitudeMatches.length} magnitude mentions in text:`, magnitudeMatches.slice(0, 5));
      }
      
      // Try to find date patterns
      const dateMatches = pageText.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/g);
      if (dateMatches) {
        console.log(`Found ${dateMatches.length} date patterns:`, dateMatches.slice(0, 5));
      }
      
      console.log('💡 Tip: Check the PHIVOLCS website manually to verify the current structure.');
      console.log('💡 The HTML structure may have changed. Check backend console for HTML sample.');
      
      // Return empty array instead of throwing error
      // This allows the frontend to show a helpful message
      return [];
    }

    // Remove duplicates and sort by time (newest first)
    const uniqueEarthquakes = earthquakes.filter((eq, index, self) =>
      index === self.findIndex(e => e.id === eq.id)
    );
    
    uniqueEarthquakes.sort((a, b) => b.time - a.time);
    
    console.log(`✅ Successfully scraped ${uniqueEarthquakes.length} unique earthquakes`);
    return uniqueEarthquakes;

  } catch (error) {
    console.error('❌ Error scraping PHIVOLCS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });
    
    // Provide more helpful error messages
    if (errorMessage.includes('timeout') || errorMessage.includes('Navigation timeout')) {
      throw new Error('Request timeout: The PHIVOLCS website took too long to respond. Please try again later.');
    } else if (errorMessage.includes('net::ERR') || errorMessage.includes('ECONNREFUSED')) {
      throw new Error('Network error: Cannot connect to PHIVOLCS website. Please check your internet connection.');
    } else if (errorMessage.includes('Failed to launch browser')) {
      throw new Error('Browser launch error: Puppeteer failed to launch. This might be a system configuration issue.');
    } else {
      throw new Error(`Failed to scrape PHIVOLCS: ${errorMessage}. Check backend console for details.`);
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('🔒 Browser closed');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

