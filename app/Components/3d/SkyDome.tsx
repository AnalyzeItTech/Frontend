'use client';

import React, { useMemo, useRef, useEffect, MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '../ui/ThemeProvider';
const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
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

  void main() {
    float factor = clamp((vWorldPosition.y + 20.0) / 60.0, 0.0, 1.0);
    vec3 warmPull = vec3(1.1, 0.97, 0.9);
    vec3 horizonShift = mix(uHorizonColor, uHorizonColor * warmPull, uScroll * 0.6);
    vec3 topShift = mix(uTopColor, uTopColor * vec3(1.14, 1.02, 1.1), uScroll * 0.5);
    vec3 bottomShift = mix(uBottomColor, uBottomColor * vec3(1.06, 0.98, 0.94), uScroll * 0.4);
    vec3 color = factor < 0.4
      ? mix(bottomShift, horizonShift, factor / 0.4)
      : mix(horizonShift, topShift, (factor - 0.4) / 0.6);

    float horizonGlow = exp(-pow((factor - 0.42) * 7.0, 2.0)) * (0.08 + uScroll * 0.06);
    color += vec3(1.0, 0.72, 0.55) * horizonGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface SkyDomeProps {
  scrollProgressRef: MutableRefObject<number>;
}

export const SkyDome: React.FC<SkyDomeProps> = ({ scrollProgressRef }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const uniforms = useMemo(
    () => ({
      uTopColor: { value: new THREE.Color(isDark ? '#211B19' : '#B8A9C9') },
      uHorizonColor: { value: new THREE.Color(isDark ? '#29211E' : '#E8C4A0') },
      uBottomColor: { value: new THREE.Color(isDark ? '#171514' : '#F3EDE4') },
      uScroll: { value: 0 },
    }),
    [isDark]
  );

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTopColor.value.set(isDark ? '#211B19' : '#B8A9C9');
      materialRef.current.uniforms.uHorizonColor.value.set(isDark ? '#29211E' : '#E8C4A0');
      materialRef.current.uniforms.uBottomColor.value.set(isDark ? '#171514' : '#F3EDE4');
    }
  }, [isDark]);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uScroll.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uScroll.value,
        scrollProgressRef.current,
        0.06
      );
    }
  });

  return (
    <mesh scale={[60, 60, 60]}>
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
