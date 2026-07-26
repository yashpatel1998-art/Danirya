import type { Metadata } from 'next';
import { LabWorkCase } from '@/components/lab/work/LabWorkCase';
import { PAGE_TITLES } from '@/lib/content/pageTitles';
import { WORK_SECTION_COPY } from '@/lib/content/sectionCopy';

export const metadata: Metadata = {
  title: PAGE_TITLES.work,
  description: WORK_SECTION_COPY.intro,
};

/** Live Work — Temple case study (shared with /lab/work). */
export default function WorkPage() {
  return <LabWorkCase />;
}
