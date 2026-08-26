'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { SkyDome } from './SkyDome';
import { CloudLayers } from './CloudLayers';
import { LightTrails } from './LightTrails';
import { IslandInstance, IslandInstanceProps } from './HeroIslandModel';
import { CameraRig } from './CameraRig';
import { DrawerDetail } from '../landing/InspectDrawer';

// 4 Milestone Islands positioned opposite to their HTML cards, all rendered with heroisland.glb
const DESCENT_ISLANDS: IslandInstanceProps[] = [
  {
    id: 'reports',
    label: '01 // REPORTS ENGINE',
    position: [3.2, -4.0, -1.0], // Card is on left, Island is on right
    scale: 3.6,
    rotationY: 0.4,
    bobSpeed: 0.32,
    bobPhase: 0,
    activeScrollRange: [0.15, 0.38],
    detail: {
      category: 'REPORTS ENGINE',
      title: 'Automated Executive Narratives',
      subtitle: 'Living summaries delivered to Slack, Notion & Email',
      narrative:
        'Monitors ongoing business metrics and generates human-readable executive summaries with cited data points delivered directly to team communication channels.',
      metrics: [
        { label: 'Format', value: 'Narrative Digest' },
        { label: 'Delivery', value: 'Slack & Email' },
      ],
      steps: [
        'Syncs data warehouses and billing streams in read-only mode',
        'Calculates multi-dimensional period-over-period deltas',
        'Synthesizes natural language briefings with verified data citations',
      ],
    },
  },
  {
    id: 'forecasts',
    label: '02 // PROBABILISTIC FORECASTS',
    position: [-3.2, -10.0, -1.0], // Card is on right, Island is on left
    scale: 3.8,
    rotationY: 1.6,
    bobSpeed: 0.3,
    bobPhase: 1.8,
    activeScrollRange: [0.38, 0.62],
    detail: {
      category: 'FORECAST HORIZONS',
      title: 'Probabilistic Trajectory Models',
      subtitle: 'Forward-looking confidence ranges without statistical complexity',
      narrative:
        'Continuously adapts projection envelopes to seasonal variance, trend momentum, and holiday baselines without requiring custom model scripting.',
      metrics: [
        { label: 'Horizon', value: '30-Day Rolling' },
        { label: 'Confidence', value: 'Adaptive Range' },
      ],
      steps: [
        'Analyzes multi-year baseline seasonality and variance cycles',
        'Calculates dynamic upper and lower projection boundaries',
        'Supports natural language parameter simulation in real time',
      ],
    },
  },
  {
    id: 'monitoring',
    label: '03 // ANOMALY MONITORING',
    position: [3.2, -16.0, -1.0], // Card is on left, Island is on right
    scale: 3.6,
    rotationY: 2.8,
    bobSpeed: 0.34,
    bobPhase: 3.4,
    activeScrollRange: [0.62, 0.85],
    detail: {
      category: 'ANOMALY GRAPH',
      title: 'Contextual Anomaly Suppression',
      subtitle: 'Root-cause attribution that eliminates alarm fatigue',
      narrative:
        'Cross-correlates simultaneous metric deviations across the entire schema, identifying the upstream origin before flooding teams with duplicate alerts.',
      metrics: [
        { label: 'Detection', value: 'Multi-Metric Graph' },
        { label: 'Attribution', value: 'Root Cause Pinpoint' },
      ],
      steps: [
        'Learns normal variance across multi-table metric graphs',
        'Isolates root cause disruptions from downstream cascading noise',
        'Delivers contextual action summaries before metric impacts widen',
      ],
    },
  },
  {
    id: 'exploration',
    label: '04 // CONVERSATIONAL QUERY',
    position: [-3.2, -22.0, -1.0], // Card is on right, Island is on left
    scale: 4.0,
    rotationY: 4.2,
    bobSpeed: 0.28,
    bobPhase: 4.9,
    activeScrollRange: [0.85, 1.05],
    detail: {
      category: 'EXPLORATION',
      title: 'Conversational Data Lineage',
      subtitle: 'Instant ad-hoc exploration in natural language',
      narrative:
        'Empowers any teammate to ask follow-up questions, slice dimensions, and drill down into anomalies with fully verified query execution.',
      metrics: [
        { label: 'Interface', value: 'Natural Language' },
        { label: 'Transparency', value: 'Direct Verified SQL' },
      ],
      steps: [
        'Converts natural phrasing into optimized database queries',
        'Validates semantic query schemas against warehouse metadata',
        'Outputs conversational summaries with accompanying raw data tables',
      ],
    },
  },
];

interface SceneCanvasProps {
  scrollProgress: number;
  isLoaded?: boolean;
  isCanvasVisible?: boolean;
  onSelectHotspot?: (detail: DrawerDetail) => void;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  scrollProgress,
  isLoaded = true,
  isCanvasVisible = true,
  onSelectHotspot,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isCapable, setIsCapable] = useState(true);

  useEffect(() => {
    setMounted(true);

    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2;
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (prefersReduced || lowCores || !gl) {
        setIsCapable(false);
      }
    } catch {
      setIsCapable(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 w-full h-full z-0 bg-gradient-to-b from-[#B8A9C9] via-[#E8C4A0] to-[#F3EDE4] pointer-events-none" />
    );
  }

  if (!isCapable) {
    return (
      <div className="fixed inset-0 w-full h-full z-0 bg-gradient-to-b from-[#B8A9C9] via-[#E8C4A0] to-[#F3EDE4] pointer-events-none transition-opacity duration-1000" />
    );
  }

  const islandPositions = DESCENT_ISLANDS.map((i) => i.position);

  return (
    <div
      id="playcanvas-wrapper"
      className={`fixed inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-500 ${
        isCanvasVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Canvas
        camera={{ position: [0, 4.8, 11.5], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        {/* Generous daylight and sunset illumination to reveal full model colors */}
        <ambientLight intensity={1.1} color="#FFFFFF" />
        <hemisphereLight intensity={0.7} groundColor="#E8DFD3" color="#D5C5E5" />
        <directionalLight position={[12, 18, 10]} intensity={1.6} color="#FFF5EB" />
        <directionalLight position={[-10, -6, -8]} intensity={0.5} color="#C5B8D8" />

        {/* Dynamic Sky Gradient Dome */}
        <SkyDome scrollProgress={scrollProgress} />
        <CloudLayers />

        {/* Floating Atmosphere Motes */}
        <Sparkles
          count={60}
          scale={[18, 26, 16]}
          size={3.0}
          speed={0.25}
          opacity={0.6}
          color="#E8C4A0"
        />

        {/* 1. Hero Overview Island (heroisland.glb with full vibrant colors) */}
        <IslandInstance
          position={[2.5, 0.4, -1.5]}
          scale={4.2}
          rotationY={0}
          bobSpeed={0.35}
          bobPhase={0}
        />

        {/* 2. All 4 Milestone Descent Islands (heroisland.glb instances with scroll-gated hotspots) */}
        {DESCENT_ISLANDS.map((island) => (
          <IslandInstance
            key={island.id}
            {...island}
            currentScroll={scrollProgress}
            onSelectHotspot={onSelectHotspot}
          />
        ))}

        {/* Connected Soft Light Trail Filaments */}
        <LightTrails islandPoints={islandPositions} />

        {/* Camera Trajectory & Swoop */}
        <CameraRig
          scrollProgress={scrollProgress}
          isLoaded={isLoaded}
        />
      </Canvas>
    </div>
  );
};
