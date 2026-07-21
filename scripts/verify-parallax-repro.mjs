/**
 * Records double-scroll verification for Work parallax/reveals.
 * Output: public/verify/parallax-double-scroll.webm
 */
import { chromium } from 'playwright';
import { mkdirSync, renameSync, copyFileSync, unlinkSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'parallax-double-scroll.webm');

async function lenisTo(page, targetY, duration = 1.1) {
  await page.evaluate(
    async ({ targetY, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo(0, targetY);
        return;
      }
      await new Promise((resolve) => {
        lenis.scrollTo(targetY, {
          duration,
          onComplete: resolve,
        });
        // Fallback if onComplete never fires
        setTimeout(resolve, duration * 1000 + 400);
      });
    },
    { targetY, duration }
  );
  await page.waitForTimeout(200);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

await page.goto('http://localhost:3000/', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});

await page.waitForSelector('#work', { timeout: 180000 });
// Wait for Lenis + frames
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
await page.waitForTimeout(2500);

const range = await page.evaluate(() => {
  const el = document.getElementById('work');
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const bottom = el.getBoundingClientRect().bottom + window.scrollY;
  return {
    approach: Math.max(0, top - 120),
    through: Math.max(0, bottom - window.innerHeight + 80),
    heroSrc: document.querySelector('#work img')?.getAttribute('src') ?? null,
  };
});
console.log('RANGE', range);

// Pass 1
await lenisTo(page, range.approach, 1.4);
await page.waitForTimeout(400);
await lenisTo(page, range.through, 2.4);
await page.waitForTimeout(800);

// Top
await lenisTo(page, 0, 1.8);
await page.waitForTimeout(900);

// Pass 2
await lenisTo(page, range.approach, 1.4);
await page.waitForTimeout(400);
await lenisTo(page, range.through, 2.4);
await page.waitForTimeout(600);

// Hover still + cursor roam
const still = page.locator('#work [data-cursor="view"]').nth(1);
await still.scrollIntoViewIfNeeded().catch(() => {});
await still.hover({ force: true }).catch(() => {});
await page.waitForTimeout(1100);
await page.mouse.move(640, 380);
await page.waitForTimeout(250);
await page.mouse.move(980, 500);
await page.waitForTimeout(700);

console.log('HERO_SRC', range.heroSrc);

const video = page.video();
await page.close();
await context.close();
await browser.close();

if (!video) {
  console.error('No video recorded');
  process.exit(1);
}

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

for (const f of readdirSync(outDir)) {
  if (f.endsWith('.webm') && f !== 'parallax-double-scroll.webm') {
    try {
      unlinkSync(join(outDir, f));
    } catch {
      /* ignore */
    }
  }
}

console.log('VIDEO', outPath);
