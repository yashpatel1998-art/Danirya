'use client';

import { FormEvent, useState } from 'react';
import type { RevealValues } from '@/types/animation';
import { SelectField } from '@/components/ui/SelectField';
import { revealStyle } from './useContactReveal';
import styles from './ContactForm.module.css';

const BUDGETS = [
  '$0 – $1k',
  '$1k – $5k',
  '$5k – $10k',
  '$10k – $20k',
  '$20k+',
] as const;

const TIMELINES = [
  'ASAP',
  'Within 30 days',
  '1–2 months',
  'Just researching',
  'Flexible',
] as const;

const MIN_DETAILS = 50;

type FormState = {
  name: string;
  email: string;
  companyWebsite: string;
  phone: string;
  budget: string;
  timeline: string;
  message: string;
};

const initial: FormState = {
  name: '',
  email: '',
  companyWebsite: '',
  phone: '',
  budget: '',
  timeline: '',
  message: '',
};

type ContactFormProps = {
  formReveal: RevealValues;
  ctaReveal: RevealValues;
};

export function ContactForm({ formReveal, ctaReveal }: ContactFormProps) {
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const detailsLen = form.message.trim().length;
  const detailsOk = detailsLen >= MIN_DETAILS;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name.trim() || !form.email.trim()) {
      setStatus('error');
      setErrorMsg('Please complete name and email.');
      return;
    }
    if (!form.budget || !form.timeline) {
      setStatus('error');
      setErrorMsg('Please select a budget and timeline.');
      return;
    }
    if (!detailsOk) {
      setStatus('error');
      setErrorMsg(`Project details need at least ${MIN_DETAILS} characters.`);
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          companyWebsite: form.companyWebsite,
          phone: form.phone,
          budget: form.budget,
          timeline: form.timeline,
          details: form.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed.');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.success} role="status">
        <h3 className={styles.successTitle}>Thank you.</h3>
        <p className={styles.successText}>
          Your request has been received.
          <br />
          We&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.formShell} onSubmit={handleSubmit} noValidate>
      <div className={styles.formBody} style={revealStyle(formReveal)}>
        <div className={styles.form}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>
                Name <span className={styles.req}>*</span>
              </span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Email <span className={styles.req}>*</span>
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={styles.input}
              />
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Company Website</span>
              <input
                type="url"
                name="companyWebsite"
                autoComplete="url"
                placeholder="https://"
                value={form.companyWebsite}
                onChange={(e) => update('companyWebsite', e.target.value)}
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>WhatsApp / Telegram</span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={styles.input}
              />
            </label>
          </div>

          <div className={styles.row}>
            <SelectField
              id="contact-budget"
              name="budget"
              label="Budget"
              required
              value={form.budget}
              onValueChange={(v) => update('budget', v)}
              options={BUDGETS}
              placeholder="Select budget"
            />
            <SelectField
              id="contact-timeline"
              name="timeline"
              label="Timeline"
              required
              value={form.timeline}
              onValueChange={(v) => update('timeline', v)}
              options={TIMELINES}
              placeholder="Select timeline"
            />
          </div>

          <label className={styles.field}>
            <span className={styles.label}>
              Project Details <span className={styles.req}>*</span>
            </span>
            <textarea
              name="message"
              rows={5}
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              className={styles.textarea}
              placeholder="What should we build together?"
            />
            <span
              className={`${styles.counter} ${detailsOk ? styles.counterOk : ''}`}
            >
              Minimum {MIN_DETAILS} characters ({detailsLen}/{MIN_DETAILS})
            </span>
          </label>

          {status === 'error' && (
            <p className={styles.error} role="alert">
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      <div className={styles.ctaWrap} style={revealStyle(ctaReveal)}>
        <button
          type="submit"
          className={`${styles.cta} ${status === 'loading' ? styles.ctaLoading : ''}`}
          disabled={status === 'loading'}
        >
          <span className={styles.ctaGlow} aria-hidden />
          <span className={styles.ctaLine} aria-hidden />
          <span className={styles.ctaText}>
            {status === 'loading' ? 'Sending' : 'Submit Application'}
          </span>
          <span className={styles.ctaArrow} aria-hidden>
            {status === 'loading' ? '' : '→'}
          </span>
          {status === 'loading' && <span className={styles.ctaProgress} aria-hidden />}
        </button>
      </div>
    </form>
  );
}
