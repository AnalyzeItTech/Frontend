'use client';

import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { DrawerDetail } from '../landing/InspectDrawer';

interface CentralCrystalModelProps {
  scrollProgress: number;
  onSelectHotspot?: (detail: DrawerDetail) => void;
}

const MILESTONE_DETAILS: {
  range: [number, number];
  label: string;
  detail: DrawerDetail;
}[] = [
  {
    range: [0.12, 0.30],
    label: '01 // REPORTS ENGINE',
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
    range: [0.36, 0.54],
    label: '02 // PROBABILISTIC FORECASTS',
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
    range: [0.60, 0.78],
    label: '03 // ANOMALY MONITORING',
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
    range: [0.84, 0.99],
    label: '04 // CONVERSATIONAL QUERY',
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

export const CentralCrystalModel: React.FC<CentralCrystalModelProps> = ({
  scrollProgress,
  onSelectHotspot,
}) => {
  const crystalRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const shardsRef = useRef<THREE.Group>(null);

  const [hovered, setHovered] = useState(false);
  const { pointer } = useThree();

  // 4 Small Data Shards drifting in orbit
  const shards = useMemo(() => {
    return [
      { radius: 3.2, y: 0.4, speed: 0.35, scale: 0.18, phase: 0 },
      { radius: 3.8, y: -0.6, speed: 0.28, scale: 0.14, phase: 1.8 },
      { radius: 3.4, y: 0.8, speed: 0.32, scale: 0.16, phase: 3.6 },
      { radius: 4.1, y: -0.2, speed: 0.22, scale: 0.12, phase: 5.1 },
    ];
  }, []);

  // Find active milestone detail for 3D hotspot button
  const activeMilestone = useMemo(() => {
    return MILESTONE_DETAILS.find(
      (m) => scrollProgress >= m.range[0] && scrollProgress <= m.range[1]
    );
  }, [scrollProgress]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    if (crystalRef.current) {
      // 1. Slow, meditative self-rotation
      crystalRef.current.rotation.y = time * 0.04;
      crystalRef.current.rotation.x = Math.sin(time * 0.15) * 0.03;

      // 2. Gentle organic vertical breath
      crystalRef.current.position.y = 0.2 + Math.sin(time * 0.4) * 0.08;

      // 3. Interactive magnetic tilt responding to mouse
      const targetTiltX = pointer.y * 0.08;
      const targetTiltZ = -pointer.x * 0.08;
      crystalRef.current.rotation.x = THREE.MathUtils.lerp(
        crystalRef.current.rotation.x,
        targetTiltX,
        0.04
      );
      crystalRef.current.rotation.z = THREE.MathUtils.lerp(
        crystalRef.current.rotation.z,
        targetTiltZ,
        0.04
      );
    }

    // 4. Warm Core Breathing Pulse
    if (coreRef.current) {
      const pulse = Math.sin(time * 1.8) * 0.5 + 0.5;
      coreRef.current.rotation.y = time * 0.35;
      coreRef.current.rotation.z = time * 0.2;
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 1.6 + pulse * 0.8 + (hovered ? 0.5 : 0);
      }
    }

    // 5. Quiet Armillary Rings rotation
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = time * 0.06;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -time * 0.045;
    }

    // 6. Keplerian Orbiting Data Shards
    if (shardsRef.current) {
      shards.forEach((s, idx) => {
        const child = shardsRef.current?.children[idx];
        if (child) {
          const angle = time * s.speed + s.phase;
          child.position.x = Math.cos(angle) * s.radius;
          child.position.z = Math.sin(angle) * s.radius;
          child.position.y = s.y + Math.sin(time * 0.6 + s.phase) * 0.1;
          child.rotation.y = time * 0.4;
          child.rotation.x = time * 0.2;
        }
      });
    }
  });

  return (
    <group
      position={[0, 0.2, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Central Rotating Faceted Quartz Crystal Form */}
      <group ref={crystalRef}>
        {/* Pass 1: Rear Facets (Rich warm terracotta amber base) */}
        <mesh>
          <icosahedronGeometry args={[2.0, 0]} />
          <meshPhysicalMaterial
            color="#E2876A"
            emissive="#D4826A"
            emissiveIntensity={0.35}
            roughness={0.22}
            metalness={0.08}
            transparent={true}
            opacity={0.65}
            side={THREE.BackSide}
            flatShading={true}
          />
        </mesh>

        {/* Pass 2: Luminescent Inner Core (Glowing warm amber heart) */}
        <mesh ref={coreRef} position={[0, 0, 0]}>
          <octahedronGeometry args={[0.72, 0]} />
          <meshStandardMaterial
            color="#D4826A"
            emissive="#FF6B50"
            emissiveIntensity={2.0}
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>

        {/* Warm Internal Point Light (Illuminating facets from within) */}
        <pointLight
          color="#FFA878"
          intensity={4.5}
          distance={9}
          position={[0, 0, 0]}
        />

        {/* Pass 3: Front Facets (Vibrant warm rose-amber quartz with specular polish) */}
        <mesh castShadow receiveShadow>
          <icosahedronGeometry args={[2.0, 0]} />
          <meshPhysicalMaterial
            color="#F5A27E"
            emissive="#E08264"
            emissiveIntensity={0.25}
            roughness={0.12}
            metalness={0.06}
            transparent={true}
            opacity={0.78}
            side={THREE.FrontSide}
            clearcoat={0.9}
            clearcoatRoughness={0.08}
            flatShading={true}
          />
        </mesh>

        {/* Pass 4: Shimmering Warm Gold Wireframe Facet Outlines */}
        <mesh scale={[1.002, 1.002, 1.002]}>
          <icosahedronGeometry args={[2.0, 0]} />
          <meshBasicMaterial
            color="#FFAE8A"
            wireframe={true}
            transparent={true}
            opacity={0.55}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Armillary Ring 1: Warm Terracotta Orbit */}
      <mesh
        ref={ring1Ref}
        rotation={[Math.PI / 3.2, 0, 0]}
      >
        <torusGeometry args={[2.85, 0.014, 16, 96]} />
        <meshBasicMaterial
          color="#E07A5F"
          transparent={true}
          opacity={hovered ? 0.65 : 0.42}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Armillary Ring 2: Rose Lavender Inclined Orbit */}
      <mesh
        ref={ring2Ref}
        rotation={[Math.PI / 2.6, 0.6, 0]}
      >
        <torusGeometry args={[3.6, 0.012, 16, 96]} />
        <meshBasicMaterial
          color="#C47A8A"
          transparent={true}
          opacity={hovered ? 0.55 : 0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Drifting Warm Data Shards */}
      <group ref={shardsRef}>
        {shards.map((s, idx) => (
          <mesh key={idx} scale={[s.scale, s.scale * 1.2, s.scale]}>
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial
              color="#F29E74"
              emissive="#D4826A"
              emissiveIntensity={0.3}
              roughness={0.15}
              metalness={0.08}
              transparent={true}
              opacity={0.85}
              flatShading={true}
            />
          </mesh>
        ))}
      </group>

      {/* Scroll-Gated 3D Interactive Hotspot Button at Active Facet */}
      {activeMilestone && (
        <Html position={[0, 2.3, 0]} distanceFactor={14} center>
          <button
            type="button"
            onClick={() =>
              onSelectHotspot && onSelectHotspot(activeMilestone.detail)
            }
            className="group cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full bg-[#F3EDE4]/95 backdrop-blur-md border border-[#4A4238]/15 hover:border-[#D4826A] shadow-md hover:scale-105 transition-all duration-300 pointer-events-auto whitespace-nowrap animate-in fade-in zoom-in-90"
          >
            <span className="w-2 h-2 rounded-full bg-[#D4826A] animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#4A4238] font-medium group-hover:text-[#D4826A]">
              {activeMilestone.label}
            </span>
            <span className="text-xs text-[#D4826A] group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>
        </Html>
      )}
    </group>
  );
};
