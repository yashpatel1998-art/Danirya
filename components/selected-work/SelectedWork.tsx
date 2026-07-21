import styles from './SelectedWork.module.css';

export function SelectedWork() {
  return (
    <section className={styles.section} aria-label="Gallery">
      <div className={styles.inner}>
        <span className={styles.label}>Selected Work</span>
        <p className={styles.text}>
          A curated gallery of digital experiences — arriving next.
        </p>
      </div>
    </section>
  );
}
