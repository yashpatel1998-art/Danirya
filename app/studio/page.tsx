import type { Metadata } from 'next';
import { DocumentPageShell } from '@/components/shared/DocumentPageShell';
import { Studio } from '@/components/studio/Studio';
import { PAGE_TITLES } from '@/lib/content/pageTitles';
import { STUDIO_SECTION_COPY } from '@/lib/content/sectionCopy';

export const metadata: Metadata = {
  title: PAGE_TITLES.studio,
  description: STUDIO_SECTION_COPY.philosophy,
};

/** Standalone Studio — not scroll-chained to the temple. */
export default function StudioPage() {
  return (
    <DocumentPageShell watermark flush>
      <Studio />
    </DocumentPageShell>
  );
}
