import styles from './Lab.module.css';

export function Lab() {
  return (
    <section className={styles.section} aria-label="Laboratory">
      <div className={styles.inner}>
        <span className={styles.label}>Laboratory</span>
        <p className={styles.text}>Motion. Light. Material. Precision. Craft.</p>
      </div>
    </section>
  );
}
