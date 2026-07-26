import type { Metadata } from 'next';
import { LabApplyFlow } from '@/components/lab/apply/LabApplyFlow';
import { PAGE_TITLES } from '@/lib/content/pageTitles';

export const metadata: Metadata = {
  title: PAGE_TITLES.apply,
  description:
    'Build with Gilt Foundry — a short, private application for the work ahead.',
};

/** Live apply — 6-screen flow (shared with /lab/apply). */
export default function ApplyPage() {
  return <LabApplyFlow />;
}
