'use client';

import React, { useRef, useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DrawerDetail } from '../landing/InspectDrawer';

export interface IslandInstanceProps {
  id?: string;
  label?: string;
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  bobSpeed?: number;
  bobPhase?: number;
  activeScrollRange?: [number, number];
  currentScroll?: number;
  detail?: DrawerDetail;
  onSelectHotspot?: (detail: DrawerDetail) => void;
}

export const IslandInstance: React.FC<IslandInstanceProps> = ({
  label,
  position,
  scale = 3.8,
  rotationY = 0,
  bobSpeed = 0.32,
  bobPhase = 0,
  activeScrollRange,
  currentScroll = 0,
  detail,
  onSelectHotspot,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/heroisland.glb');

  // Clone scene and preserve full embedded textures and vibrant colors
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const orig = mesh.material as THREE.MeshStandardMaterial;
          const mat = new THREE.MeshStandardMaterial({
            map: orig.map || null,
            roughnessMap: orig.roughnessMap || null,
            metalnessMap: orig.metalnessMap || null,
            normalMap: orig.normalMap || null,
            color: new THREE.Color(1, 1, 1), // Pure white so texture colors shine through
            roughness: 0.65,
            metalness: 0.1,
            side: THREE.DoubleSide,
          });

          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.map.needsUpdate = true;
          }

          mesh.material = mat;
        }
      }
    });

    // Auto center geometry
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = scale / (maxDim || 1);

    clone.position.sub(center);
    clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

    return clone;
  }, [scene, scale]);

  const isHotspotVisible =
    activeScrollRange &&
    currentScroll >= activeScrollRange[0] &&
    currentScroll <= activeScrollRange[1];

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      // Gentle breathing float & meditative rotation
      groupRef.current.position.y = position[1] + Math.sin(time * bobSpeed + bobPhase) * 0.16;
      groupRef.current.rotation.y = rotationY + time * 0.04;
      groupRef.current.rotation.z = Math.sin(time * (bobSpeed * 0.7) + bobPhase) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* 3D Hero Island GLB Model with Vibrant Textures */}
      <primitive object={clonedScene} />

      {/* Scroll-Gated 3D Interactive Hotspot Pin */}
      {isHotspotVisible && detail && label && (
        <Html position={[0, 1.4, 0]} distanceFactor={14} center>
          <button
            type="button"
            onClick={() => onSelectHotspot && onSelectHotspot(detail)}
            className="group cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3EDE4]/95 backdrop-blur-md border border-[#4A4238]/15 hover:border-[#D4826A] shadow-md hover:scale-105 transition-all duration-300 pointer-events-auto whitespace-nowrap animate-in fade-in zoom-in-90"
          >
            <span className="w-2 h-2 rounded-full bg-[#D4826A] animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#4A4238] font-medium group-hover:text-[#D4826A]">
              {label}
            </span>
            <span className="text-xs text-[#D4826A] group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>
        </Html>
      )}

      {/* Ambient warm point light */}
      <pointLight color="#FFEAD5" intensity={0.6} distance={6} position={[0, 1.5, 0]} />
    </group>
  );
};

useGLTF.preload('/heroisland.glb');
