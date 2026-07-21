import type { Metadata } from 'next';
import { ApplicationForm } from '@/components/application/ApplicationForm';
import { ApplyPageShell } from '@/components/application/ApplyPageShell';
import styles from '@/components/application/ApplyPage.module.css';
import { PAGE_TITLES } from '@/lib/content/pageTitles';

export const metadata: Metadata = {
  title: PAGE_TITLES.apply,
  description: 'Begin a conversation with Danirya Studio.',
};

export default function ApplyPage() {
  return (
    <ApplyPageShell>
      <header className={styles.header}>
        <p className={styles.emailLabel}>Enquiries</p>
        <a
          href="mailto:hello@daniryastudio.com"
          className={styles.emailHero}
        >
          hello@daniryastudio.com
        </a>
        <h1 className={styles.headline}>Begin your project</h1>
        <p className={styles.sub}>
          Tell us what you need — or write directly to the address above.
        </p>
      </header>

      <ApplicationForm />
    </ApplyPageShell>
  );
}
