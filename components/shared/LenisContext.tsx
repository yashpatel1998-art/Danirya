'use client';

import type Lenis from 'lenis';
import { createContext, useContext } from 'react';

const LenisContext = createContext<Lenis | null>(null);

export function LenisProvider({
  lenis,
  children,
}: {
  lenis: Lenis | null;
  children: React.ReactNode;
}) {
  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}
