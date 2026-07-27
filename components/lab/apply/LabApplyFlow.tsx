'use client';

import { FormEvent, useId, useState } from 'react';
import { LAB_BACKDROP_SRC } from '@/lib/lab/backdrop';
import { BUDGETS, FAQ_ITEMS, MIN_DETAILS, TIMELINES } from './options';
import styles from './LabApplyFlow.module.css';

type FormData = {
  name: string;
  email: string;
  phone: string;
  companyWebsite: string;
  budget: string;
  timeline: string;
  details: string;
};

const initialForm = (): FormData => ({
  name: '',
  email: '',
  phone: '',
  companyWebsite: '',
  budget: '',
  timeline: '',
  details: '',
});

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LabApplyFlow() {
  const formId = useId();
  const [form, setForm] = useState<FormData>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const detailsLen = form.details.trim().length;

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!isValidEmail(form.email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Please enter a phone number.');
      return;
    }
    if (!form.budget) {
      setError('Please select a budget.');
      return;
    }
    if (!form.timeline) {
      setError('Please select a timeline.');
      return;
    }
    if (detailsLen < MIN_DETAILS) {
      setError(`Project details need at least ${MIN_DETAILS} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          companyWebsite: form.companyWebsite.trim(),
          phone: form.phone.trim(),
          budget: form.budget,
          timeline: form.timeline,
          details: form.details.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.backdrop} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.backdropImg}
          src={LAB_BACKDROP_SRC}
          alt=""
          width={1280}
          height={720}
        />
        <div className={styles.backdropWash} />
      </div>

      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Application</p>
          <h1 className={styles.title}>Build with Gilt Foundry</h1>
          <p className={styles.lede}>
            Tell me about the work. I read every application personally.
          </p>
        </header>

        <div className={styles.card}>
          {done ? (
            <div className={styles.success} role="status">
              <h2 className={styles.successTitle}>Application received</h2>
              <p className={styles.successBody}>
                Thank you. If there is a fit, you will hear from me directly
                within 24 hours.
              </p>
            </div>
          ) : (
            <form
              id={formId}
              className={styles.form}
              onSubmit={onSubmit}
              noValidate
            >
              <label className={styles.field}>
                <span className={styles.label}>Name</span>
                <input
                  className={styles.input}
                  name="name"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input
                  className={styles.input}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>WA/Telegram Phone Number</span>
                <input
                  className={styles.input}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+ 1 234 567 89 10"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.labelRow}>
                  <span className={styles.label}>Company Website</span>
                  <span className={styles.optional}>OPTIONAL</span>
                </span>
                <input
                  className={styles.input}
                  name="companyWebsite"
                  type="url"
                  autoComplete="url"
                  inputMode="url"
                  placeholder="yourcompany.com"
                  value={form.companyWebsite}
                  onChange={(e) => update('companyWebsite', e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Budget</span>
                <select
                  className={styles.select}
                  name="budget"
                  value={form.budget}
                  onChange={(e) => update('budget', e.target.value)}
                >
                  <option value="">Select budget</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Timeline</span>
                <select
                  className={styles.select}
                  name="timeline"
                  value={form.timeline}
                  onChange={(e) => update('timeline', e.target.value)}
                >
                  <option value="">Select timeline</option>
                  {TIMELINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Project Details</span>
                <textarea
                  className={styles.textarea}
                  name="details"
                  rows={5}
                  placeholder="Describe your project, goals, and what you're looking for..."
                  value={form.details}
                  onChange={(e) => update('details', e.target.value)}
                />
                <span className={styles.counter}>
                  Minimum {MIN_DETAILS} characters ({detailsLen}/{MIN_DETAILS})
                </span>
              </label>

              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className={styles.submit}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>

        <section className={styles.faq} aria-labelledby="apply-faq-heading">
          <div className={styles.faqDivider} />
          <h2 id="apply-faq-heading" className={styles.faqHeading}>
            Questions
          </h2>
          <div className={styles.faqPanel}>
            {FAQ_ITEMS.map((item, i) => {
              const open = faqOpen === i;
              return (
                <div key={item.q} className={styles.faqItem}>
                  <button
                    type="button"
                    className={styles.faqTrigger}
                    aria-expanded={open}
                    onClick={() => setFaqOpen(open ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className={styles.faqChevron} aria-hidden>
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open ? <p className={styles.faqAnswer}>{item.a}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
