import { DM_Sans, Fraunces } from 'next/font/google';

/** Self-hosted — no Google Fonts / Fontshare CDN dependency at runtime. */
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});
