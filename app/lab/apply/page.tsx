import type { Metadata } from 'next';
import { LabApplyFlow } from '@/components/lab/apply/LabApplyFlow';

export const metadata: Metadata = {
  title: 'Lab · Apply — Gilt Foundry',
  robots: { index: false, follow: false },
};

/** Isolated 6-screen apply skeleton — not linked from marketing nav. */
export default function LabApplyPage() {
  return <LabApplyFlow />;
}
