'use client';

import React, { useLayoutEffect, useMemo, useRef, MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../ui/ThemeProvider';

interface AtmosphereLayerProps {
  scrollProgressRef: MutableRefObject<number>;
}

const GROUND_Y = -4;

export const FOG_COLORS = { light: '#E6BF9B', dark: '#231C1A' } as const;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useSoftTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Ground({ color }: { color: string }) {
  const alphaMap = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.45, '#fff');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]}>
      <circleGeometry args={[44, 64]} />
      {/* Unlit so scene lights can't wash it out; the alpha falloff dissolves the
          edge into the sky so there is no visible horizon seam. */}
      <meshBasicMaterial color={color} alphaMap={alphaMap} transparent depthWrite={false} />
    </mesh>
  );
}

/** Field of crystal spires rising out of the ground — static, set once. */
function CrystalField({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 80;

  const spires = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2;
      const radius = 9 + Math.pow(rand(), 0.6) * 22;
      const height = 1.6 + rand() * 4.5 * (radius < 15 ? 0.6 : 1.2);
      const width = 0.45 + rand() * 0.7;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        height,
        width,
        tiltX: (rand() - 0.5) * 0.35,
        tiltZ: (rand() - 0.5) * 0.35,
        spin: rand() * Math.PI,
      };
    });
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    spires.forEach((s, i) => {
      dummy.position.set(s.x, GROUND_Y + s.height * 0.32, s.z);
      dummy.rotation.set(s.tiltX, s.spin, s.tiltZ);
      dummy.scale.set(s.width, s.height, s.width);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [spires]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial
        color={isDark ? '#8C4E40' : '#B8634D'}
        emissive={isDark ? '#5A2E24' : '#7A3A2C'}
        emissiveIntensity={isDark ? 0.35 : 0.25}
        roughness={0.3}
        metalness={0.1}
        flatShading
      />
    </instancedMesh>
  );
}

/** Small crystals drifting in the mid-distance — they create parallax as the camera orbits. */
function FloatingShards({
  scrollProgressRef,
  isDark,
}: {
  scrollProgressRef: MutableRefObject<number>;
  isDark: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 18;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const shards = useMemo(() => {
    const rand = mulberry32(21);
    return Array.from({ length: count }, () => ({
      angle: rand() * Math.PI * 2,
      radius: 5.5 + rand() * 8,
      y: -1.5 + rand() * 5,
      size: 0.08 + rand() * 0.22,
      speed: 0.03 + rand() * 0.05,
      phase: rand() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    const lift = THREE.MathUtils.clamp(scrollProgressRef.current, 0, 1) * 0.8;
    shards.forEach((s, i) => {
      const a = s.angle + t * s.speed;
      dummy.position.set(
        Math.cos(a) * s.radius,
        s.y + lift + Math.sin(t * 0.5 + s.phase) * 0.25,
        Math.sin(a) * s.radius
      );
      dummy.rotation.set(t * 0.3 + s.phase, t * 0.4 + s.phase, 0);
      dummy.scale.set(s.size, s.size * 1.6, s.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={isDark ? '#E3836C' : '#F0A68F'}
        emissive={isDark ? '#E3836C' : '#E3836C'}
        emissiveIntensity={isDark ? 0.9 : 0.45}
        roughness={0.2}
        flatShading
      />
    </instancedMesh>
  );
}

/** Low-lying mist banks between the spires plus a few high cloud veils. */
function Mist({
  scrollProgressRef,
  isDark,
}: {
  scrollProgressRef: MutableRefObject<number>;
  isDark: boolean;
}) {
  const texture = useSoftTexture();
  const groupRef = useRef<THREE.Group>(null);

  const puffs = useMemo(() => {
    const rand = mulberry32(99);
    const low = Array.from({ length: 16 }, () => ({
      angle: rand() * Math.PI * 2,
      radius: 9 + rand() * 16,
      y: GROUND_Y + 0.6 + rand() * 1.6,
      scale: 7 + rand() * 7,
      opacity: 0.35 + rand() * 0.25,
      speed: 0.006 + rand() * 0.01,
      color: isDark ? '#3A2E2A' : rand() > 0.5 ? '#FBF1E6' : '#F2D8C4',
    }));
    const high = Array.from({ length: 6 }, () => ({
      angle: rand() * Math.PI * 2,
      radius: 16 + rand() * 10,
      y: 6 + rand() * 5,
      scale: 12 + rand() * 8,
      opacity: 0.22 + rand() * 0.15,
      speed: 0.004 + rand() * 0.006,
      color: isDark ? '#3A3040' : '#D9CBE4',
    }));
    return [...low, ...high];
  }, [isDark]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.getElapsedTime();
    const p = THREE.MathUtils.clamp(scrollProgressRef.current, 0, 1);
    group.children.forEach((child, i) => {
      const s = puffs[i];
      const a = s.angle + t * s.speed;
      child.position.set(Math.cos(a) * s.radius, s.y + p * 0.6, Math.sin(a) * s.radius);
      const mat = (child as THREE.Sprite).material as THREE.SpriteMaterial;
      mat.opacity = s.opacity * (1 - p * 0.35);
    });
  });

  return (
    <group ref={groupRef}>
      {puffs.map((s, i) => (
        <sprite key={i} scale={[s.scale, s.scale * 0.55, 1]}>
          <spriteMaterial
            map={texture}
            color={s.color}
            transparent
            opacity={s.opacity}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

export const AtmosphereLayer: React.FC<AtmosphereLayerProps> = ({ scrollProgressRef }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <group>
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2.2} color="#FFE6D4" position={[0, 6, -6]} scale={[12, 4, 1]} />
        <Lightformer
          intensity={1.4}
          color="#E3836C"
          position={[-7, 1, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[6, 6, 1]}
        />
        <Lightformer
          intensity={0.9}
          color="#C5B9D6"
          position={[7, -1, 2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[6, 6, 1]}
        />
      </Environment>

      <Ground color={isDark ? '#1A1412' : '#DDB596'} />
      <CrystalField isDark={isDark} />
      <FloatingShards scrollProgressRef={scrollProgressRef} isDark={isDark} />
      <Mist scrollProgressRef={scrollProgressRef} isDark={isDark} />
    </group>
  );
};
