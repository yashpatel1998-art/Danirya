import type { Metadata } from 'next';
import { DocumentPageShell } from '@/components/shared/DocumentPageShell';
import { PAGE_TITLES } from '@/lib/content/pageTitles';
import { WORK_SECTION_COPY } from '@/lib/content/sectionCopy';
import { workProjects } from '@/lib/content/workProjects';
import styles from '@/components/shared/DocumentPage.module.css';

export const metadata: Metadata = {
  title: PAGE_TITLES.work,
  description: WORK_SECTION_COPY.intro,
};

export default function WorkPage() {
  return (
    <DocumentPageShell>
      <header className={styles.header}>
        <p className={styles.kicker}>Selected work</p>
        <h1 className={styles.headline}>{WORK_SECTION_COPY.title}</h1>
        <p className={styles.sub}>{WORK_SECTION_COPY.intro}</p>
      </header>

      <ul className={styles.list}>
        {workProjects.map((project) => (
          <li key={project.id} className={styles.item}>
            <p className={styles.itemCategory}>{project.category}</p>
            <h2 className={styles.itemName}>{project.name}</h2>
            <p className={styles.itemOutcome}>{project.outcome}</p>
          </li>
        ))}
      </ul>
    </DocumentPageShell>
  );
}
