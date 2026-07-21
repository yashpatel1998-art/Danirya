import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Lab — Danirya effects scratch',
  robots: { index: false, follow: false },
};

/** Isolated effects sandbox — not linked from marketing nav. */
export default function LabLayout({ children }: { children: ReactNode }) {
  return children;
}
