import type { Metadata } from 'next';
import { LabApplyFlow } from '@/components/lab/apply/LabApplyFlow';
import { PAGE_TITLES } from '@/lib/content/pageTitles';

export const metadata: Metadata = {
  title: PAGE_TITLES.apply,
  description:
    'Build with Gilt Foundry. A short, private application for the work ahead.',
};

/** Live apply: single-page form (shared with /lab/apply). */
export default function ApplyPage() {
  return <LabApplyFlow />;
}
