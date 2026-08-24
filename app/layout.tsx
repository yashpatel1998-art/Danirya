import type { Metadata, Viewport } from 'next';
import { AudioProvider } from '@/components/audio/AudioProvider';
import { CustomCursor } from '@/components/cursor/CustomCursor';
import { DocumentTitle } from '@/components/shared/DocumentTitle';
import { SmoothScroll } from '@/components/shared/SmoothScroll';
import { RouteTransition } from '@/components/transition/RouteTransition';
import { PAGE_TITLES } from '@/lib/content/pageTitles';
import { dmSans, fraunces } from './fonts';
import './tokens.css';
import 'lenis/dist/lenis.css';
import './globals.css';

export const metadata: Metadata = {
  title: PAGE_TITLES.home,
  description:
    'A guided architectural experience. Premium digital craftsmanship for ambitious brands.',
  openGraph: {
    title: 'Gilt Foundry',
    description: 'Craft extraordinary digital experiences.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body data-scroll-chrome="lenis">
        <SmoothScroll>
          <AudioProvider>
            <RouteTransition>
              <DocumentTitle />
              <CustomCursor />
              {children}
            </RouteTransition>
          </AudioProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
