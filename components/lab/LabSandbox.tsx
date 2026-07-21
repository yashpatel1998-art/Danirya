'use client';

import { NestedStack } from '@/components/nest/NestedStack';

/** /lab — same nested stack as live home (with lab chrome). */
export function LabSandbox() {
  return <NestedStack labChrome />;
}
