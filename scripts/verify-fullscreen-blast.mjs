/**
 * Verify loader blast uses a full-viewport canvas (not a ~60vmin box).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const logPath = join(outDir, 'fullscreen-blast.json');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

// No ?verify=1 — loader must mount so we can measure the blast canvas host.
await page.goto('http://localhost:3000/', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});

await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForTimeout(1500);

const probe = await page.evaluate(() => {
  const blast = document.querySelector('[class*="blastLayer"]');
  const canvas = blast?.querySelector('canvas');
  const root = blast?.parentElement;
  const blastRect = blast?.getBoundingClientRect();
  const canvasRect = canvas?.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    hasBlastLayer: !!blast,
    hasLogoStage: !!document.querySelector('[class*="logoStage"]'),
    blastW: blastRect ? Math.round(blastRect.width) : null,
    blastH: blastRect ? Math.round(blastRect.height) : null,
    canvasW: canvasRect ? Math.round(canvasRect.width) : null,
    canvasH: canvasRect ? Math.round(canvasRect.height) : null,
    viewport: { vw, vh },
    fillsViewport:
      !!blastRect &&
      !!canvasRect &&
      blastRect.width >= vw * 0.95 &&
      blastRect.height >= vh * 0.95 &&
      canvasRect.width >= vw * 0.95 &&
      canvasRect.height >= vh * 0.95,
    rootOverflow: root ? getComputedStyle(root).overflow : null,
  };
});

writeFileSync(logPath, JSON.stringify(probe, null, 2));
console.log(JSON.stringify(probe, null, 2));

await browser.close();

if (!probe.fillsViewport) {
  console.error('FAIL: blast canvas does not fill viewport');
  process.exit(1);
}
if (probe.hasLogoStage) {
  console.error('FAIL: logoStage still present');
  process.exit(1);
}
console.log('OK: full-viewport blast layer');
