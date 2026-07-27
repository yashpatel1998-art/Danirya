import type { Metadata } from 'next';
import { GuideLanding } from '@/components/guide/GuideLanding';

export const metadata: Metadata = {
  title: 'Lab · Guide · Gilt Foundry',
  robots: { index: false, follow: false },
};

/** Isolated lead-magnet preview (not linked from marketing nav). */
export default function LabGuidePage() {
  return <GuideLanding />;
}
