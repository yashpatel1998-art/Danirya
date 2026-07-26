import type { Metadata } from 'next';
import { ApplicationForm } from '@/components/application/ApplicationForm';
import { ApplyPageShell } from '@/components/application/ApplyPageShell';
import styles from '@/components/application/ApplyPage.module.css';
import { PAGE_TITLES } from '@/lib/content/pageTitles';
import { SANCTUARY_COPY } from '@/lib/content/sectionCopy';

export const metadata: Metadata = {
  title: PAGE_TITLES.apply,
  description:
    'Begin a conversation with Gilt Foundry — tell us about the work.',
};

export default function ApplyPage() {
  return (
    <ApplyPageShell>
      <header className={styles.header}>
        <p className={styles.emailLabel}>{SANCTUARY_COPY.emailLabel}</p>
        <a
          href={`mailto:${SANCTUARY_COPY.email}`}
          className={styles.emailHero}
        >
          {SANCTUARY_COPY.email}
        </a>
        <h1 className={styles.headline}>Begin your project</h1>
        <p className={styles.sub}>
          Tell us about the work — budget, timeline, and what you want to
          build. We reply within a few days.
        </p>
      </header>

      <ApplicationForm />
    </ApplyPageShell>
  );
}
