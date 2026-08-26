'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uBottomColor;
  uniform float uScroll;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    // Smooth vertical gradient factor from normalized Y position
    float factor = clamp((vWorldPosition.y + 20.0) / 60.0, 0.0, 1.0);
    
    // Shift colors subtly on scroll
    vec3 horizonShift = mix(uHorizonColor, vec3(0.92, 0.78, 0.72), uScroll * 0.3);
    vec3 topShift = mix(uTopColor, vec3(0.72, 0.66, 0.80), uScroll * 0.35);
    
    vec3 color;
    if (factor < 0.4) {
      color = mix(uBottomColor, horizonShift, factor / 0.4);
    } else {
      color = mix(horizonShift, topShift, (factor - 0.4) / 0.6);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface SkyDomeProps {
  scrollProgress?: number;
}

export const SkyDome: React.FC<SkyDomeProps> = ({ scrollProgress = 0 }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTopColor: { value: new THREE.Color('#B8A9C9') },       // Dusty Lavender
    uHorizonColor: { value: new THREE.Color('#E8C4A0') },   // Warm Peach
    uBottomColor: { value: new THREE.Color('#F3EDE4') },    // Calm Paper Base
    uScroll: { value: 0 },
  }), []);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uScroll.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uScroll.value,
        scrollProgress,
        0.05
      );
    }
  });

  return (
    <mesh position={[0, 0, 0]} scale={[80, 80, 80]}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
};
