import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
const percentile = (values, q) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * q) - 1)];
const summary = values => ({ samples: values.length, medianMs: percentile(values, .5), p95Ms: percentile(values, .95), maxMs: Math.max(...values) });
try {
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(() => window.__populationEarth?.debug.snapshot().heights.length === 48 && document.querySelector('.status')?.textContent === '');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const { metrics } = await cdp.send('Performance.getMetrics'); return metrics.find(m => m.name === 'JSHeapUsedSize').value; };
  const baselineHeap = await heap();
  // Warm the actual sample scene before the trace. Reduced motion suppresses
  // the introduction; this explicit camera route still continuously renders.
  await page.evaluate(async () => {
    const globe = window.__populationEarth;
    for (let i = 0; i < 120; i++) { globe.debug.rotate(.002, 0); await new Promise(requestAnimationFrame); }
    globe.resetView();
  });
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8.execute,blink.user_timing', transferMode: 'ReturnAsStream' });
  console.log('Capturing 30-second dense-Asia rotation and zoom trace…');
  const measured = await page.evaluate(() => new Promise(resolve => {
    const globe = window.__populationEarth;
    const intervals = [], longTasks = [];
    const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => ({ startMs: e.startTime, durationMs: e.duration }))));
    observer.observe({ type: 'longtask' });
    let start, last, previousYaw = 0, previousPitch = 0;
    function frame(now) {
      if (start === undefined) { start = now; last = now; }
      else intervals.push(now - last);
      last = now;
      const elapsed = now - start, t = elapsed / 1000;
      const yaw = Math.sin(t * Math.PI / 7.5) * .36, pitch = Math.sin(t * Math.PI / 15) * .12;
      globe.debug.rotate(yaw - previousYaw, pitch - previousPitch);
      previousYaw = yaw; previousPitch = pitch;
      const distance = 2.8 + .35 * Math.cos(t * Math.PI / 5);
      globe.zoom(distance / Math.hypot(...globe.debug.snapshot().camera));
      if (elapsed < 30000) requestAnimationFrame(frame);
      else { observer.disconnect(); resolve({ intervals, longTasks, elapsedMs: elapsed, renderer: globe.debug.snapshot() }); }
    }
    requestAnimationFrame(frame);
  }));
  const done = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end'); const { stream } = await done;
  let trace = '';
  for (;;) { const part = await cdp.send('IO.read', { handle: stream }); trace += part.data; if (part.eof) break; }
  await cdp.send('IO.close', { handle: stream });
  await fs.writeFile('docs/m2/interaction-trace.json.gz', gzipSync(trace));
  const samples = [];
  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'Browse cities' }).click();
    await page.getByRole('searchbox').fill(i % 2 ? 'cairo' : 'jakarta');
    await page.evaluate(() => {
      window.__selectionLatency = null;
      document.querySelector('.city-list button').addEventListener('click', () => {
        const start = performance.now();
        const observer = new MutationObserver(() => {
          if (document.querySelector('[data-testid=population]')) {
            observer.disconnect(); requestAnimationFrame(() => { window.__selectionLatency = performance.now() - start; });
          }
        }); observer.observe(document.querySelector('main'), { childList: true, subtree: true });
      }, { once: true });
    });
    await page.locator('.city-list button').click();
    await page.waitForFunction(() => window.__selectionLatency !== null);
    samples.push(await page.evaluate(() => window.__selectionLatency));
  }
  const heapBeforeToggles = await heap();
  for (let i = 0; i < 30; i++) {
    await page.getByRole('button', { name: i % 2 ? 'Linear' : 'Logarithmic', exact: true }).click();
    await page.getByRole('checkbox', { name: 'City pillars', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Decorative particles', exact: true }).click();
  }
  const heapAfterToggles = await heap();
  const graphics = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable'; });
  const result = {
    date: '2026-10-18', browser: browser.version(), device: 'M0 MacBook Air M2 / 8 GB', graphics,
    build: 'Vite development, 48-city sample; headless installed Chrome; not release certification',
    viewport: [1440, 900], dpr: 1.5, route: '30 seconds after 120-frame warm-up; sinusoidal Asia yaw ±0.36 radians, pitch ±0.12 radians, distance 2.45–3.15R; reduced-motion intro disabled; all city effects enabled',
    elapsedMs: measured.elapsedMs, frameIntervals: summary(measured.intervals),
    frameBudget20msPassed: percentile(measured.intervals, .95) <= 20,
    longTasks: measured.longTasks, selectionFeedback: summary(samples), selectionBudget100msPassed: percentile(samples, .95) <= 100,
    drawCalls: measured.renderer.calls, rendererMemory: measured.renderer.memory,
    heapBytes: { baseline: baselineHeap, before30Toggles: heapBeforeToggles, after30Toggles: heapAfterToggles, delta: heapAfterToggles - heapBeforeToggles },
    limitations: ['RAF intervals measure browser scheduling during continuous rendering, not GPU timer queries.', 'Selection timing is click dispatch to next frame after details enter the DOM.', 'GPU byte total and throttled production cold load not measured.', 'Development QA hook snapshots add allocations; full 12,138-city release remains M3.'],
  };
  await fs.writeFile('docs/m2/performance.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
