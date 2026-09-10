'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AppShell } from '../Components/app/AppShell';
import type { EarthGlobeHandle } from '../Components/3d/EarthGlobe';

const EarthGlobeBound = dynamic(
  () => import('../Components/3d/EarthGlobe').then((module) => module.EarthGlobeBound),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#E8DFD3]" /> },
);

export default function GlobePage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const globeRef = useRef<EarthGlobeHandle | null>(null);

  return (
    <AppShell active="globe" flush>
      <div className="relative h-[calc(100vh-56px)] overflow-hidden bg-[#E8DFD3]">
        <EarthGlobeBound
          boundRef={globeRef}
          pageMode
          contained
          isExpanded={expanded}
          onToggleExpand={setExpanded}
          onSendToChat={(prompt) => {
            router.push(`/research?q=${encodeURIComponent(prompt)}`);
          }}
        />
      </div>
    </AppShell>
  );
}
