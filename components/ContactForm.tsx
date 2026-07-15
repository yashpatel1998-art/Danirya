'use client';

import { FormEvent, useState } from 'react';
import { RevealValues, revealStyle } from '@/hooks/useContactReveal';
import { SelectField } from './SelectField';
import styles from './ContactForm.module.css';

const PROJECT_TYPES = [
  'Award-Winning Website',
  '3D Interactive Website',
  'Product Animation',
  'Motion Design',
  'Brand Identity',
  'Other',
] as const;

const BUDGETS = [
  'Under $2,000',
  '$2,000 – $5,000',
  '$5,000 – $10,000',
  '$10,000+',
] as const;

const TIMELINES = ['ASAP', 'Within 1 Month', 'Within 3 Months', 'Flexible'] as const;

type FormState = {
  name: string;
  email: string;
  company: string;
  projectType: string;
  budget: string;
  timeline: string;
  details: string;
};

const initial: FormState = {
  name: '',
  email: '',
  company: '',
  projectType: '',
  budget: '',
  timeline: 'Flexible',
  details: '',
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name.trim() || !form.email.trim() || !form.projectType || !form.budget || !form.details.trim()) {
      setStatus('error');
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
          Your project enquiry has been received.
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

          <label className={styles.field}>
            <span className={styles.label}>Company</span>
            <input
              type="text"
              name="company"
              autoComplete="organization"
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
              className={styles.input}
            />
          </label>

          <div className={styles.row}>
            <SelectField
              id="projectType"
              name="projectType"
              label="Project Type"
              required
              value={form.projectType}
              onValueChange={(v) => update('projectType', v)}
              options={PROJECT_TYPES}
              placeholder="Select project type"
            />
            <SelectField
              id="budget"
              name="budget"
              label="Budget"
              required
              value={form.budget}
              onValueChange={(v) => update('budget', v)}
              options={BUDGETS}
              placeholder="Select budget"
            />
          </div>

          <SelectField
            id="timeline"
            name="timeline"
            label="Timeline"
            value={form.timeline}
            onValueChange={(v) => update('timeline', v)}
            options={TIMELINES}
          />

          <label className={styles.field}>
            <span className={styles.label}>
              Project Details <span className={styles.req}>*</span>
            </span>
            <textarea
              name="details"
              rows={5}
              value={form.details}
              onChange={(e) => update('details', e.target.value)}
              className={styles.textarea}
              placeholder="Share your vision, goals, and any reference links."
            />
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
            {status === 'loading' ? 'Sending your enquiry' : 'Begin Your Project'}
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
