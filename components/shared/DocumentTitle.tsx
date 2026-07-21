'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { PAGE_TITLES, titleForJourneyFrame } from '@/lib/content/pageTitles';
import { subscribeJourneyFrame } from '@/lib/journey/frameBus';

/**
 * Sets document.title from room markers on the 3D home experience,
 * and resets to the page base title on /apply and /work.
 */
export function DocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/apply') {
      document.title = PAGE_TITLES.apply;
      return;
    }
    if (pathname === '/work') {
      document.title = PAGE_TITLES.work;
      return;
    }
    if (pathname !== '/') {
      document.title = PAGE_TITLES.home;
      return;
    }

    document.title = PAGE_TITLES.home;
    let last = '';
    return subscribeJourneyFrame((pathIndex0) => {
      const next = titleForJourneyFrame(pathIndex0);
      if (next !== last) {
        last = next;
        document.title = next;
      }
    });
  }, [pathname]);

  return null;
}
