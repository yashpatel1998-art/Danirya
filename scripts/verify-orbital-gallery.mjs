/**
 * Orbital gallery: pin present, ring rotates with scroll, logo marker present.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, copyFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const logPath = join(outDir, 'orbital-gallery.json');
const outPath = join(outDir, 'orbital-gallery.webm');

async function scrollToY(page, y, duration = 0.8) {
  await page.evaluate(
    async ({ y, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo(0, y);
        return;
      }
      await new Promise((resolve) => {
        lenis.scrollTo(y, { duration, onComplete: resolve });
        setTimeout(resolve, duration * 1000 + 500);
      });
    },
    { y, duration }
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const warnings = [];
page.on('console', (msg) => {
  if (msg.type() === 'warning' && /scale not eligible/i.test(msg.text())) {
    warnings.push(msg.text());
  }
});

await page.goto('http://localhost:3000/?verify=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('[data-orbital-gallery]', { timeout: 180000 });
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
await page.waitForTimeout(1200);

const galleryTop = await page.evaluate(() => {
  const el = document.querySelector('[data-orbital-gallery]');
  return Math.max(0, (el?.getBoundingClientRect().top ?? 0) + window.scrollY - 20);
});

await scrollToY(page, galleryTop, 1.0);
await page.waitForTimeout(600);

const samples = [];
for (let i = 0; i <= 8; i++) {
  const y = galleryTop + i * 220;
  await scrollToY(page, y, 0.45);
  await page.waitForTimeout(200);
  const sample = await page.evaluate(() => {
    const ring = document.querySelector('[data-orbit-ring]');
    const front = document.querySelector('[data-orbit-item][data-front="true"]');
    const label = document.querySelector('[data-orbit-label]');
    const t = ring ? getComputedStyle(ring).transform : null;
    return {
      ringTransform: t,
      frontCaption: front?.querySelector('img')?.alt?.slice(0, 40) ?? null,
      label: label?.textContent?.trim() ?? null,
      hasOrbitalLogo: !!document.querySelector('[data-orbital-logo]'),
      pinned: !!document.querySelector('[data-orbital-gallery] [class*="pin"]'),
    };
  });
  samples.push({ i, y, ...sample });
}

writeFileSync(
  logPath,
  JSON.stringify({ samples, scaleWarnings: warnings }, null, 2)
);

const video = page.video();
await page.close();
await context.close();
await browser.close();
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
console.log('WARNINGS', warnings.length);
console.log(JSON.stringify(samples.map((s) => s.label), null, 2));
