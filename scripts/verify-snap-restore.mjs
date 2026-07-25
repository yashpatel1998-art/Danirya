/**
 * Live-test temple snap return-position restore.
 * Mid-journey leave → /work → browser back → exact stop + typology/lens.
 *
 * Writes artifacts under public/verify/snap-restore/
 * Prefer http://localhost:3000/ ; override with HERO_SNAP_URL.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify', 'snap-restore');
mkdirSync(outDir, { recursive: true });

const BASE = (process.env.HERO_SNAP_URL || 'http://localhost:3000/').replace(
  /\/?$/,
  '/'
);

const STORAGE_KEY = 'gf:temple-snap';

/** Mid-journey statue target — NOT final stop 8. */
const TARGET = {
  pointIndex: 1,
  id: 'standing-hanuman',
  masterFrame: 430,
  statueId: 'standing-hanuman',
};

const STOPS = [
  { id: 'lying-1', kind: 'statue', masterFrame: 310 },
  { id: 'standing-hanuman', kind: 'statue', masterFrame: 430 },
  { id: 'shiva', kind: 'statue', masterFrame: 530 },
  { id: 'radha-krishna', kind: 'statue', masterFrame: 635 },
  { id: 'lying-2', kind: 'statue', masterFrame: 760 },
  { id: 'reverse-hall', kind: 'passage', masterFrame: 910 },
  { id: 'reverse-threshold', kind: 'passage', masterFrame: 970 },
  { id: 'reverse-forecourt', kind: 'passage', masterFrame: 1030 },
  { id: 'entrance-sky-ascend', kind: 'passage', masterFrame: 1200 },
];
// kind is required by advanceToStop settle logic.

async function readDebug(page) {
  return page.evaluate(() => {
    const d = /** @type {any} */ (window).__HERO_SNAP_DEBUG__ || null;
    const hero = document.querySelector('[data-hero-snap="1"]');
    const lensImg = document.querySelector('img[src*="/lab/snap/lenses/"]');
    const eyebrowEl = document.querySelector(
      '[aria-live="polite"] [class*="eyebrow"]'
    );
    return {
      phase: d?.phase ?? hero?.getAttribute('data-hero-phase') ?? null,
      typo: d?.typologyMode ?? null,
      pointIndex: d?.pointIndex ?? null,
      id: d?.stopId ?? null,
      kind: d?.kind ?? null,
      statue: d?.statueId ?? null,
      frame1:
        d?.frame1 ??
        (Number(hero?.getAttribute('data-hero-frame')) || null),
      masterFrame: d?.masterFrame ?? null,
      snapArmed: d?.snapArmed ?? null,
      openingHeld:
        d?.openingHeld ?? hero?.getAttribute('data-opening-held') === 'true',
      diveArmed: hero?.getAttribute('data-dive-armed') === 'true',
      loadProgress: d?.loadProgress ?? null,
      framesReady: d?.framesReady ?? null,
      loaderGone: d?.loaderGone ?? null,
      firstPaintDone: d?.firstPaintDone ?? null,
      restorePending: d?.restorePending ?? null,
      lensVisible: !!lensImg,
      lensSrc: lensImg?.getAttribute('src') || null,
      eyebrow: eyebrowEl?.textContent?.trim() || null,
      paint: /** @type {any} */ (window).__journeyLastPaint || null,
      resident: /** @type {any} */ (window).__journeyFrameResident ?? null,
    };
  });
}

async function readStorage(page) {
  return page.evaluate((key) => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, STORAGE_KEY);
}

async function waitFor(page, pred, { timeout = 120000, interval = 50 } = {}) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    last = await readDebug(page);
    if (pred(last)) return last;
    await page.waitForTimeout(interval);
  }
  throw new Error(
    `waitFor timeout after ${timeout}ms last=${JSON.stringify(last)}`
  );
}

async function driveLoader(page, { timeout = 90000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const d = await readDebug(page);
    if (d.loaderGone || d.diveArmed || (d.snapArmed && !d.openingHeld)) {
      return d;
    }
    await page.mouse.wheel(0, 900);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(40);
  }
  throw new Error(`driveLoader timeout last=${JSON.stringify(await readDebug(page))}`);
}

async function settleIdleAt(page, pointIndex, id) {
  return waitFor(
    page,
    (d) =>
      d.pointIndex === pointIndex &&
      d.id === id &&
      d.phase === 'idle' &&
      (d.kind === 'passage' || d.typo === 'hold' || d.typo === 'enter'),
    { timeout: 45000 }
  );
}

async function advanceToStop(page, pointIndex) {
  // Must be idle at stop 0 before first advance.
  await settleIdleAt(page, 0, STOPS[0].id);
  for (let i = 0; i < pointIndex; i++) {
    const next = STOPS[i + 1];
    await page.keyboard.press('ArrowDown');
    await waitFor(
      page,
      (d) =>
        d.pointIndex === i + 1 &&
        d.id === next.id &&
        (d.phase === 'holdGate' || d.phase === 'idle'),
      { timeout: 60000 }
    );
    if (next.kind === 'statue') {
      await waitFor(
        page,
        (d) =>
          d.pointIndex === i + 1 &&
          d.id === next.id &&
          d.phase === 'idle' &&
          (d.typo === 'hold' || d.lensVisible),
        { timeout: 30000 }
      );
    } else {
      await waitFor(
        page,
        (d) => d.pointIndex === i + 1 && d.phase === 'idle',
        { timeout: 15000 }
      );
    }
  }
  return readDebug(page);
}

async function sampleCanvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(
      '[data-hero-snap-stage="1"] canvas, [data-hero-snap="1"] canvas'
    );
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const w = Math.min(160, canvas.width);
    const h = Math.min(90, canvas.height);
    if (w < 8 || h < 8) return null;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    let r = 0,
      g = 0,
      b = 0,
      n = 0,
      black = 0;
    for (let i = 0; i < d.length; i += 16) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      if (d[i] < 8 && d[i + 1] < 8 && d[i + 2] < 8) black++;
      n++;
    }
    return {
      meanR: r / n,
      meanG: g / n,
      meanB: b / n,
      blackRatio: black / n,
      w,
      h,
    };
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const report = {
    base: BASE,
    target: TARGET,
    checks: {},
    pass: false,
    error: null,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // --- Stale stopId unit-ish check (in-page validate via write + reload) ---
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(
      ({ key, bad }) => {
        sessionStorage.setItem(key, JSON.stringify(bad));
      },
      {
        key: STORAGE_KEY,
        bad: {
          v: 1,
          pointIndex: 1,
          stopId: 'not-a-real-stop',
          writtenAt: Date.now(),
        },
      }
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const staleStorage = await readStorage(page);
    const staleDebug = await readDebug(page);
    report.checks.staleStopIdCleared = staleStorage == null;
    report.checks.staleFellBackStop0 =
      staleDebug.pointIndex === 0 ||
      staleDebug.pointIndex == null ||
      staleDebug.id === 'lying-1' ||
      staleDebug.id == null;
    assert(report.checks.staleStopIdCleared, 'stale stopId must clear storage');

    // Clear and cold-boot for real journey
    await page.evaluate((key) => sessionStorage.removeItem(key), STORAGE_KEY);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await driveLoader(page);
    await waitFor(
      page,
      (d) => d.snapArmed && !d.openingHeld && d.phase != null,
      { timeout: 60000 }
    );
    await waitFor(page, (d) => d.pointIndex === 0 && d.id === 'lying-1', {
      timeout: 20000,
    });
    // Wait for opening statue to reach idle so advance works.
    await waitFor(page, (d) => d.phase === 'idle', { timeout: 30000 });

    const atTarget = await advanceToStop(page, TARGET.pointIndex);
    report.checks.reachedTargetBeforeLeave = {
      pointIndex: atTarget.pointIndex,
      id: atTarget.id,
      frame1: atTarget.frame1,
      phase: atTarget.phase,
      typo: atTarget.typo,
      lensVisible: atTarget.lensVisible,
    };
    assert(
      atTarget.pointIndex === TARGET.pointIndex && atTarget.id === TARGET.id,
      `expected ${TARGET.id} before leave, got ${atTarget.id}@${atTarget.pointIndex}`
    );
    await page.screenshot({
      path: join(outDir, '01-before-leave.png'),
      fullPage: false,
    });

    // Leave via RouteTransition bridge (captures live stop — not hardcoded last).
    await page.evaluate(async () => {
      const bridge = document.querySelector('[data-mark-signature]');
      void bridge;
      // Prefer clicking a synthetic link so capture + bridge both run.
      const a = document.createElement('a');
      a.href = '/work';
      a.textContent = 'work';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    await page.waitForURL(/\/work/, { timeout: 20000 });
    await page.waitForTimeout(600);
    const stored = await readStorage(page);
    report.checks.storageAfterLeave = stored;
    assert(stored?.v === 1, 'storage v:1 required');
    assert(
      stored?.pointIndex === TARGET.pointIndex && stored?.stopId === TARGET.id,
      `storage must capture active stop ${TARGET.id}, got ${JSON.stringify(stored)}`
    );
    assert(
      stored?.exitHref === '/work' || stored?.exitHref == null,
      'exitHref should be /work when bridged'
    );

    await page.screenshot({
      path: join(outDir, '02-on-work.png'),
      fullPage: false,
    });

    // Browser back → restore
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => {
      const p = new URL(url).pathname.replace(/\/$/, '') || '/';
      return p === '/';
    }, { timeout: 20000 });

    const restored = await waitFor(
      page,
      (d) =>
        d.snapArmed &&
        !d.openingHeld &&
        d.pointIndex === TARGET.pointIndex &&
        d.id === TARGET.id &&
        (d.phase === 'holdGate' || d.phase === 'idle'),
      { timeout: 90000 }
    );

    // Loader skip: restore should not sit in scroll-loader long; loadProgress 1 + loaderGone.
    report.checks.restoredDebug = restored;
    report.checks.loaderSkipped =
      restored.loaderGone === true ||
      restored.restorePending === true ||
      restored.loadProgress >= 1;
    report.checks.frameMatch =
      restored.frame1 === TARGET.masterFrame ||
      restored.masterFrame === TARGET.masterFrame;
    report.checks.typologyEnterOrHold =
      restored.typo === 'enter' || restored.typo === 'hold';
    report.checks.lensVisible = restored.lensVisible === true;
    report.checks.storageClearedAfterRestore =
      (await readStorage(page)) == null;

    await page.waitForTimeout(500);
    const canvas = await sampleCanvasStats(page);
    report.checks.canvas = canvas;
    report.checks.notBlankPaint =
      canvas != null &&
      canvas.blackRatio < 0.92 &&
      (canvas.meanR > 8 || canvas.meanG > 8 || canvas.meanB > 8);

    await page.screenshot({
      path: join(outDir, '03-restored.png'),
      fullPage: false,
    });

    assert(report.checks.frameMatch, 'restored freeze frame mismatch');
    assert(
      report.checks.typologyEnterOrHold,
      `typology must enter/hold, got ${restored.typo}`
    );
    assert(report.checks.lensVisible, 'lens must be visible on statue restore');
    assert(report.checks.notBlankPaint, 'canvas must not be blank/cold');
    assert(
      report.checks.storageClearedAfterRestore,
      'storage must clear after successful restore'
    );

    // Second mid-stop: shiva via leave from restored position after advancing once more.
    await waitFor(page, (d) => d.phase === 'idle', { timeout: 30000 });
    await page.keyboard.press('ArrowDown');
    const atShiva = await waitFor(
      page,
      (d) =>
        d.pointIndex === 2 &&
        d.id === 'shiva' &&
        (d.phase === 'holdGate' || d.phase === 'idle'),
      { timeout: 60000 }
    );
    await waitFor(page, (d) => d.phase === 'idle', { timeout: 30000 });
    report.checks.reachedShiva = {
      pointIndex: atShiva.pointIndex,
      id: atShiva.id,
      frame1: atShiva.frame1,
    };

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = '/work';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    await page.waitForURL(/\/work/, { timeout: 20000 });
    const storedShiva = await readStorage(page);
    report.checks.storageShiva = storedShiva;
    assert(
      storedShiva?.pointIndex === 2 && storedShiva?.stopId === 'shiva',
      `mid-journey shiva capture failed: ${JSON.stringify(storedShiva)}`
    );
    await page.goBack({ waitUntil: 'domcontentloaded' });
    const restoredShiva = await waitFor(
      page,
      (d) =>
        d.pointIndex === 2 &&
        d.id === 'shiva' &&
        (d.phase === 'holdGate' || d.phase === 'idle'),
      { timeout: 90000 }
    );
    report.checks.restoredShiva = {
      pointIndex: restoredShiva.pointIndex,
      id: restoredShiva.id,
      frame1: restoredShiva.frame1,
      typo: restoredShiva.typo,
      lensVisible: restoredShiva.lensVisible,
    };
    await page.screenshot({
      path: join(outDir, '04-restored-shiva.png'),
      fullPage: false,
    });
    assert(
      restoredShiva.frame1 === 530 || restoredShiva.masterFrame === 530,
      'shiva freeze mismatch'
    );
    assert(restoredShiva.lensVisible, 'shiva lens missing');

    report.pass = true;
    console.log('PASS', JSON.stringify(report.checks, null, 2));
  } catch (err) {
    report.pass = false;
    report.error = err instanceof Error ? err.message : String(err);
    console.error('FAIL', report.error);
    try {
      await page.screenshot({
        path: join(outDir, 'fail.png'),
        fullPage: false,
      });
    } catch {
      /* ignore */
    }
  } finally {
    writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }

  if (!report.pass) process.exit(1);
}

main();
