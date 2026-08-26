'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRigProps {
  scrollProgress: number;
  isLoaded?: boolean;
}

// 4 deep island waypoints across the descent (alternating right / left)
const WAYPOINTS = [
  { p: 0.0, pos: [0, 4.8, 11.5], target: [0, 0.5, 0] },             // 00 // Hero Overview
  { p: 0.25, pos: [0.5, -3.5, 5.0], target: [2.2, -4.0, -1.0] },    // 01 // Reports Engine (Right)
  { p: 0.5, pos: [-0.5, -9.5, 5.0], target: [-2.2, -10.0, -1.0] },  // 02 // Forecasts (Left)
  { p: 0.75, pos: [0.5, -15.5, 5.0], target: [2.2, -16.0, -1.0] },  // 03 // Monitoring (Right)
  { p: 1.0, pos: [-0.5, -21.5, 5.0], target: [-2.2, -22.0, -1.0] }, // 04 // Conversational Query (Left)
];

export const CameraRig: React.FC<CameraRigProps> = ({
  scrollProgress,
  isLoaded = true,
}) => {
  const { camera, pointer } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 4.8, 11.5));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.5, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.5, 0));
  const entranceFactor = useRef(0);

  useEffect(() => {
    if (isLoaded) {
      camera.position.set(0, 4.8, 11.5);
    }
  }, [isLoaded, camera]);

  useFrame(({ clock }, delta) => {
    if (!isLoaded) return;

    const time = clock.getElapsedTime();
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    if (entranceFactor.current < 1) {
      entranceFactor.current = THREE.MathUtils.lerp(entranceFactor.current, 1, 0.04);
    }

    // Find bounding waypoints
    let p1 = WAYPOINTS[0];
    let p2 = WAYPOINTS[WAYPOINTS.length - 1];

    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      if (p >= WAYPOINTS[i].p && p <= WAYPOINTS[i + 1].p) {
        p1 = WAYPOINTS[i];
        p2 = WAYPOINTS[i + 1];
        break;
      }
    }

    const span = p2.p - p1.p || 1;
    const factor = THREE.MathUtils.clamp((p - p1.p) / span, 0, 1);
    const ease = factor * factor * (3 - 2 * factor);

    const x = THREE.MathUtils.lerp(p1.pos[0], p2.pos[0], ease);
    const y = THREE.MathUtils.lerp(p1.pos[1], p2.pos[1], ease);
    const z = THREE.MathUtils.lerp(p1.pos[2], p2.pos[2], ease);

    const lookX = THREE.MathUtils.lerp(p1.target[0], p2.target[0], ease);
    const lookY = THREE.MathUtils.lerp(p1.target[1], p2.target[1], ease);
    const lookZ = THREE.MathUtils.lerp(p1.target[2], p2.target[2], ease);

    // Subtle floating breath
    const floatY = Math.sin(time * 0.35) * 0.08;
    const floatX = Math.cos(time * 0.25) * 0.05;

    // Gentle pointer parallax
    const mouseX = pointer.x * 0.3;
    const mouseY = pointer.y * 0.2;

    const finalX = THREE.MathUtils.lerp(0, x + mouseX + floatX, entranceFactor.current);
    const finalY = THREE.MathUtils.lerp(4.8, y + mouseY + floatY, entranceFactor.current);
    const finalZ = THREE.MathUtils.lerp(11.5, z, entranceFactor.current);

    targetPos.current.set(finalX, finalY, finalZ);
    targetLookAt.current.set(lookX + mouseX * 0.1, lookY + mouseY * 0.1, lookZ);

    const damp = Math.min(delta * 4.0, 0.2);
    camera.position.lerp(targetPos.current, damp);
    currentLookAt.current.lerp(targetLookAt.current, damp);
    camera.lookAt(currentLookAt.current);
  });

  return null;
};
