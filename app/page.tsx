import { Hero } from '@/components/hero/Hero';
import { PostTemple } from '@/components/document/PostTemple';
import { Application } from '@/components/application/Application';
import { Gallery } from '@/components/gallery/Gallery';
import { Studio } from '@/components/studio/Studio';

/**
 * Temple film → Jesko zoom through the live 3D logo → Work / Studio / Apply.
 * No separate beige logo bridge; no nested crop windows.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <PostTemple after={<Application />}>
        <Gallery />
        <Studio />
      </PostTemple>
    </main>
  );
}
