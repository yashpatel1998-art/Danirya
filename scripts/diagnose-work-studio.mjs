/**
 * Diagnostic: slow Lenis scroll through cinematic Work→Studio zone.
 * Samples __journeyFrame; writes video + JSON under public/verify/
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  renameSync,
  copyFileSync,
  unlinkSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'diag-work-studio.webm');
const logPath = join(outDir, 'diag-work-studio.json');
const pathData = JSON.parse(
  readFileSync(join(__dirname, '..', 'public', 'data', 'camera_path.json'), 'utf8')
);

async function lenisTo(page, targetY, duration = 0.55) {
  await page.evaluate(
    async ({ targetY, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo(0, targetY);
        return;
      }
      await new Promise((resolve) => {
        lenis.scrollTo(targetY, { duration, onComplete: resolve });
        setTimeout(resolve, duration * 1000 + 400);
      });
    },
    { targetY, duration }
  );
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
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
await page.waitForTimeout(2500);

// Hero pin scroll height — stay inside journey until after-temple
const pinEnd = await page.evaluate(() => {
  const after = document.getElementById('after-temple');
  return Math.max(0, (after?.offsetTop ?? 6000) - 80);
});

const samples = [];
const steps = 56;
for (let i = 0; i <= steps; i++) {
  const y = (pinEnd * i) / steps;
  await lenisTo(page, y, 0.4);
  const frame = await page.evaluate(() => window.__journeyFrame ?? -1);
  const sample = pathData[Math.max(0, Math.min(pathData.length - 1, frame))] ?? null;
  const ui = await page.evaluate(() => ({
    studioPlaque: !!document.querySelector('[aria-label="Studio"]'),
    scrollY: Math.round(window.scrollY),
  }));
  samples.push({
    i,
    scrollY: ui.scrollY,
    pathIndex0: frame,
    velocity: sample?.velocity ?? null,
    room: sample?.room ?? null,
    studioPlaque: ui.studioPlaque,
    zone:
      frame < 210
        ? 'pre'
        : frame < 236
          ? 'approach-work'
          : frame <= 258
            ? 'WORK-HOLD'
            : frame < 408
              ? 'TRAVEL'
              : frame <= 418
                ? 'STUDIO-HOLD'
                : frame < 436
                  ? 'WHIP'
                  : 'post-studio',
  });
  if (i % 8 === 0) {
    console.log(
      `i=${i} f=${frame} zone=${samples[samples.length - 1].zone} v=${sample?.velocity?.toFixed?.(4)} plaque=${ui.studioPlaque}`
    );
  }
}

writeFileSync(logPath, JSON.stringify({ pinEnd, samples }, null, 2));
console.log('LOG', logPath);

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
  console.log('VIDEO', outPath);
}
