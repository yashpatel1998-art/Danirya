import Link from 'next/link';
import type { Metadata } from 'next';
import { PAGE_TITLES } from '@/lib/content/pageTitles';
import styles from '@/components/shared/NotFound.module.css';

export const metadata: Metadata = {
  title: PAGE_TITLES.notFound,
  description: 'This path does not open onto the temple.',
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/danirya-mark.png"
        alt=""
        width={72}
        height={72}
        className={styles.mark}
      />
      <div className={styles.inner}>
        <p className={styles.kicker}>404</p>
        <h1 className={styles.headline}>This path does not open.</h1>
        <p className={styles.copy}>
          The gateway you sought is closed — return to the forecourt and begin again.
        </p>
        <Link href="/" className={styles.home}>
          Return to the temple
        </Link>
      </div>
    </main>
  );
}
