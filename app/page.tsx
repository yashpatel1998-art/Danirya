import { HeroSequence } from '@/components/HeroSequence';
import { ContactSection } from '@/components/ContactSection';
import styles from './page.module.css';

export default function Home() {
  return (
    <main>
      <HeroSequence />
      <section className={styles.zone} aria-label="Gallery" />
      <section className={styles.zone} aria-label="Laboratory" />
      <ContactSection />
    </main>
  );
}
