'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRigProps {
  scrollProgress: number;
  isLoaded?: boolean;
}

// 5 Key Spiral Orbit Stages with comfortable framing distance (Never over-zooms at Milestone 4)
const SPIRAL_WAYPOINTS = [
  { p: 0.0, angle: 0.0, radius: 12.2, y: 2.2, targetX: 0.0, targetY: 0.0 },              // 00 // Hero Wide Overview
  { p: 0.22, angle: Math.PI * 0.48, radius: 10.4, y: 2.4, targetX: 0.3, targetY: 0.1 },  // 01 // Reports Engine (East Facet)
  { p: 0.47, angle: Math.PI * 0.96, radius: 9.8, y: 1.8, targetX: -0.3, targetY: 0.1 },  // 02 // Forecast Horizons (North Facet)
  { p: 0.72, angle: Math.PI * 1.44, radius: 9.4, y: 2.2, targetX: 0.2, targetY: 0.1 },   // 03 // Anomaly Graph (West Facet)
  { p: 0.95, angle: Math.PI * 1.85, radius: 8.8, y: 1.6, targetX: -0.2, targetY: 0.1 },  // 04 // Query Lineage (Comfortable close framing, never clips)
];

export const CameraRig: React.FC<CameraRigProps> = ({
  scrollProgress,
  isLoaded = true,
}) => {
  const { camera, pointer } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 2.2, 12.2));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.0, 0));
  const entranceFactor = useRef(0);

  useEffect(() => {
    if (isLoaded) {
      camera.position.set(0, 2.2, 12.2);
    }
  }, [isLoaded, camera]);

  useFrame(({ clock }, delta) => {
    if (!isLoaded) return;

    const time = clock.getElapsedTime();
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    if (entranceFactor.current < 1) {
      entranceFactor.current = THREE.MathUtils.lerp(entranceFactor.current, 1, 0.04);
    }

    // Find bounding spiral waypoints
    let p1 = SPIRAL_WAYPOINTS[0];
    let p2 = SPIRAL_WAYPOINTS[SPIRAL_WAYPOINTS.length - 1];

    for (let i = 0; i < SPIRAL_WAYPOINTS.length - 1; i++) {
      if (p >= SPIRAL_WAYPOINTS[i].p && p <= SPIRAL_WAYPOINTS[i + 1].p) {
        p1 = SPIRAL_WAYPOINTS[i];
        p2 = SPIRAL_WAYPOINTS[i + 1];
        break;
      }
    }

    const span = p2.p - p1.p || 1;
    const factor = THREE.MathUtils.clamp((p - p1.p) / span, 0, 1);
    const ease = factor * factor * (3 - 2 * factor);

    const angle = THREE.MathUtils.lerp(p1.angle, p2.angle, ease);
    const radius = THREE.MathUtils.lerp(p1.radius, p2.radius, ease);
    const elevation = THREE.MathUtils.lerp(p1.y, p2.y, ease);
    const focalX = THREE.MathUtils.lerp(p1.targetX, p2.targetX, ease);
    const focalY = THREE.MathUtils.lerp(p1.targetY, p2.targetY, ease);

    // Compute spiral coordinates
    const orbitX = Math.sin(angle) * radius;
    const orbitZ = Math.cos(angle) * radius;

    // Subtle floating breath motion
    const floatY = Math.sin(time * 0.35) * 0.05;
    const floatX = Math.cos(time * 0.25) * 0.03;

    // Gentle pointer parallax
    const mouseX = pointer.x * 0.2;
    const mouseY = pointer.y * 0.15;

    const finalX = THREE.MathUtils.lerp(0, orbitX + mouseX + floatX, entranceFactor.current);
    const finalY = THREE.MathUtils.lerp(2.2, elevation + mouseY + floatY, entranceFactor.current);
    const finalZ = THREE.MathUtils.lerp(12.2, orbitZ, entranceFactor.current);

    targetPos.current.set(finalX, finalY, finalZ);
    targetLookAt.current.set(focalX + mouseX * 0.06, focalY + mouseY * 0.06, 0);

    const damp = Math.min(delta * 4.0, 0.22);
    camera.position.lerp(targetPos.current, damp);
    currentLookAt.current.lerp(targetLookAt.current, damp);
    camera.lookAt(currentLookAt.current);
  });

  return null;
};
