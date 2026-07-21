/**
 * Round 7 mandatory recording:
 * 1) ring gallery rotation end-to-end
 * 2) case-study / studio scroll with NO mark-signature flash
 * 3) wave edge: scrub reveal + living morph (path opacity changes)
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, copyFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const logPath = join(outDir, 'round7.json');
const outPath = join(outDir, 'round7.webm');

async function scrollToY(page, y, duration = 0.7) {
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

await page.goto('http://localhost:3000/?verify=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('[data-wave-edge]', { timeout: 180000 });
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
await page.evaluate(() => {
  document.documentElement.style.overflow = '';
  window.__lenis?.start?.();
});
await page.waitForFunction(
  () => {
    const lenis = window.__lenis;
    if (!lenis || lenis.isStopped) {
      lenis?.start?.();
      document.documentElement.style.overflow = '';
    }
    const before = lenis.animatedScroll;
    lenis.scrollTo(before + 200, { immediate: true });
    const moved = Math.abs(lenis.animatedScroll - before) > 40;
    lenis.scrollTo(0, { immediate: true });
    return moved;
  },
  null,
  { timeout: 180000 }
);

const log = {
  gallery: { samples: [], visibleCounts: [] },
  flash: { maxOverlayOpacity: 0, hits: [] },
  wave: { progress: [], morphOpacities: [] },
};

// —— 1) Wave first (temple → document) ——
const waveRange = await page.evaluate(() => {
  const el = document.querySelector('[data-wave-edge]');
  const lenis = window.__lenis;
  const scroll = lenis?.animatedScroll ?? 0;
  const top = el.getBoundingClientRect().top + scroll;
  return { start: Math.max(0, top), end: top + el.offsetHeight * 1.3 };
});

for (let i = 0; i <= 10; i++) {
  const y = waveRange.start + ((waveRange.end - waveRange.start) * i) / 10;
  await scrollToY(page, y, 0.35);
  await page.waitForTimeout(220);
  const sample = await page.evaluate(() => {
    const root = document.querySelector('[data-wave-edge]');
    const paths = [...document.querySelectorAll('[data-wave-path]')];
    return {
      progress: root?.dataset.waveProgress ?? null,
      morph: root?.dataset.waveMorph ?? null,
      pathCount: paths.length,
      opacities: paths.map((p) => Number(getComputedStyle(p).opacity).toFixed(3)),
      sheetT: getComputedStyle(document.querySelector('[data-wave-sheet]')).transform,
    };
  });
  log.wave.progress.push({ i, y, ...sample });
  log.wave.morphOpacities.push(sample.opacities);
}

// Hold on wave mid so morph is visible in the recording
await scrollToY(
  page,
  waveRange.start + (waveRange.end - waveRange.start) * 0.45,
  0.4
);
await page.waitForTimeout(2800);

// —— 2) Ring gallery ——
await page.waitForSelector('[data-orbital-gallery]', { timeout: 60000 });
const galleryTop = await page.evaluate(() => {
  const el = document.querySelector('[data-orbital-gallery]');
  const lenis = window.__lenis;
  return el.getBoundingClientRect().top + (lenis?.animatedScroll ?? 0);
});

for (let i = 0; i <= 10; i++) {
  const y = galleryTop + i * 260;
  await scrollToY(page, y, 0.4);
  await page.waitForTimeout(180);
  const sample = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-orbit-item]')];
    const ring = document.querySelector('[data-orbit-ring]');
    const visible = items.filter((el) => Number(getComputedStyle(el).opacity) > 0.15);
    return {
      ringTransform: ring ? getComputedStyle(ring).transform : null,
      front: document.querySelector('[data-orbit-item][data-front="true"] h3')
        ?.textContent,
      visibleCount: visible.length,
      angles: items.map((el) => el.dataset.orbitAngle),
      opacities: items.map((el) => Number(getComputedStyle(el).opacity).toFixed(2)),
    };
  });
  log.gallery.samples.push({ i, y, ...sample });
  log.gallery.visibleCounts.push(sample.visibleCount);
}

// —— 3) Scroll Work → Studio → Apply repeatedly; assert no mark flash ——
const studioTop = await page.evaluate(() => {
  const el = document.querySelector('#studio');
  const lenis = window.__lenis;
  return el.getBoundingClientRect().top + (lenis?.animatedScroll ?? 0) - 200;
});
const applyTop = await page.evaluate(() => {
  const el = document.querySelector('#apply');
  const lenis = window.__lenis;
  return el.getBoundingClientRect().top + (lenis?.animatedScroll ?? 0) - 200;
});

for (let pass = 0; pass < 3; pass++) {
  for (const y of [studioTop, applyTop, studioTop - 400, galleryTop]) {
    await scrollToY(page, Math.max(0, y), 0.55);
    await page.waitForTimeout(120);
    const flash = await page.evaluate(() => {
      const ov = document.querySelector('[data-mark-signature]');
      if (!ov) return { opacity: 0 };
      const s = getComputedStyle(ov);
      return {
        opacity: Number(s.opacity),
        visibility: s.visibility,
        bg: s.backgroundColor,
      };
    });
    log.flash.maxOverlayOpacity = Math.max(
      log.flash.maxOverlayOpacity,
      flash.opacity
    );
    if (flash.opacity > 0.05 && flash.visibility !== 'hidden') {
      log.flash.hits.push({ pass, y, ...flash });
    }
  }
}

const uniqueMorphFrames = new Set(
  log.wave.morphOpacities.map((row) => row.join(','))
).size;

log.summary = {
  galleryRadial: log.gallery.samples[0]?.angles?.join(',') === '0,60,120,180,240,300',
  galleryMinVisible: Math.min(...log.gallery.visibleCounts),
  galleryMaxVisible: Math.max(...log.gallery.visibleCounts),
  flashHits: log.flash.hits.length,
  maxOverlayOpacity: log.flash.maxOverlayOpacity,
  waveProgressChanged:
    new Set(log.wave.progress.map((p) => p.progress)).size > 3,
  waveMorphAlive: uniqueMorphFrames >= 2,
  wavePathCount: log.wave.progress[0]?.pathCount ?? 0,
  pass:
    log.flash.hits.length === 0 &&
    log.flash.maxOverlayOpacity < 0.05 &&
    (log.gallery.samples[0]?.angles?.join(',') === '0,60,120,180,240,300') &&
    Math.max(...log.gallery.visibleCounts) >= 3 &&
    uniqueMorphFrames >= 2,
};

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
if (!log.summary.pass) {
  process.exitCode = 1;
}
