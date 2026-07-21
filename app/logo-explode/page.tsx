'use client';

import { useRef, useState } from 'react';
import { OpeningLogo } from '@/components/brand/OpeningLogo';
import styles from './page.module.css';

export default function LogoExplodePreviewPage() {
  const [explode, setExplode] = useState(false);
  const [ready, setReady] = useState(false);
  const [key, setKey] = useState(0);
  const replayRef = useRef(false);

  const arm = () => {
    if (explode) {
      replayRef.current = true;
      setExplode(false);
      setReady(false);
      setKey((k) => k + 1);
      return;
    }
    if (!ready) return;
    setExplode(true);
  };

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        <OpeningLogo
          key={key}
          explode={explode}
          onFragmentsReady={() => {
            setReady(true);
            if (replayRef.current) {
              replayRef.current = false;
              setExplode(true);
            }
          }}
          onExplosionComplete={() => {
            /* stay until Replay */
          }}
        />
      </div>
      <div className={styles.bar}>
        <p className={styles.hint}>
          {ready
            ? 'Y-spin → concrete stone fragment blast (same canvas).'
            : 'Loading concrete fragments…'}
        </p>
        <button
          type="button"
          className={styles.btn}
          onClick={arm}
          disabled={!ready && !explode}
        >
          {explode ? 'Replay explosion' : 'Explode logo'}
        </button>
      </div>
    </main>
  );
}
