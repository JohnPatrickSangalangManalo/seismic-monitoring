import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function launchBrowser() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  return browser;
}
