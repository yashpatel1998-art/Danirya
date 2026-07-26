import type { Metadata } from 'next';
import { LabWorkCase } from '@/components/lab/work/LabWorkCase';

export const metadata: Metadata = {
  title: 'Lab · The Temple — Gilt Foundry',
  robots: { index: false, follow: false },
};

/** Isolated Temple case-study flagship — not linked from marketing nav. */
export default function LabWorkPage() {
  return <LabWorkCase />;
}
