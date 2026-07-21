/**
 * /lab — beige gold gallery + transparent center logo (−Y spin). No WaveEdge.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, copyFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const logPath = join(outDir, 'lab-effects.json');
const outPath = join(outDir, 'lab-effects.webm');

async function scrollToY(page, y, duration = 0.45) {
  await page.evaluate(
    async ({ y, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo(0, y);
        return;
      }
      await new Promise((resolve) => {
        lenis.scrollTo(y, { duration, onComplete: resolve });
        setTimeout(resolve, duration * 1000 + 400);
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

await page.goto('http://localhost:3000/lab', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('[data-lab-sandbox]', { timeout: 60000 });
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
await page.waitForTimeout(900);

const log = { gallery: [], summary: {} };

await page.waitForSelector('[data-orbital-gallery]', { timeout: 30000 });
const galleryTop = await page.evaluate(() => {
  const el = document.querySelector('[data-orbital-gallery]');
  const lenis = window.__lenis;
  return el.getBoundingClientRect().top + (lenis?.animatedScroll ?? 0);
});

for (let i = 0; i <= 8; i++) {
  const y = galleryTop + i * 160;
  await scrollToY(page, y, 0.3);
  await page.waitForTimeout(150);
  log.gallery.push(
    await page.evaluate((y) => {
      const hub = document.querySelector('[data-orbit-hub]');
      const logo = hub?.firstElementChild;
      const panels = [...document.querySelectorAll('[data-orbit-item]')];
      const face = document.querySelector(
        '[data-orbit-item][data-front="true"] [data-orbit-face]'
      );
      return {
        y,
        hasHub: !!hub,
        hubBg: hub ? getComputedStyle(hub).backgroundColor : null,
        logoBg: logo ? getComputedStyle(logo).backgroundColor : null,
        border: face ? getComputedStyle(face).borderColor : null,
        visibleCount: panels.filter(
          (el) => Number(getComputedStyle(el).opacity) > 0.3
        ).length,
        frontCaption: document.querySelector(
          '[data-orbit-item][data-front="true"] [data-lab-caption]'
        )?.textContent,
        hasWave: !!document.querySelector('[data-wave-edge]'),
      };
    }, y)
  );
}

await scrollToY(page, galleryTop + 500, 0.35);
await page.waitForTimeout(1800);

const captions = new Set(
  log.gallery.map((g) => g.frontCaption).filter(Boolean)
);

const transparent = (c) =>
  !c ||
  c === 'rgba(0, 0, 0, 0)' ||
  c === 'transparent' ||
  c.startsWith('rgba(0, 0, 0, 0');

log.summary = {
  galleryHasHub: log.gallery.every((g) => g.hasHub),
  hubTransparent: log.gallery.every(
    (g) => transparent(g.hubBg) && transparent(g.logoBg)
  ),
  noWave: log.gallery.every((g) => !g.hasWave),
  goldBorder: log.gallery.find((g) => g.border)?.border,
  galleryCaptions: [...captions],
  galleryMaxVisible: Math.max(...log.gallery.map((g) => g.visibleCount)),
  pass: false,
};

log.summary.pass =
  log.summary.galleryHasHub &&
  log.summary.hubTransparent &&
  log.summary.noWave &&
  log.summary.galleryMaxVisible >= 2 &&
  captions.size >= 2;

writeFileSync(logPath, JSON.stringify(log, null, 2));

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

console.log(JSON.stringify({ outPath, logPath, summary: log.summary }, null, 2));
if (!log.summary.pass) process.exitCode = 1;
