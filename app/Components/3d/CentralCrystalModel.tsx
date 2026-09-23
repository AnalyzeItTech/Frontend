'use client';

import React, { useRef, useState, MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CentralCrystalModelProps {
  scrollProgressRef: MutableRefObject<number>;
}

/** Crystal stays mostly still — camera orbits instead. Soft float + ring drift only. */
export const CentralCrystalModel: React.FC<CentralCrystalModelProps> = ({
  scrollProgressRef,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const p = THREE.MathUtils.clamp(scrollProgressRef.current, 0, 1);
    const glowBoost = 1 + p * 0.65;
    const orbitExpand = 1 + Math.sin(p * Math.PI) * 0.12;
    const dt = Math.min(delta, 0.05);

    if (rootRef.current) {
      // Quiet breath only — no spinning (camera does that)
      rootRef.current.position.y = 0.15 + Math.sin(time * 0.4) * 0.06;
      const targetScale = THREE.MathUtils.lerp(1, 1.05, p * 0.5) * (hovered ? 1.025 : 1);
      const s = THREE.MathUtils.damp(rootRef.current.scale.x, targetScale, 4, dt);
      rootRef.current.scale.setScalar(s);
    }

    if (coreRef.current) {
      const pulse = Math.sin(time * 1.5) * 0.5 + 0.5;
      // Very slow counter-glow so facets catch light as the camera moves
      coreRef.current.rotation.y = time * 0.08;
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity =
          (1.5 + pulse * 0.65 + (hovered ? 0.4 : 0)) * glowBoost;
      }
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 3.2;
      ring1Ref.current.rotation.z += dt * 0.12;
      ring1Ref.current.scale.setScalar(orbitExpand);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 2.6;
      ring2Ref.current.rotation.y = 0.6;
      ring2Ref.current.rotation.z -= dt * 0.09;
      ring2Ref.current.scale.setScalar(orbitExpand * 0.98);
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
      <group ref={rootRef}>
        <mesh>
          <icosahedronGeometry args={[2.0, 0]} />
          <meshPhysicalMaterial
            color="#8A3E2E"
            emissive="#4E2219"
            emissiveIntensity={0.4}
            roughness={0.24}
            metalness={0.12}
            transparent
            opacity={0.72}
            side={THREE.BackSide}
            flatShading
          />
        </mesh>

        <mesh ref={coreRef}>
          <octahedronGeometry args={[0.72, 0]} />
          <meshStandardMaterial
            color="#824A3D"
            emissive="#D97863"
            emissiveIntensity={2.0}
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>

        <pointLight color="#FFA878" intensity={3.5} distance={8} position={[0, 0, 0]} />

        <mesh>
          <icosahedronGeometry args={[2.0, 0]} />
          <meshPhysicalMaterial
            color="#BF6A53"
            emissive="#6E2F22"
            emissiveIntensity={0.3}
            roughness={0.13}
            metalness={0.15}
            transparent
            opacity={0.84}
            side={THREE.FrontSide}
            clearcoat={1}
            clearcoatRoughness={0.08}
            flatShading
          />
        </mesh>

        <mesh scale={[1.002, 1.002, 1.002]}>
          <icosahedronGeometry args={[2.0, 0]} />
          <meshBasicMaterial
            color="#F1C0AD"
            wireframe
            transparent
            opacity={0.42}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      <mesh ref={ring1Ref} rotation={[Math.PI / 3.2, 0, 0]}>
        <torusGeometry args={[2.85, 0.014, 12, 64]} />
        <meshBasicMaterial
          color="#EBA58F"
          transparent
          opacity={hovered ? 0.5 : 0.32}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 2.6, 0.6, 0]}>
        <torusGeometry args={[3.6, 0.012, 12, 64]} />
        <meshBasicMaterial
          color="#EBA58F"
          transparent
          opacity={hovered ? 0.45 : 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
