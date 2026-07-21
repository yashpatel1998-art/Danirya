/**
 * Round 5 verification: Studio tabs, watermark rail, apply form clear of watermark.
 * Pass A: reduced-motion (native scroll — Lenis intentionally off).
 * Pass B: full motion recording (Lenis).
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  renameSync,
  copyFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'round5-studio-watermark-form.webm');
const logPath = join(outDir, 'round5-studio-watermark-form.json');

async function scrollToY(page, targetY, duration = 0.7) {
  await page.evaluate(
    async ({ targetY, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo({ top: targetY, behavior: 'auto' });
        return;
      }
      await new Promise((resolve) => {
        lenis.scrollTo(targetY, { duration, onComplete: resolve });
        setTimeout(resolve, duration * 1000 + 500);
      });
    },
    { targetY, duration }
  );
}

async function probeWatermark(page) {
  return page.evaluate(() => {
    const apply = document.getElementById('apply');
    const rail = document.querySelector('#after-temple [class*="watermarkRail"], #after-temple [aria-hidden] canvas');
    const zone = apply?.previousElementSibling;
    const applyRect = apply?.getBoundingClientRect();
    const railHost = document.querySelector('#after-temple > div');
    const railRect = railHost?.getBoundingClientRect();
    const overlap =
      applyRect && railRect
        ? Math.max(
            0,
            Math.min(applyRect.bottom, railRect.bottom) -
              Math.max(applyRect.top, railRect.top)
          )
        : null;
    return {
      stableForm: !!document.querySelector('#apply[data-stable-form]'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
      hasLenis: !!window.__lenis,
      applyInAfterSlot: !!apply?.closest('[class*="after"], #after-temple') &&
        !apply?.closest('[class*="watermarkZone"]'),
      watermarkZoneContainsApply: !!document
        .querySelector('#after-temple')
        ?.querySelector('[class*="watermarkZone"] #apply'),
      railApplyOverlapPx: overlap,
      hasCanvasInApply: !!apply?.querySelector('canvas'),
    };
  });
}

// --- Pass A: reduced motion (navigation works without Lenis / parallax) ---
const browserA = await chromium.launch({ headless: true });
const contextA = await browserA.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
const pageA = await contextA.newPage();
await pageA.goto('http://localhost:3000/?verify=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await pageA.waitForSelector('#studio', { timeout: 180000 });
await pageA.waitForTimeout(1000);

const studioYA = await pageA.evaluate(() => {
  const el = document.getElementById('studio');
  return Math.max(0, (el?.offsetTop ?? 0) - 40);
});
await scrollToY(pageA, studioYA, 0.2);
await pageA.waitForTimeout(400);

const tabsA = pageA.locator('[role="tab"]');
const tabCount = await tabsA.count();
const labels = [];
for (let i = 0; i < tabCount; i++) {
  labels.push((await tabsA.nth(i).innerText()).trim());
  await tabsA.nth(i).click();
  await pageA.waitForTimeout(250);
}

const applyYA = await pageA.evaluate(() => {
  const el = document.getElementById('apply');
  return Math.max(0, (el?.offsetTop ?? 0) - 20);
});
await scrollToY(pageA, applyYA, 0.2);
await pageA.waitForTimeout(500);
const reducedMotionPass = await probeWatermark(pageA);
await pageA.close();
await contextA.close();
await browserA.close();

// --- Pass B: full motion + video ---
const browserB = await chromium.launch({ headless: true });
const contextB = await browserB.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const pageB = await contextB.newPage();
await pageB.goto('http://localhost:3000/?verify=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await pageB.waitForSelector('#work', { timeout: 180000 });
await pageB.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
await pageB.waitForTimeout(1200);

const workY = await pageB.evaluate(() => {
  const el = document.getElementById('work');
  return Math.max(0, (el?.offsetTop ?? 0) - 20);
});
await scrollToY(pageB, workY, 1.0);
await pageB.waitForTimeout(900);

const studioY = await pageB.evaluate(() => {
  const el = document.getElementById('studio');
  return Math.max(0, (el?.offsetTop ?? 0) - 40);
});
await scrollToY(pageB, studioY, 1.1);
await pageB.waitForTimeout(500);

const tabsB = pageB.locator('[role="tab"]');
const n = await tabsB.count();
for (let i = 0; i < n; i++) {
  await tabsB.nth(i).click();
  await pageB.waitForTimeout(750);
}

const applyY = await pageB.evaluate(() => {
  const el = document.getElementById('apply');
  return Math.max(0, (el?.offsetTop ?? 0) - 20);
});
await scrollToY(pageB, applyY, 1.0);
await pageB.waitForTimeout(1000);
const motionPass = await probeWatermark(pageB);

writeFileSync(
  logPath,
  JSON.stringify({ disciplines: labels, reducedMotionPass, motionPass }, null, 2)
);

const video = pageB.video();
await pageB.close();
await contextB.close();
await browserB.close();

if (video) {
  const tmp = await video.path();
  try {
    renameSync(tmp, outPath);
  } catch {
    copyFileSync(tmp, outPath);
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

console.log('LOG', logPath);
console.log('VIDEO', outPath);
console.log('DISCIPLINES', labels.join(' | '));
console.log('REDUCED', reducedMotionPass);
console.log('APPLY', motionPass);
