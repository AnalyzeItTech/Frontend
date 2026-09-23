'use client';

import React, { useRef, useEffect, MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRigProps {
  scrollProgressRef: MutableRefObject<number>;
  isLoaded?: boolean;
}

/** Scroll drives radius / elevation / FOV; continuous orbitAngle spins the viewpoint. */
const SPIRAL_WAYPOINTS = [
  { p: 0.0, angle: 0.0, radius: 12.8, y: 2.8, fov: 48, targetX: 0.0, targetY: 0.12 },
  { p: 0.25, angle: Math.PI * 0.5, radius: 11.0, y: 2.4, fov: 46, targetX: 0.25, targetY: 0.1 },
  { p: 0.5, angle: Math.PI * 1.05, radius: 9.4, y: 1.9, fov: 44, targetX: -0.3, targetY: 0.08 },
  { p: 0.75, angle: Math.PI * 1.55, radius: 8.4, y: 2.2, fov: 42, targetX: 0.22, targetY: 0.1 },
  { p: 1.0, angle: Math.PI * 2.1, radius: 7.4, y: 1.4, fov: 40, targetX: -0.12, targetY: 0.06 },
];

function easeInOutCubic(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  scrollProgressRef,
  isLoaded = true,
}) => {
  const { camera, pointer } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 2.8, 12.8));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.12, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.12, 0));
  const entranceFactor = useRef(0);
  const smoothedProgress = useRef(0);
  const orbitDrift = useRef(0);
  const targetFov = useRef(48);

  useEffect(() => {
    if (isLoaded) {
      entranceFactor.current = 0;
      camera.position.set(0, 2.8, 12.8);
      if ('fov' in camera) {
        (camera as THREE.PerspectiveCamera).fov = 48;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    }
  }, [isLoaded, camera]);

  useFrame(({ clock }, delta) => {
    if (!isLoaded) return;

    const time = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    smoothedProgress.current = THREE.MathUtils.damp(
      smoothedProgress.current,
      THREE.MathUtils.clamp(scrollProgressRef.current, 0, 1),
      7,
      dt
    );
    const p = smoothedProgress.current;

    // Continuous camera orbit — primary motion instead of spinning the crystal
    const orbitSpeed = 0.18 + p * 0.12;
    orbitDrift.current += dt * orbitSpeed;

    if (entranceFactor.current < 0.999) {
      entranceFactor.current = THREE.MathUtils.damp(entranceFactor.current, 1, 2.8, dt);
    }

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
    const ease = easeInOutCubic(THREE.MathUtils.clamp((p - p1.p) / span, 0, 1));

    const scrollAngle = THREE.MathUtils.lerp(p1.angle, p2.angle, ease);
    const angle = scrollAngle + orbitDrift.current;
    const radius = THREE.MathUtils.lerp(p1.radius, p2.radius, ease);
    const elevation = THREE.MathUtils.lerp(p1.y, p2.y, ease);
    const focalX = THREE.MathUtils.lerp(p1.targetX, p2.targetX, ease);
    const focalY = THREE.MathUtils.lerp(p1.targetY, p2.targetY, ease);
    targetFov.current = THREE.MathUtils.lerp(p1.fov, p2.fov, ease);

    // Gentle vertical bob on the orbit path
    const bob = Math.sin(time * 0.35) * 0.12 * (1 - p * 0.4);
    const sway = Math.cos(time * 0.22) * 0.08 * (1 - p * 0.5);

    const mouseWeight = THREE.MathUtils.lerp(0.35, 0.14, p);
    const mouseX = pointer.x * mouseWeight;
    const mouseY = pointer.y * mouseWeight * 0.7;

    const orbitX = Math.sin(angle) * (radius + sway);
    const orbitZ = Math.cos(angle) * (radius + sway);

    const e = entranceFactor.current;
    targetPos.current.set(
      THREE.MathUtils.lerp(0, orbitX + mouseX, e),
      THREE.MathUtils.lerp(2.8, elevation + bob + mouseY, e),
      THREE.MathUtils.lerp(12.8, orbitZ, e)
    );
    targetLookAt.current.set(
      focalX + mouseX * 0.1,
      focalY + mouseY * 0.08 + Math.sin(time * 0.4) * 0.02,
      0
    );

    const damp = Math.min(1 - Math.exp(-4.8 * dt), 0.26);
    camera.position.lerp(targetPos.current, damp);
    currentLookAt.current.lerp(targetLookAt.current, damp);
    camera.lookAt(currentLookAt.current);

    if ('fov' in camera) {
      const persp = camera as THREE.PerspectiveCamera;
      const nextFov = THREE.MathUtils.damp(persp.fov, targetFov.current, 5, dt);
      if (Math.abs(persp.fov - nextFov) > 0.02) {
        persp.fov = nextFov;
        persp.updateProjectionMatrix();
      }
    }
  });

  return null;
};
