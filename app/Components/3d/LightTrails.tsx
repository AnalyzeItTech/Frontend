'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LightTrailsProps {
  islandPoints: [number, number, number][];
}

export const LightTrails: React.FC<LightTrailsProps> = ({ islandPoints }) => {
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = 48;

  // Build CatmullRom curves connecting sequential islands
  const curves = useMemo(() => {
    const list: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < islandPoints.length - 1; i++) {
      const p1 = new THREE.Vector3(...islandPoints[i]);
      const p2 = new THREE.Vector3(...islandPoints[i + 1]);
      
      // Calculate smooth midpoint with gentle arc
      const mid = new THREE.Vector3()
        .addVectors(p1, p2)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3((i % 2 === 0 ? 1 : -1) * 1.2, 0.6, 0.8));

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      list.push(curve);
    }
    return list;
  }, [islandPoints]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-generate static tube geometries for subtle glowing path lines
  const tubeGeometries = useMemo(() => {
    return curves.map(c => new THREE.TubeGeometry(c, 48, 0.024, 8, false));
  }, [curves]);

  useFrame(({ clock }) => {
    if (!particlesRef.current || curves.length === 0) return;

    const time = clock.getElapsedTime() * 0.18;
    const particlesPerCurve = Math.floor(particleCount / curves.length);

    let instanceIdx = 0;
    curves.forEach((curve, cIdx) => {
      for (let i = 0; i < particlesPerCurve; i++) {
        const offset = i / particlesPerCurve;
        const progress = (time + offset + cIdx * 0.3) % 1.0;
        const point = curve.getPointAt(progress);
        const tangent = curve.getTangentAt(progress);

        dummy.position.copy(point);
        dummy.lookAt(point.clone().add(tangent));
        
        // Gentle scale pulse
        const scale = 0.07 + Math.sin(progress * Math.PI) * 0.05;
        dummy.scale.set(scale, scale, scale * 2.2);
        dummy.updateMatrix();

        if (particlesRef.current) {
          particlesRef.current.setMatrixAt(instanceIdx, dummy.matrix);
        }
        instanceIdx++;
      }
    });

    if (particlesRef.current) {
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Subtle glowing static path threads */}
      {tubeGeometries.map((geom, idx) => (
        <mesh key={idx} geometry={geom}>
          <meshBasicMaterial
            color={idx % 2 === 0 ? '#D4826A' : '#B8A9C9'}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Instanced flowing light motes */}
      <instancedMesh
        ref={particlesRef}
        args={[undefined, undefined, particleCount]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#E8C4A0"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};
