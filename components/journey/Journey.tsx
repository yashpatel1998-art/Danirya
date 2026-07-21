'use client';

import { memo, useRef } from 'react';
import { useJourneyVideoPlayback } from '@/hooks/useJourneyVideoPlayback';
import {
  JOURNEY_VIDEO_H265,
  JOURNEY_VIDEO_POSTER,
  JOURNEY_VIDEO_WEBM,
} from '@/lib/journey/constants';
import { JourneyOverlays } from './JourneyOverlays';
import styles from './Journey.module.css';

export const Journey = memo(function Journey() {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { videoReady, overlays } = useJourneyVideoPlayback({
    trackRef,
    pinRef,
    videoRef,
  });

  return (
    <section ref={trackRef} className={styles.track} aria-label="Journey">
      <div ref={pinRef} className={styles.sticky}>
        <div className={styles.stage}>
          <video
            ref={videoRef}
            className={`${styles.video} ${videoReady ? styles.videoReady : ''}`}
            muted
            playsInline
            preload="auto"
            poster={JOURNEY_VIDEO_POSTER}
            controls={false}
            disablePictureInPicture
            aria-hidden
          >
            <source src={JOURNEY_VIDEO_H265} type='video/mp4; codecs="hvc1"' />
            <source src={JOURNEY_VIDEO_WEBM} type="video/webm" />
          </video>
          <img
            src={JOURNEY_VIDEO_POSTER}
            alt=""
            aria-hidden
            className={`${styles.poster} ${videoReady ? styles.posterHidden : ''}`}
          />
          <JourneyOverlays overlays={overlays} />
        </div>
      </div>
    </section>
  );
});
