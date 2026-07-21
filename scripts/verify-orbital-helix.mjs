/**
 * Orbital helix + section mark signature (Work→Studio / Studio→Contact).
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  writeFileSync,
  renameSync,
  copyFileSync,
  unlinkSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const logPath = join(outDir, 'orbital-helix-mark.json');
const outPath = join(outDir, 'orbital-helix-mark.webm');

async function scrollToY(page, y, duration = 0.75) {
  await page.evaluate(
    async ({ y, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo(0, y);
        return;
      }
      await new Promise((resolve) => {
        lenis.scrollTo(y, { duration, onComplete: resolve });
        setTimeout(resolve, duration * 1000 + 450);
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

await page.goto('http://localhost:3000/?verify=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('[data-orbital-gallery]', { timeout: 180000 });
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
await page.waitForTimeout(1000);

const galleryTop = await page.evaluate(() => {
  const el = document.querySelector('[data-orbital-gallery]');
  return Math.max(0, (el?.getBoundingClientRect().top ?? 0) + window.scrollY - 10);
});

await scrollToY(page, galleryTop, 1.0);
await page.waitForTimeout(500);

const orbitProbe = await page.evaluate(() => {
  const item = document.querySelector('[data-orbit-item]');
  const t = item ? item.style.transform || getComputedStyle(item).transform : '';
  const w = item?.getBoundingClientRect().width ?? 0;
  return {
    widthPx: Math.round(w),
    hasRotateX: /rotateX/i.test(t),
    hasRotateZ: /rotateZ/i.test(t),
    transformSample: t.slice(0, 160),
  };
});

for (let i = 0; i <= 6; i++) {
  await scrollToY(page, galleryTop + i * 260, 0.4);
  await page.waitForTimeout(180);
}

const studioY = await page.evaluate(() => {
  const el = document.getElementById('studio');
  return Math.max(0, (el?.offsetTop ?? 0) - 40);
});
await scrollToY(page, studioY, 1.1);
await page.waitForTimeout(900);

const markAfterStudio = await page.evaluate(() => {
  const overlay = document.querySelector('[data-mark-signature]');
  const style = overlay ? getComputedStyle(overlay) : null;
  return {
    overlayOpacity: style?.opacity ?? null,
    overlayVisibility: style?.visibility ?? null,
  };
});

const applyY = await page.evaluate(() => {
  const el = document.getElementById('apply');
  return Math.max(0, (el?.offsetTop ?? 0) - 40);
});
await scrollToY(page, applyY, 1.1);
await page.waitForTimeout(900);

writeFileSync(
  logPath,
  JSON.stringify({ orbitProbe, markAfterStudio }, null, 2)
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
console.log(JSON.stringify({ orbitProbe, markAfterStudio }, null, 2));
