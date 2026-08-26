'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CloudClusterProps {
  position: [number, number, number];
  scale?: [number, number, number];
  color?: string;
  speed?: number;
  opacity?: number;
}

const CloudPuff: React.FC<CloudClusterProps> = ({
  position,
  scale = [1, 1, 1],
  color = '#FBF7F0',
  speed = 0.025,
  opacity = 0.45,
}) => {
  const ref = useRef<THREE.Group>(null);
  const initialX = position[0];

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime() * speed;
      ref.current.position.x = initialX + Math.sin(t) * 1.5;
      ref.current.position.y = position[1] + Math.cos(t * 0.8) * 0.2;
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-1.3, -0.2, 0.4]} scale={[0.85, 0.75, 0.85]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.85}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[1.4, -0.1, -0.3]} scale={[0.95, 0.8, 0.95]}>
        <sphereGeometry args={[1.6, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.85}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export const CloudLayers: React.FC = () => {
  return (
    <group>
      {/* Upper Lavender Drift Band */}
      <CloudPuff position={[-7, 5, -12]} scale={[1.8, 1.2, 1.4]} color="#C5B9D6" opacity={0.35} speed={0.02} />
      <CloudPuff position={[8, 4, -14]} scale={[2.2, 1.3, 1.5]} color="#E8C4A0" opacity={0.35} speed={0.018} />

      {/* Mid Layer Peach Band */}
      <CloudPuff position={[-9, -3, -9]} scale={[2.0, 1.1, 1.2]} color="#E8C4A0" opacity={0.4} speed={0.024} />
      <CloudPuff position={[7, -6, -11]} scale={[2.4, 1.4, 1.4]} color="#FBF7F0" opacity={0.45} speed={0.02} />

      {/* Lower Paper Band */}
      <CloudPuff position={[-5, -12, -8]} scale={[2.8, 1.5, 1.5]} color="#FBF7F0" opacity={0.5} speed={0.026} />
      <CloudPuff position={[6, -18, -10]} scale={[2.5, 1.3, 1.3]} color="#E8C4A0" opacity={0.4} speed={0.022} />
    </group>
  );
};
