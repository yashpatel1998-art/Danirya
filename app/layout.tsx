import type { Metadata } from 'next';
import { AudioProvider } from '@/components/audio/AudioProvider';
import { CustomCursor } from '@/components/cursor/CustomCursor';
import { DocumentTitle } from '@/components/shared/DocumentTitle';
import { SmoothScroll } from '@/components/shared/SmoothScroll';
import { RouteTransition } from '@/components/transition/RouteTransition';
import { PAGE_TITLES } from '@/lib/content/pageTitles';
import './tokens.css';
import 'lenis/dist/lenis.css';
import './globals.css';

export const metadata: Metadata = {
  title: PAGE_TITLES.home,
  description:
    'A guided architectural experience. Premium digital craftsmanship for ambitious brands.',
  openGraph: {
    title: 'Danirya Studio',
    description: 'Craft extraordinary digital experiences.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
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
