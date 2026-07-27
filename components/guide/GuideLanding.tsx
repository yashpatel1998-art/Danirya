'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
  GUIDE_HEADLINE,
  GUIDE_LOGO_MARK,
  GUIDE_PDF_FILENAME,
  GUIDE_PDF_PATH,
  GUIDE_TAGLINE,
} from '@/lib/guide/constants';
import styles from './GuideLanding.module.css';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function GuideLanding() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isValidEmail(email)) {
      setError('Please enter a valid email.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
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
    <main className={styles.root}>
      <div className={styles.stack}>
        <div className={styles.logoMark} aria-hidden>
          <Image
            src={GUIDE_LOGO_MARK}
            alt=""
            width={120}
            height={120}
            className={styles.logoMarkImg}
            priority
          />
        </div>

        <p className={styles.eyebrow}>Free guide</p>
        <h1 className={styles.title}>{GUIDE_HEADLINE}</h1>
        <p className={styles.tagline}>{GUIDE_TAGLINE}</p>

        {done ? (
          <div className={styles.success} role="status">
            <h2 className={styles.successTitle}>Check your inbox</h2>
            <p className={styles.successBody}>
              Your guide is on its way. Download it now below.
            </p>
            <a
              className={styles.download}
              href={GUIDE_PDF_PATH}
              download={GUIDE_PDF_FILENAME}
            >
              Download the guide
            </a>
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <input
              className={styles.input}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Sending…' : 'Get the guide'}
            </button>
          </form>
        )}
      </div>

      <footer className={styles.footer}>
        <Link href="/apply" className={styles.footerLink}>
          Want this built for your brand? Apply →
        </Link>
      </footer>
    </main>
  );
}
