import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 50, downloadThroughput: 20e6 / 8, uploadThroughput: 10e6 / 8 });
    await page.goto('http://127.0.0.1:5175');
    await page.waitForFunction(() => document.querySelector('.city-label:not([hidden])') && document.querySelector('.status')?.textContent === '' && !document.querySelector('.data-status'));
    const readyMs = await page.evaluate(() => performance.now());
    await page.getByRole('button', { name: 'Browse cities' }).click();
    await page.getByRole('searchbox').fill('jakarta');
    await page.locator('.city-list button').first().click();
    await expect(page.getByTestId('population')).toHaveText('≈ 41,914,000');
    results.push(await page.evaluate(readyMs => ({ readyMs, qaHookAbsent: !window.__populationEarth, resources: performance.getEntriesByType('resource').map(r => ({ name: new URL(r.name).pathname, transferBytes: r.transferSize, encodedBytes: r.encodedBodySize })), navigationBytes: performance.getEntriesByType('navigation')[0].transferSize }), readyMs));
    await context.close();
  }
  const bytes = await fs.readFile('public/data/m3-2025-v1/cities.json');
  const report = { date: '2026-10-18', browser: browser.version(), build: 'ordinary production; no QA hook', throttle: '20 Mbps download, 50 ms latency; cache disabled; local HTTP gzip server; 3 fresh browser contexts', fullCityJsonBytes: bytes.length, fullCityJsonGzipBytes: gzipSync(bytes).length, runs: results.map(r => ({ ...r, totalTransferBytes: r.navigationBytes + r.resources.reduce((s, v) => s + v.transferBytes, 0) })), limitations: 'Local test server, not CDN latency or real internet variance. Readiness sampled by Playwright after first labels and loaded Earth; subsequent search selection verified.' };
  await fs.writeFile('docs/m3/cold-load.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
