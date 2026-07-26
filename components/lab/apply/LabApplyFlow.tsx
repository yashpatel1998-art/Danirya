'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { gsap } from 'gsap';
import { LAB_BACKDROP_SRC } from '@/lib/lab/backdrop';
import {
  CLIP_WIPE_EASE,
  CLIP_WIPE_ENTER_DURATION,
  CLIP_WIPE_HIDDEN,
  CLIP_WIPE_OPEN,
} from '@/lib/motion/clipWipeReveal';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import {
  BUDGETS,
  COUNTRY_CODES,
  detectCountryIso,
  FAQ_ITEMS,
  MIN_DETAILS,
  PROJECT_TYPES,
  TIMELINES,
} from './options';
import styles from './LabApplyFlow.module.css';

/** Gentler settle for supporting copy / inputs after the heading wipe. */
const SOFT_FADE_DURATION = 0.55;
const SOFT_FADE_STAGGER = 0.06;
/** Slightly held wipe — clearer Pasqua reveal on each step title. */
const TITLE_WIPE_DURATION = Math.max(CLIP_WIPE_ENTER_DURATION, 0.95);

const TOTAL_STEPS = 6;

type FormData = {
  name: string;
  email: string;
  phoneLocal: string;
  countryIso: string;
  projectType: string;
  budget: string;
  companyWebsite: string;
  timeline: string;
  vision: string;
};

const initialForm = (): FormData => ({
  name: '',
  email: '',
  phoneLocal: '',
  countryIso: 'US',
  projectType: '',
  budget: '',
  companyWebsite: '',
  timeline: '',
  vision: '',
});

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function dialForIso(iso: string): string {
  return COUNTRY_CODES.find((c) => c.iso === iso)?.dial ?? '+';
}

function formatPhone(iso: string, local: string): string {
  const trimmed = local.trim();
  if (!trimmed) return '';
  const dial = dialForIso(iso);
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/^0+/, '');
  return `${dial} ${digits}`.trim();
}

/**
 * 6-screen mobile-first application flow for /apply and /lab/apply.
 * Posts to existing /api/contact (Resend).
 */
export function LabApplyFlow() {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [error, setError] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, countryIso: detectCountryIso() }));
    setHydrated(true);
  }, []);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const validateStep = useCallback(
    (index: number): string | null => {
      if (index === 1) {
        if (!form.name.trim()) return 'Please enter your name.';
        if (!form.email.trim()) return 'Please enter your email.';
        if (!isValidEmail(form.email)) return 'Enter a valid email address.';
        return null;
      }
      if (index === 2) {
        if (!form.projectType) return 'Select a project type.';
        if (!form.budget) return 'Select a budget range.';
        return null;
      }
      if (index === 3) {
        if (!form.timeline) return 'Select a timeline.';
        return null;
      }
      if (index === 4) {
        const len = form.vision.trim().length;
        if (len < MIN_DETAILS) {
          return `Share a bit more — at least ${MIN_DETAILS} characters (${len}/${MIN_DETAILS}).`;
        }
        return null;
      }
      return null;
    },
    [form],
  );

  const goTo = useCallback(
    (next: number, direction: 1 | -1) => {
      if (next < 0 || next >= TOTAL_STEPS) return;
      if (direction === 1) {
        const err = validateStep(step);
        if (err) {
          setError(err);
          return;
        }
      }
      setError('');
      setStep(next);
    },
    [step, validateStep],
  );

  const goNext = () => goTo(step + 1, 1);
  const goBack = () => goTo(step - 1, -1);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    timelineRef.current?.kill();

    const wipe = panel.querySelector<HTMLElement>('[data-clip-wipe]');
    const soft = panel.querySelectorAll<HTMLElement>('[data-soft-fade]');

    if (prefersReducedMotion()) {
      if (wipe) gsap.set(wipe, { clipPath: CLIP_WIPE_OPEN });
      if (soft.length) gsap.set(soft, { opacity: 1, y: 0 });
      return;
    }

    // Heading: Pasqua / Adoratorio non-fading mask wipe (clip-path only).
    // Soft nodes: calm settle via transform + opacity after the wipe.
    if (wipe) gsap.set(wipe, { clipPath: CLIP_WIPE_HIDDEN });
    if (soft.length) gsap.set(soft, { opacity: 0, y: 10 });

    const tl = gsap.timeline();
    if (wipe) {
      tl.to(wipe, {
        clipPath: CLIP_WIPE_OPEN,
        duration: TITLE_WIPE_DURATION,
        ease: CLIP_WIPE_EASE,
      });
    }
    if (soft.length) {
      tl.to(
        soft,
        {
          opacity: 1,
          y: 0,
          duration: SOFT_FADE_DURATION,
          ease: CLIP_WIPE_EASE,
          stagger: SOFT_FADE_STAGGER,
        },
        wipe ? '>-0.12' : 0,
      );
    }
    timelineRef.current = tl;

    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, [step, status]);

  const handleSubmit = async () => {
    setError('');
    const contactErr = validateStep(1);
    const projectErr = validateStep(2);
    const timelineErr = validateStep(3);
    const visionErr = validateStep(4);
    const gate = contactErr || projectErr || timelineErr || visionErr;
    if (gate) {
      setStatus('error');
      setError(gate);
      return;
    }

    setStatus('loading');

    const details = [
      form.projectType ? `Project type: ${form.projectType}` : '',
      form.vision.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          companyWebsite: form.companyWebsite.trim(),
          phone: formatPhone(form.countryIso, form.phoneLocal),
          budget: form.budget,
          timeline: form.timeline,
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Submission failed.');
    }
  };

  const visionLen = form.vision.trim().length;
  const dial = dialForIso(form.countryIso);

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.backdrop} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.backdropImg}
          src={LAB_BACKDROP_SRC}
          alt=""
          width={1920}
          height={1080}
          decoding="async"
          draggable={false}
        />
        <div className={styles.backdropWash} />
      </div>

      <div className={styles.shell}>
        <header className={styles.topBar}>
          <p className={styles.brandMark}>Gilt Foundry</p>
          {status !== 'success' && (
            <p className={styles.stepMeta} aria-live="polite">
              {step + 1}/{TOTAL_STEPS}
            </p>
          )}
        </header>

        {status !== 'success' && (
          <div className={styles.dots} aria-hidden>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`}
              />
            ))}
          </div>
        )}

        <div className={styles.panelWrap}>
          <div ref={panelRef} className={styles.panel} key={`${step}-${status}`}>
            {status === 'success' ? (
              <SuccessClose />
            ) : (
              <>
                {step === 0 && <IntroScreen onAdvance={goNext} />}
                {step === 1 && (
                  <ContactScreen
                    baseId={baseId}
                    form={form}
                    dial={dial}
                    hydrated={hydrated}
                    onChange={update}
                  />
                )}
                {step === 2 && (
                  <ProjectScreen
                    baseId={baseId}
                    form={form}
                    onChange={update}
                  />
                )}
                {step === 3 && (
                  <TimelineScreen
                    timeline={form.timeline}
                    onSelect={(v) => update('timeline', v)}
                  />
                )}
                {step === 4 && (
                  <VisionScreen
                    baseId={baseId}
                    vision={form.vision}
                    visionLen={visionLen}
                    onChange={(v) => update('vision', v)}
                  />
                )}
                {step === 5 && (
                  <ConfirmScreen
                    form={form}
                    phoneDisplay={formatPhone(
                      form.countryIso,
                      form.phoneLocal,
                    )}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {error && status !== 'success' && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {status !== 'success' && step > 0 && (
          <nav className={styles.nav} aria-label="Form navigation">
            <button
              type="button"
              className={styles.btnGhost}
              onClick={goBack}
              disabled={status === 'loading'}
            >
              Back
            </button>
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={goNext}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Sending…' : 'Send application'}
              </button>
            )}
          </nav>
        )}
      </div>

      <section className={styles.faqSection} aria-labelledby={`${baseId}-faq-heading`}>
        <div className={styles.faqDivider} aria-hidden />
        <div className={styles.faqInner}>
          <h2 id={`${baseId}-faq-heading`} className={styles.faqHeading}>
            Questions
          </h2>
          <div className={styles.faqPanel}>
            {FAQ_ITEMS.map((item, i) => {
              const open = faqOpen === i;
              const panelId = `${baseId}-faq-panel-${i}`;
              return (
                <div
                  key={item.q}
                  className={`${styles.faqItem}${open ? ` ${styles.faqItemOpen}` : ''}`}
                >
                  <button
                    type="button"
                    className={styles.faqQ}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() =>
                      setFaqOpen((prev) => (prev === i ? null : i))
                    }
                  >
                    <span>{item.q}</span>
                    <span
                      className={`${styles.faqChevron}${open ? ` ${styles.faqChevronOpen}` : ''}`}
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                  <div
                    id={panelId}
                    className={styles.faqCollapse}
                    role="region"
                    aria-hidden={!open}
                  >
                    <p className={styles.faqA}>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function QuestionHeading({
  as: Tag = 'h2',
  children,
}: {
  as?: 'h1' | 'h2';
  children: ReactNode;
}) {
  return (
    <div className={styles.titleWipe} data-clip-wipe>
      <Tag className={styles.title}>{children}</Tag>
    </div>
  );
}

function IntroScreen({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div className={`${styles.screen} ${styles.introScreen}`}>
      <p className={styles.eyebrow} data-soft-fade>
        Application
      </p>
      <QuestionHeading as="h1">Build with Gilt Foundry</QuestionHeading>
      <div className={styles.softBody} data-soft-fade>
        <p className={styles.lede}>
          A short, private application. Tell us what you are ready to make —
          we will meet you with clarity.
        </p>
        <p className={styles.trust}>Confidential · Reviewed within 24h</p>

        <button
          type="button"
          className={styles.beginCue}
          onClick={onAdvance}
          aria-label="Begin application"
        >
          <span className={styles.beginHairline} aria-hidden />
          <span className={styles.beginLabel}>Begin</span>
        </button>
      </div>
    </div>
  );
}

function ContactScreen({
  baseId,
  form,
  dial,
  hydrated,
  onChange,
}: {
  baseId: string;
  form: FormData;
  dial: string;
  hydrated: boolean;
  onChange: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className={styles.screen}>
      <p className={styles.eyebrow} data-soft-fade>
        Contact
      </p>
      <QuestionHeading>How do we reach you?</QuestionHeading>
      <div className={styles.softBody} data-soft-fade>
        <p className={styles.lede}>
          Name, email, and a number if WhatsApp is easier.
        </p>

        <div className={styles.fields}>
          <label className={styles.field} htmlFor={`${baseId}-name`}>
            <span className={styles.label}>
              Name <span className={styles.req}>*</span>
            </span>
            <input
              id={`${baseId}-name`}
              className={styles.input}
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
            />
          </label>

          <label className={styles.field} htmlFor={`${baseId}-email`}>
            <span className={styles.label}>
              Email <span className={styles.req}>*</span>
            </span>
            <input
              id={`${baseId}-email`}
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.label} id={`${baseId}-phone-label`}>
              Phone / WhatsApp
            </span>
            <div className={styles.phoneRow}>
              <label className={styles.srOnly} htmlFor={`${baseId}-cc`}>
                Country code
              </label>
              <select
                id={`${baseId}-cc`}
                className={styles.ccSelect}
                value={hydrated ? form.countryIso : 'US'}
                onChange={(e) => onChange('countryIso', e.target.value)}
                aria-describedby={`${baseId}-phone-label`}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.label} {c.dial}
                  </option>
                ))}
              </select>
              <span className={styles.dialPreview} aria-hidden>
                {dial}
              </span>
              <input
                id={`${baseId}-phone`}
                className={`${styles.input} ${styles.phoneInput}`}
                type="tel"
                name="phone"
                autoComplete="tel-national"
                inputMode="tel"
                placeholder="Mobile number"
                value={form.phoneLocal}
                onChange={(e) => onChange('phoneLocal', e.target.value)}
                aria-labelledby={`${baseId}-phone-label`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectScreen({
  baseId,
  form,
  onChange,
}: {
  baseId: string;
  form: FormData;
  onChange: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className={styles.screen}>
      <p className={styles.eyebrow} data-soft-fade>
        Project
      </p>
      <QuestionHeading>What are we shaping?</QuestionHeading>
      <div className={styles.softBody} data-soft-fade>
        <p className={styles.lede}>Type and budget — tap to select.</p>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>
            Project type <span className={styles.req}>*</span>
          </legend>
          <div className={styles.pills} role="group">
            {PROJECT_TYPES.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${styles.pill} ${form.projectType === opt ? styles.pillActive : ''}`}
                aria-pressed={form.projectType === opt}
                onClick={() => onChange('projectType', opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>
            Budget <span className={styles.req}>*</span>
          </legend>
          <div className={styles.pills} role="group">
            {BUDGETS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${styles.pill} ${form.budget === opt ? styles.pillActive : ''}`}
                aria-pressed={form.budget === opt}
                onClick={() => onChange('budget', opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={styles.field} htmlFor={`${baseId}-site`}>
          <span className={styles.label}>Current website</span>
          <input
            id={`${baseId}-site`}
            className={styles.input}
            type="url"
            name="companyWebsite"
            autoComplete="url"
            placeholder="https:// (optional)"
            value={form.companyWebsite}
            onChange={(e) => onChange('companyWebsite', e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function TimelineScreen({
  timeline,
  onSelect,
}: {
  timeline: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className={styles.screen}>
      <p className={styles.eyebrow} data-soft-fade>
        Timing
      </p>
      <QuestionHeading>When should this move?</QuestionHeading>
      <div className={styles.softBody} data-soft-fade>
        <p className={styles.lede}>
          Pick the pace that fits — no commitment yet.
        </p>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>
            Timeline <span className={styles.req}>*</span>
          </legend>
          <div className={styles.pills} role="group">
            {TIMELINES.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${styles.pill} ${timeline === opt ? styles.pillActive : ''}`}
                aria-pressed={timeline === opt}
                onClick={() => onSelect(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function VisionScreen({
  baseId,
  vision,
  visionLen,
  onChange,
}: {
  baseId: string;
  vision: string;
  visionLen: number;
  onChange: (v: string) => void;
}) {
  const ok = visionLen >= MIN_DETAILS;
  return (
    <div className={`${styles.screen} ${styles.visionScreen}`}>
      <p className={styles.eyebrow} data-soft-fade>
        Vision
      </p>
      <QuestionHeading>What does this need to become?</QuestionHeading>
      <div className={styles.softBody} data-soft-fade>
        <p className={styles.lede}>
          Room to think out loud — outcomes, constraints, the feeling of done.
        </p>

        <label className={styles.field} htmlFor={`${baseId}-vision`}>
          <span className={styles.srOnly}>Vision</span>
          <textarea
            id={`${baseId}-vision`}
            className={styles.textarea}
            name="details"
            rows={10}
            value={vision}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe the destination…"
          />
          <span
            className={`${styles.counter} ${ok ? styles.counterOk : ''}`}
            aria-live="polite"
          >
            {visionLen}/{MIN_DETAILS} min
          </span>
        </label>
      </div>
    </div>
  );
}

function ConfirmScreen({
  form,
  phoneDisplay,
}: {
  form: FormData;
  phoneDisplay: string;
}) {
  return (
    <div className={styles.screen}>
      <p className={styles.eyebrow} data-soft-fade>
        Ready
      </p>
      <QuestionHeading>Send it into the foundry</QuestionHeading>
      <div className={styles.softBody} data-soft-fade>
        <p className={styles.lede}>
          We read every application. If there is a fit, you will hear from us
          within a day.
        </p>

        <ul className={styles.summary}>
          <li>
            <span>Name</span>
            <strong>{form.name || '—'}</strong>
          </li>
          <li>
            <span>Email</span>
            <strong>{form.email || '—'}</strong>
          </li>
          {phoneDisplay && (
            <li>
              <span>Phone</span>
              <strong>{phoneDisplay}</strong>
            </li>
          )}
          <li>
            <span>Type</span>
            <strong>{form.projectType || '—'}</strong>
          </li>
          <li>
            <span>Budget</span>
            <strong>{form.budget || '—'}</strong>
          </li>
          <li>
            <span>Timeline</span>
            <strong>{form.timeline || '—'}</strong>
          </li>
        </ul>
      </div>
    </div>
  );
}

function SuccessClose() {
  return (
    <div className={`${styles.screen} ${styles.successScreen}`}>
      <p className={styles.eyebrow} data-soft-fade>
        Received
      </p>
      <QuestionHeading>It is with us now</QuestionHeading>
      <div className={styles.softBody} data-soft-fade>
        <p className={styles.lede}>
          Your application sits in confidence. We will reply within 24 hours if
          there is a path to build together.
        </p>
        <p className={styles.trust}>Gilt Foundry · Private review</p>
      </div>
    </div>
  );
}
