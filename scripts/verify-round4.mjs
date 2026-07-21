/**
 * Round 4 verification video:
 * 1) Unlock dive + scroll Work→Studio cinematic zone slowly
 * 2) Post-temple case study gallery (tilt via mouse)
 * 3) Application form — scroll + type (must stay stable)
 *
 * Output: public/verify/round4-work-studio-gallery-form.webm
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  renameSync,
  copyFileSync,
  unlinkSync,
  readdirSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'round4-work-studio-gallery-form.webm');

async function lenisTo(page, targetY, duration = 1.2) {
  await page.evaluate(
    async ({ targetY, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo(0, targetY);
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

async function unlockDive(page) {
  await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
  await page.waitForFunction(
    () => document.querySelector('[data-dive-armed="true"]') != null,
    null,
    { timeout: 60000 }
  );
  // Frames still need a moment to paint under ?verify=1
  await page.waitForTimeout(2500);
  // Wheel unlocks dive while opening is held
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(
    () => document.querySelector('[data-opening-held="false"]') != null,
    null,
    { timeout: 15000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto('http://localhost:3000/?verify=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('#work', { timeout: 180000 });
await unlockDive(page);

const pinEnd = await page.evaluate(() => {
  const after = document.getElementById('after-temple');
  return Math.max(0, (after?.offsetTop ?? 7000) - 40);
});

// --- A: slow through cinematic Work→Studio ---
const checkpoints = [0.28, 0.36, 0.42, 0.48, 0.54, 0.6, 0.68, 0.76, 0.85, 0.95];
for (const t of checkpoints) {
  await lenisTo(page, pinEnd * t, 1.05);
  const frame = await page.evaluate(() => window.__journeyFrame ?? -1);
  console.log('cinema', t.toFixed(2), 'frame', frame);
}
await page.waitForTimeout(600);

// --- B: case study gallery ---
await lenisTo(page, pinEnd + 200, 1.2);
const galleryTop = await page.evaluate(() => {
  const el = document.querySelector('#work [class*="stage"], #work');
  return el
    ? el.getBoundingClientRect().top + window.scrollY + 400
    : window.scrollY + 800;
});
await lenisTo(page, galleryTop, 1.4);
const card = page.locator('#work [data-card]').nth(1);
await card.scrollIntoViewIfNeeded().catch(() => {});
const box = await card.boundingBox();
if (box) {
  // Cursor tilt path across card
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.waitForTimeout(250);
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35);
  await page.waitForTimeout(350);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.waitForTimeout(500);
}
await lenisTo(page, galleryTop + 900, 1.6);
await page.waitForTimeout(400);

// --- C: Application form stable ---
const applyY = await page.evaluate(() => {
  const el = document.getElementById('apply');
  return el ? el.getBoundingClientRect().top + window.scrollY - 40 : 0;
});
await lenisTo(page, applyY, 1.5);
await page.waitForTimeout(400);
// Nudge scroll while form visible — fields must not drift
await lenisTo(page, applyY + 180, 1.1);
await page.waitForTimeout(300);
await page.locator('#apply input[name="name"]').click({ force: true });
await page.keyboard.type('Verify Stable', { delay: 40 });
await page.waitForTimeout(400);
await lenisTo(page, applyY + 320, 1.0);
await page.waitForTimeout(500);

const formCheck = await page.evaluate(() => {
  const form = document.querySelector('#apply form');
  const t = form ? getComputedStyle(form).transform : null;
  const stable = document.querySelector('#apply[data-stable-form]');
  return { transform: t, stable: !!stable };
});
console.log('FORM', formCheck);

const video = page.video();
await page.close();
await context.close();
await browser.close();

if (!video) {
  console.error('No video');
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
  if (f.endsWith('.webm') && f !== 'round4-work-studio-gallery-form.webm' && f !== 'diag-work-studio.webm' && f !== 'parallax-double-scroll.webm') {
    try {
      unlinkSync(join(outDir, f));
    } catch {
      /* ignore */
    }
  }
}
console.log('VIDEO', outPath);
