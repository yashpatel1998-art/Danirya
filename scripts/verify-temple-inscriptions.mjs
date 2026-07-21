/**
 * Verify temple inscriptions across all 5 rooms on the continuous scroll:
 * label settle → word-by-word rise → hold → unified fade on leave.
 *
 * Output: public/verify/temple-inscriptions.webm
 *         public/verify/temple-inscriptions.json
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  renameSync,
  copyFileSync,
  unlinkSync,
  writeFileSync,
  readdirSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'temple-inscriptions.webm');
const logPath = join(outDir, 'temple-inscriptions.json');

/** Mid-hold peeks (0-based) — v4 single-line inscription holds. */
const ROOM_PEEKS = [
  { room: 'forecourt', frame: 50 },
  { room: 'threshold', frame: 154 },
  { room: 'hall', frame: 277 },
  { room: 'chapel', frame: 443 },
  { room: 'sanctuary', frame: 680 },
];

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
  await page.waitForFunction(() => !!window.__lenis, null, { timeout: 90000 });
  // Force-dismiss opening hold the same way other verify scripts do
  await page.evaluate(() => {
    document.documentElement.style.overflow = '';
    window.__lenis?.start?.();
    window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
    );
  });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 16; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(80);
  }
  await page
    .waitForFunction(
      () => {
        const lenis = window.__lenis;
        if (!lenis) return false;
        const before = lenis.animatedScroll;
        lenis.scrollTo(before + 200, { immediate: true });
        const moved = Math.abs(lenis.animatedScroll - before) > 20;
        lenis.scrollTo(0, { immediate: true });
        return moved;
      },
      null,
      { timeout: 180000 }
    )
    .catch(() => {});
  await page.waitForTimeout(600);
}

async function scrollToFrame(page, pinEnd, targetFrame, duration = 1.4) {
  // Journey maps scroll 0→pinEnd roughly to frames 0→799
  const y = (pinEnd * targetFrame) / 799;
  await lenisTo(page, y, duration);
  // Fine-tune toward target frame
  for (let i = 0; i < 8; i++) {
    const frame = await page.evaluate(() => window.__journeyFrame ?? -1);
    if (Math.abs(frame - targetFrame) <= 6) break;
    const nudge = ((targetFrame - frame) / 799) * pinEnd;
    await lenisTo(page, Math.max(0, Math.min(pinEnd, (await page.evaluate(() => window.scrollY)) + nudge)), 0.55);
  }
}

const base = process.env.VERIFY_BASE || 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto(`${base}/?verify=1`, {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('#work', { timeout: 180000 });
await unlockDive(page);

const pinEnd = await page.evaluate(() => {
  const after = document.getElementById('after-temple');
  return Math.max(0, (after?.offsetTop ?? 7000) - 40);
});

const log = { pinEnd, rooms: [] };

for (const peek of ROOM_PEEKS) {
  console.log('→', peek.room, 'frame', peek.frame);
  await scrollToFrame(page, pinEnd, peek.frame, 1.6);
  // v4 single-line — reveal ≈1.5s + brief read
  await page.waitForTimeout(3500);
  const sample = await page.evaluate(() => {
    const root = document.querySelector('[data-temple-inscription]');
    const words = root
      ? Array.from(root.querySelectorAll('[data-inscription-word]'))
      : [];
    const label = root?.querySelector('p');
    const style = root ? getComputedStyle(root) : null;
    return {
      frame: window.__journeyFrame ?? -1,
      room: root?.getAttribute('data-room') ?? null,
      visible: style ? style.visibility !== 'hidden' && Number(style.opacity) > 0.05 : false,
      opacity: style ? Number(style.opacity) : 0,
      label: label?.textContent?.trim() ?? null,
      wordCount: words.length,
      wordsOpaque: words.filter((w) => Number(getComputedStyle(w).opacity) > 0.5).length,
    };
  });
  console.log(JSON.stringify(sample));
  log.rooms.push({ target: peek, ...sample });
  // Nudge away so exit fade can fire before next room
  await scrollToFrame(page, pinEnd, Math.min(798, peek.frame + 55), 0.9);
  await page.waitForTimeout(700);
}

writeFileSync(logPath, JSON.stringify(log, null, 2));
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
  // Clean stray webm chunks
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.webm') && f !== 'temple-inscriptions.webm') {
      // leave other verify assets
    }
  }
  console.log('VIDEO', outPath);
} else {
  console.error('No video recorded');
  process.exit(1);
}
