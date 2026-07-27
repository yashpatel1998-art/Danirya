import type { Metadata } from 'next';
import { GuideLanding } from '@/components/guide/GuideLanding';
import { GUIDE_HEADLINE, GUIDE_TAGLINE } from '@/lib/guide/constants';

export const metadata: Metadata = {
  title: `${GUIDE_HEADLINE} — Gilt Foundry`,
  description: GUIDE_TAGLINE,
  openGraph: {
    title: GUIDE_HEADLINE,
    description: GUIDE_TAGLINE,
    type: 'website',
  },
};

export default function GuidePage() {
  return <GuideLanding />;
}
