/**
 * Live production Hero (`/`) Phase B 9-stop + handoff + audio verification.
 * REPORT ONLY — writes JSON + screenshots under public/verify/hero-snap/.
 *
 * Prefer http://localhost:3000/ ; override with HERO_SNAP_URL.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify', 'hero-snap');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.HERO_SNAP_URL || 'http://localhost:3001/';

/** Expected freeze = masterFrame (1:1 bake). */
const STOPS = [
  { id: 'lying-1', kind: 'statue', masterFrame: 310, statueId: 'lying-hanuman' },
  { id: 'standing-hanuman', kind: 'statue', masterFrame: 430, statueId: 'standing-hanuman' },
  { id: 'shiva', kind: 'statue', masterFrame: 530, statueId: 'shiva' },
  { id: 'radha-krishna', kind: 'statue', masterFrame: 635, statueId: 'radha-krishna' },
  { id: 'lying-2', kind: 'statue', masterFrame: 760, statueId: 'lying-hanuman' },
  { id: 'reverse-hall', kind: 'passage', masterFrame: 910, statueId: 'passage' },
  { id: 'reverse-threshold', kind: 'passage', masterFrame: 970, statueId: 'passage' },
  { id: 'reverse-forecourt', kind: 'passage', masterFrame: 1030, statueId: 'passage' },
  { id: 'entrance-sky-ascend', kind: 'passage', masterFrame: 1200, statueId: 'passage' },
];

async function readDebug(page) {
  return page.evaluate(() => {
    const d =
      /** @type {any} */ (window).__HERO_SNAP_DEBUG__ || null;
    const hero = document.querySelector('[data-hero-snap="1"]');
    const typology = !!document.querySelector('[aria-live="polite"]');
    const lensImg = document.querySelector('img[src*="/lab/snap/lenses/"]');
    const eyebrowEl = document.querySelector(
      '[aria-live="polite"] [class*="eyebrow"]'
    );
    const lineEls = [
      ...document.querySelectorAll('[aria-live="polite"] [class*="line"]'),
    ];
    const loaderBusy = !!document.querySelector(
      '[aria-busy="true"][aria-live="polite"]'
    );
    const scrollCue = !!document.querySelector('[class*="scrollCue"]');
    const audioBtn = document.querySelector(
      'button[aria-label*="soundscape"], button[aria-label*="Sound"]'
    );
    return {
      phase: d?.phase ?? hero?.getAttribute('data-hero-phase') ?? null,
      typo: d?.typologyMode ?? null,
      stopIndex: d?.pointIndex != null ? d.pointIndex + 1 : null,
      id: d?.stopId ?? null,
      kind: d?.kind ?? null,
      statue: d?.statueId ?? null,
      bakeFrame:
        d?.frame1 ??
        (Number(hero?.getAttribute('data-hero-frame')) || null),
      masterFrame: d?.masterFrame ?? null,
      snapArmed: d?.snapArmed ?? null,
      openingHeld: d?.openingHeld ?? hero?.getAttribute('data-opening-held') === 'true',
      diveArmed: hero?.getAttribute('data-dive-armed') === 'true',
      loadProgress: d?.loadProgress ?? null,
      framesReady: d?.framesReady ?? null,
      loaderGone: d?.loaderGone ?? null,
      firstPaintDone: d?.firstPaintDone ?? null,
      typologyVisible: typology,
      lensVisible: !!lensImg,
      lensSrc: lensImg?.getAttribute('src') || null,
      eyebrow: eyebrowEl?.textContent?.trim() || null,
      lines: lineEls.map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
      loaderBusy,
      scrollCue,
      audioLabel: audioBtn?.getAttribute('aria-label') || null,
      audioPressed: audioBtn?.getAttribute('aria-pressed') || null,
      paint: /** @type {any} */ (window).__journeyLastPaint || null,
    };
  });
}

async function readAudio(page) {
  return page.evaluate(() => {
    const sc = /** @type {any} */ (window).__TEMPLE_SOUNDSCAPE__;
    if (!sc?.getDebugSnapshot) return null;
    return sc.getDebugSnapshot();
  });
}

async function waitFor(page, pred, { timeout = 120000, interval = 40 } = {}) {
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

async function advance(page) {
  await page.keyboard.press('ArrowDown');
}

async function driveLoader(page, { timeout = 90000 } = {}) {
  const t0 = Date.now();
  let lastProgress = 0;
  while (Date.now() - t0 < timeout) {
    const d = await readDebug(page);
    if (d.loaderGone || d.diveArmed || (d.snapArmed && !d.openingHeld)) {
      return d;
    }
    // Wheel pages to fill scroll-intent load (~6.67 vh pages → 100%).
    await page.mouse.wheel(0, 900);
    await page.keyboard.press('ArrowDown');
    lastProgress = d.loadProgress ?? lastProgress;
    await page.waitForTimeout(40);
  }
  throw new Error(
    `driveLoader timeout lastProgress=${lastProgress} last=${JSON.stringify(
      await readDebug(page)
    )}`
  );
}

async function sampleCanvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-hero-snap-stage="1"] canvas, [data-hero-snap="1"] canvas');
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
      n = 0;
    for (let i = 0; i < d.length; i += 16) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
    return { meanR: r / n, meanG: g / n, meanB: b / n, w, h };
  });
}

function meanDelta(a, b) {
  if (!a || !b) return null;
  return (
    (Math.abs(a.meanR - b.meanR) +
      Math.abs(a.meanG - b.meanG) +
      Math.abs(a.meanB - b.meanB)) /
    3
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const report = {
  url: BASE,
  startedAt: new Date().toISOString(),
  frameCountOnDiskHint: 1200,
  handoff: null,
  soundToggle: null,
  radhaKrishnaSwell: null,
  stops: [],
  phaseLog: [],
  lying2Distinct: null,
  f790_800: null,
  summary: {},
};

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    report.phaseLog.push({ t: Date.now(), consoleError: msg.text() });
  }
});

console.log(`Navigating ${BASE} (full Hero handoff — no ?verify)`);
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('[data-hero-snap="1"]', { timeout: 60000 });
await page.waitForTimeout(500);

// ---- Handoff: loader → blast/iris → dive unlock → snap arm ----
const handoff = {
  pass: false,
  failReasons: [],
  events: [],
  notes: [],
};

const bootDebug = await readDebug(page);
handoff.events.push({ event: 'boot', ...bootDebug });
await page.screenshot({
  path: join(outDir, 'handoff-00-boot.png'),
  fullPage: false,
});

console.log('Driving loader scroll-intent…');
let afterLoader;
try {
  afterLoader = await driveLoader(page, { timeout: 120000 });
  handoff.events.push({ event: 'loader-driven', ...afterLoader });
} catch (e) {
  handoff.failReasons.push(String(e.message || e));
  afterLoader = await readDebug(page);
}

await page.screenshot({
  path: join(outDir, 'handoff-01-post-loader-drive.png'),
  fullPage: false,
});

// Wait for blast / iris / dive arm / snap arm
let postHandoff;
try {
  postHandoff = await waitFor(
    page,
    (h) =>
      h.diveArmed === true &&
      h.openingHeld === false &&
      h.snapArmed === true &&
      h.phase != null &&
      !h.loaderBusy,
    { timeout: 45000, interval: 50 }
  );
  handoff.events.push({ event: 'snap-armed', ...postHandoff });
  handoff.notes.push('Loader completed; dive armed; opening hold released; snap armed');
} catch (e) {
  handoff.failReasons.push(`snap arm failed: ${e.message}`);
  postHandoff = await readDebug(page);
  handoff.events.push({ event: 'snap-arm-timeout', ...postHandoff });
}

await page.screenshot({
  path: join(outDir, 'handoff-02-snap-armed.png'),
  fullPage: false,
});

// First statue: holdGate → typology enter → unlock → idle + typo hold
let hud;
try {
  hud = await waitFor(
    page,
    (h) =>
      h.id === 'lying-1' &&
      h.phase === 'idle' &&
      h.typo === 'hold' &&
      h.typologyVisible &&
      h.lensVisible,
    { timeout: 20000 }
  );
  handoff.events.push({ event: 'first-stop-idle', ...hud });
  handoff.notes.push('Can advance after unlock (idle + typo hold at lying-1)');
} catch (e) {
  handoff.failReasons.push(`first stop unlock failed: ${e.message}`);
  hud = await readDebug(page);
}

// Confirm advance works (briefly peek traveling then wait back — don't skip stop)
{
  const beforeAdvance = await readDebug(page);
  if (beforeAdvance.phase === 'idle' && beforeAdvance.id === 'lying-1') {
    // Stay on lying-1 for stop loop; just confirm gesture is accepted later.
    handoff.notes.push('Gesture path ready at idle lying-1');
  } else if (beforeAdvance.phase !== 'idle') {
    handoff.failReasons.push(
      `expected idle at lying-1 after handoff, got phase=${beforeAdvance.phase} id=${beforeAdvance.id}`
    );
  }
}

if (!postHandoff?.diveArmed) handoff.failReasons.push('dive never armed');
if (postHandoff?.openingHeld) handoff.failReasons.push('openingHeld stuck true');
if (postHandoff?.loaderBusy) handoff.failReasons.push('loader still busy');
if (hud?.phase !== 'idle' || hud?.id !== 'lying-1') {
  handoff.failReasons.push('did not settle idle at lying-1 after handoff');
}

handoff.pass = handoff.failReasons.length === 0;
report.handoff = handoff;
console.log(
  `${handoff.pass ? 'PASS' : 'FAIL'} handoff :: ${handoff.failReasons.join('; ') || 'ok'}`
);

// ---- Sound toggle after journey armed ----
const soundToggle = {
  pass: false,
  failReasons: [],
  samples: [],
};
try {
  // Dive unlock may already unmute — record baseline then toggle.
  await page.waitForSelector(
    'button[aria-label*="soundscape"], button[aria-label*="Sound"]',
    { timeout: 10000 }
  );
  const btn = page.locator(
    'button[aria-label*="soundscape"], button[aria-label*="Sound"]'
  );
  const a0 = await readAudio(page);
  const d0 = await readDebug(page);
  soundToggle.samples.push({ step: 'baseline', audio: a0, ui: d0.audioLabel });

  // Ensure unmuted first
  if (d0.audioPressed !== 'true') {
    await btn.click();
    await page.waitForTimeout(300);
  }
  const a1 = await readAudio(page);
  const d1 = await readDebug(page);
  soundToggle.samples.push({ step: 'unmuted', audio: a1, ui: d1.audioLabel });

  await btn.click();
  await page.waitForTimeout(350);
  const a2 = await readAudio(page);
  const d2 = await readDebug(page);
  soundToggle.samples.push({ step: 'muted', audio: a2, ui: d2.audioLabel });

  await btn.click();
  await page.waitForTimeout(350);
  const a3 = await readAudio(page);
  const d3 = await readDebug(page);
  soundToggle.samples.push({ step: 'unmuted-again', audio: a3, ui: d3.audioLabel });

  if (!a1?.journeyArmed && !a3?.journeyArmed) {
    soundToggle.failReasons.push('journey not armed on soundscape');
  }
  if (a2 && a2.muted !== true && (a2.targetAmbient ?? 0) > 0.01) {
    soundToggle.failReasons.push(
      `mute did not silence ambient (target=${a2.targetAmbient})`
    );
  }
  if (d2.audioPressed === 'true') {
    soundToggle.failReasons.push('UI still aria-pressed=true after mute');
  }
  if (d3.audioPressed !== 'true') {
    soundToggle.failReasons.push('UI not pressed after unmute');
  }
  if (a3 && a3.muted === true) {
    soundToggle.failReasons.push('soundscape still muted after unmute click');
  }
  // Leave unmuted for RK swell test
} catch (e) {
  soundToggle.failReasons.push(String(e.message || e));
}
soundToggle.pass = soundToggle.failReasons.length === 0;
report.soundToggle = soundToggle;
console.log(
  `${soundToggle.pass ? 'PASS' : 'FAIL'} soundToggle :: ${soundToggle.failReasons.join('; ') || 'ok'}`
);

await page.screenshot({
  path: join(outDir, 'sound-toggle.png'),
  fullPage: false,
});

// Ensure idle at lying-1 before stop loop
hud = await waitFor(
  page,
  (h) => h.id === 'lying-1' && h.phase === 'idle' && h.typo === 'hold',
  { timeout: 15000 }
).catch(async () => readDebug(page));

let lying1Freeze = null;
let lying2Freeze = null;
let lying1Copy = null;
let lying2Copy = null;
const f790Samples = [];
let rkBaselineGain = null;
let rkHoldGain = null;
let rkAfterGain = null;

for (let i = 0; i < STOPS.length; i++) {
  const expected = STOPS[i];
  const stopResult = {
    index: i + 1,
    id: expected.id,
    kind: expected.kind,
    expectedMaster: expected.masterFrame,
    phasesSeen: [],
    pass: false,
    failReasons: [],
    freezeBake: null,
    freezeMaster: null,
    typologyAtHold: null,
    lensAtHold: null,
    eyebrow: null,
    lines: null,
    travelMs: null,
    audioAtHold: null,
  };

  if (i > 0) {
    const before = await readDebug(page);
    if (before.phase !== 'idle') {
      stopResult.failReasons.push(
        `pre-advance phase was ${before.phase}, expected idle`
      );
    }

    const phases = [];
    const pushPhase = (p) => {
      if (p && phases[phases.length - 1] !== p) phases.push(p);
    };
    pushPhase(before.phase);

    const tTravel0 = Date.now();
    await advance(page);

    let sawTraveling = false;
    let sawHoldGate = false;
    let lastHud = before;
    const deadline = Date.now() + 180000;

    while (Date.now() < deadline) {
      lastHud = await readDebug(page);
      pushPhase(lastHud.phase);
      if (lastHud.phase === 'traveling') sawTraveling = true;

      if (
        expected.id === 'reverse-hall' &&
        lastHud.phase === 'traveling' &&
        lastHud.bakeFrame != null &&
        lastHud.bakeFrame >= 785 &&
        lastHud.bakeFrame <= 805
      ) {
        const stats = await sampleCanvasStats(page);
        const prevSample = f790Samples[f790Samples.length - 1];
        if (!prevSample || prevSample.bakeFrame !== lastHud.bakeFrame) {
          f790Samples.push({
            bakeFrame: lastHud.bakeFrame,
            t: Date.now() - tTravel0,
            stats,
          });
          if (
            lastHud.bakeFrame === 790 ||
            lastHud.bakeFrame === 795 ||
            lastHud.bakeFrame === 800
          ) {
            await page.screenshot({
              path: join(
                outDir,
                `f${String(lastHud.bakeFrame).padStart(4, '0')}.png`
              ),
              fullPage: false,
            });
          }
        }
      }

      if (lastHud.phase === 'holdGate') {
        sawHoldGate = true;
        if (expected.kind === 'statue') {
          stopResult.typologyAtHold = lastHud.typologyVisible;
          stopResult.lensAtHold = lastHud.lensVisible;
        }
      }

      if (
        lastHud.phase === 'idle' &&
        lastHud.id === expected.id &&
        lastHud.stopIndex === i + 1
      ) {
        stopResult.travelMs = Date.now() - tTravel0;
        break;
      }

      const nearLensEase =
        expected.id === 'reverse-hall' &&
        lastHud.bakeFrame != null &&
        lastHud.bakeFrame >= 780 &&
        lastHud.bakeFrame <= 810;
      await page.waitForTimeout(nearLensEase ? 8 : 30);
    }

    stopResult.phasesSeen = phases;
    hud = lastHud;

    if (!sawTraveling) {
      stopResult.failReasons.push('never observed traveling');
    }

    if (expected.kind === 'statue') {
      if (!sawHoldGate && !phases.includes('holdGate')) {
        if (
          !hud.typologyVisible &&
          hud.typo !== 'hold' &&
          hud.typo !== 'enter'
        ) {
          stopResult.failReasons.push('statue stop: no holdGate / typology');
        }
      }
      if (hud.typo !== 'hold') {
        try {
          hud = await waitFor(
            page,
            (h) =>
              h.id === expected.id &&
              h.phase === 'idle' &&
              h.typo === 'hold' &&
              h.typologyVisible,
            { timeout: 12000 }
          );
        } catch (e) {
          stopResult.failReasons.push(
            `statue unlock/hold failed: ${e.message}`
          );
        }
      }
      if (!hud.typologyVisible) {
        stopResult.failReasons.push('typology not visible at hold');
      }
      if (!hud.lensVisible) {
        stopResult.failReasons.push('lens not visible at hold');
      }
      if (hud.typo !== 'hold') {
        stopResult.failReasons.push(`expected typo hold, got ${hud.typo}`);
      }
      stopResult.typologyAtHold = hud.typologyVisible;
      stopResult.lensAtHold = hud.lensVisible;
    } else {
      if (hud.phase !== 'idle') {
        stopResult.failReasons.push(`passage ended in phase ${hud.phase}`);
      }
      if (hud.eyebrow === 'PASSAGE' && hud.typologyVisible) {
        stopResult.failReasons.push('passage showed typology gate');
      }
    }
  } else {
    stopResult.phasesSeen = ['holdGate', 'idle'];
    stopResult.typologyAtHold = hud.typologyVisible;
    stopResult.lensAtHold = hud.lensVisible;
    if (!hud.typologyVisible) stopResult.failReasons.push('boot: no typology');
    if (!hud.lensVisible) stopResult.failReasons.push('boot: no lens');
    if (hud.typo !== 'hold') stopResult.failReasons.push(`boot typo=${hud.typo}`);
  }

  stopResult.freezeBake = hud.bakeFrame;
  stopResult.freezeMaster = hud.masterFrame ?? expected.masterFrame;
  stopResult.eyebrow = hud.eyebrow;
  stopResult.lines = hud.lines;
  stopResult.finalHud = {
    phase: hud.phase,
    typo: hud.typo,
    id: hud.id,
    kind: hud.kind,
    statue: hud.statue,
  };

  // Audio sample at statue holds (esp. RK)
  const audioSnap = await readAudio(page);
  stopResult.audioAtHold = audioSnap;

  if (expected.id === 'standing-hanuman' && audioSnap) {
    rkBaselineGain = audioSnap.displayedAmbient ?? audioSnap.targetAmbient;
  }
  if (expected.id === 'radha-krishna' && audioSnap) {
    // Wait briefly for volume lerp toward swell
    await page.waitForTimeout(500);
    const aRk = await readAudio(page);
    stopResult.audioAtHold = aRk;
    rkHoldGain = aRk?.displayedAmbient ?? aRk?.targetAmbient ?? null;
    if (!aRk?.inRadhaKrishnaHold) {
      stopResult.failReasons.push(
        `RK hold flag false at frame ${aRk?.lastFrame}`
      );
    }
  }
  if (expected.id === 'lying-2' && audioSnap) {
    await page.waitForTimeout(400);
    const aAfter = await readAudio(page);
    rkAfterGain = aAfter?.displayedAmbient ?? aAfter?.targetAmbient ?? null;
  }

  if (hud.id !== expected.id) {
    stopResult.failReasons.push(`id ${hud.id} !== ${expected.id}`);
  }
  if (hud.kind !== expected.kind) {
    stopResult.failReasons.push(`kind ${hud.kind} !== ${expected.kind}`);
  }
  if (hud.bakeFrame !== expected.masterFrame) {
    stopResult.failReasons.push(
      `bake freeze ${hud.bakeFrame} !== expected ${expected.masterFrame}`
    );
  }
  // masterFrame on debug is from point table; must match bake for 1:1
  if (
    hud.masterFrame != null &&
    hud.masterFrame !== expected.masterFrame
  ) {
    stopResult.failReasons.push(
      `master freeze ${hud.masterFrame} !== expected ${expected.masterFrame}`
    );
  }
  if (
    hud.masterFrame != null &&
    hud.bakeFrame != null &&
    hud.bakeFrame !== hud.masterFrame
  ) {
    stopResult.failReasons.push(
      `bake≠master (${hud.bakeFrame} vs ${hud.masterFrame})`
    );
  }

  if (expected.id === 'lying-1') {
    lying1Freeze = hud.bakeFrame;
    lying1Copy = { eyebrow: hud.eyebrow, lines: hud.lines };
  }
  if (expected.id === 'lying-2') {
    lying2Freeze = hud.bakeFrame;
    lying2Copy = { eyebrow: hud.eyebrow, lines: hud.lines };
  }

  await page.screenshot({
    path: join(
      outDir,
      `stop-${String(i + 1).padStart(2, '0')}-${expected.id}.png`
    ),
    fullPage: false,
  });

  stopResult.pass = stopResult.failReasons.length === 0;
  report.stops.push(stopResult);
  console.log(
    `${stopResult.pass ? 'PASS' : 'FAIL'} ${i + 1}/${STOPS.length} ${expected.id}` +
      ` bake=${stopResult.freezeBake}` +
      ` phases=${stopResult.phasesSeen.join('→')}` +
      (stopResult.failReasons.length
        ? ` :: ${stopResult.failReasons.join('; ')}`
        : '')
  );
}

const copyDistinct =
  lying1Copy &&
  lying2Copy &&
  JSON.stringify(lying1Copy.lines) !== JSON.stringify(lying2Copy.lines);
const frameDistinct = lying1Freeze !== lying2Freeze;
report.lying2Distinct = {
  lying1Freeze,
  lying2Freeze,
  lying1Copy,
  lying2Copy,
  frameDistinct,
  copyDistinct,
  pass: !!(frameDistinct && copyDistinct),
};

const uniqueFrames = [...new Set(f790Samples.map((s) => s.bakeFrame))].sort(
  (a, b) => a - b
);
const deltas = [];
for (let i = 1; i < f790Samples.length; i++) {
  const prev = f790Samples[i - 1];
  const cur = f790Samples[i];
  if (prev.bakeFrame === cur.bakeFrame) continue;
  const d = meanDelta(prev.stats, cur.stats);
  deltas.push({
    from: prev.bakeFrame,
    to: cur.bakeFrame,
    meanChannelDelta: d,
  });
}
const maxDelta = deltas.reduce(
  (m, d) =>
    d.meanChannelDelta != null && d.meanChannelDelta > m
      ? d.meanChannelDelta
      : m,
  0
);
const HITCH_THRESHOLD = 45;
report.f790_800 = {
  samples: f790Samples.map((s) => ({
    bakeFrame: s.bakeFrame,
    t: s.t,
    meanR: s.stats?.meanR,
    meanG: s.stats?.meanG,
    meanB: s.stats?.meanB,
  })),
  uniqueFrames,
  consecutiveDeltas: deltas,
  maxMeanChannelDelta: maxDelta,
  hitchThreshold: HITCH_THRESHOLD,
  coveredWindow:
    uniqueFrames.some((f) => f >= 790) && uniqueFrames.some((f) => f <= 800),
  pass:
    uniqueFrames.some((f) => f >= 790 && f <= 800) && maxDelta < HITCH_THRESHOLD,
  note: 'Lens ease baked into WebP; pass = played f790–800 via Hero snap travel without large mean-channel jump.',
};

// RK swell verdict (baseline at standing-hanuman, peak at RK, return at lying-2)
const swellRatio =
  rkBaselineGain != null &&
  rkHoldGain != null &&
  rkBaselineGain > 0.01
    ? rkHoldGain / rkBaselineGain
    : null;
const returned =
  rkHoldGain != null &&
  rkAfterGain != null &&
  rkAfterGain < rkHoldGain * 0.95;
report.radhaKrishnaSwell = {
  baselineGain: rkBaselineGain,
  holdGain: rkHoldGain,
  afterGain: rkAfterGain,
  swellRatio,
  expectedSwellApprox: 1.28,
  returned,
  pass:
    swellRatio != null &&
    swellRatio >= 1.1 &&
    returned === true &&
    rkHoldGain > (rkBaselineGain ?? 0),
  failReasons: [],
};
if (swellRatio == null) {
  report.radhaKrishnaSwell.failReasons.push('missing gain samples');
} else if (swellRatio < 1.1) {
  report.radhaKrishnaSwell.failReasons.push(
    `swellRatio ${swellRatio.toFixed(3)} < 1.1`
  );
}
if (!returned) {
  report.radhaKrishnaSwell.failReasons.push('gain did not drop after leaving RK hold');
}
if (report.radhaKrishnaSwell.failReasons.length) {
  report.radhaKrishnaSwell.pass = false;
}

report.finishedAt = new Date().toISOString();
report.summary = {
  handoffPass: report.handoff.pass,
  soundTogglePass: report.soundToggle.pass,
  radhaKrishnaSwellPass: report.radhaKrishnaSwell.pass,
  stopPassCount: report.stops.filter((s) => s.pass).length,
  stopFailCount: report.stops.filter((s) => !s.pass).length,
  allStopsPass: report.stops.every((s) => s.pass),
  lying2DistinctPass: report.lying2Distinct.pass,
  f790_800Pass: report.f790_800.pass,
  overallPass:
    report.handoff.pass &&
    report.soundToggle.pass &&
    report.radhaKrishnaSwell.pass &&
    report.stops.every((s) => s.pass) &&
    report.lying2Distinct.pass &&
    report.f790_800.pass,
  goNoGo: null,
};
report.summary.goNoGo = report.summary.overallPass ? 'GO' : 'NO-GO';

const jsonPath = join(outDir, 'phase-report.json');
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Wrote ${jsonPath}`);
console.log(
  `lying-2 distinct: freeze ${lying1Freeze} vs ${lying2Freeze}; copyDistinct=${copyDistinct}`
);
console.log(
  `f790-800: frames=${uniqueFrames.join(',')} maxDelta=${maxDelta.toFixed(2)} pass=${report.f790_800.pass}`
);
console.log(
  `RK swell: baseline=${rkBaselineGain} hold=${rkHoldGain} after=${rkAfterGain} ratio=${swellRatio}`
);
console.log(`OVERALL: ${report.summary.goNoGo}`);

await browser.close();
process.exit(report.summary.overallPass ? 0 : 1);
