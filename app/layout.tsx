import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Danirya Studio — Digital Experiences',
  description:
    'Award-winning digital experiences. Websites, 3D interactive experiences, product animation, motion design, and brand identity.',
  openGraph: {
    title: 'Danirya Studio',
    description: 'Craft extraordinary digital experiences.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
