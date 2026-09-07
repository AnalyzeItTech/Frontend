'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SkyDome } from './SkyDome';
import { CloudLayers } from './CloudLayers';
import { CentralCrystalModel } from './CentralCrystalModel';
import { CameraRig } from './CameraRig';
import { DrawerDetail } from '../landing/InspectDrawer';
import { useTheme } from '../ui/ThemeProvider';

interface SceneCanvasProps {
  scrollProgress: number;
  isLoaded?: boolean;
  isCanvasVisible?: boolean;
  onSelectHotspot?: (detail: DrawerDetail) => void;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  scrollProgress,
  isLoaded = true,
  isCanvasVisible = true,
  onSelectHotspot,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isCapable, setIsCapable] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);

    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2;
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (prefersReduced || lowCores || !gl) {
        setIsCapable(false);
      }
    } catch {
      setIsCapable(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 w-full h-full z-0 bg-gradient-to-b from-[#B8A9C9] via-[#E8C4A0] to-[#F3EDE4] dark:from-[#211B19] dark:via-[#29211E] dark:to-[#171514] pointer-events-none" />
    );
  }

  if (!isCapable) {
    return (
      <div className="fixed inset-0 w-full h-full z-0 bg-gradient-to-b from-[#B8A9C9] via-[#E8C4A0] to-[#F3EDE4] dark:from-[#211B19] dark:via-[#29211E] dark:to-[#171514] pointer-events-none transition-opacity duration-1000" />
    );
  }

  return (
    <div
      id="playcanvas-wrapper"
      className={`fixed inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-500 ${
        isCanvasVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Canvas
        camera={{ position: [0, 2.8, 11.5], fov: 48, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        {/* Adaptive Three.js lighting for Light / Dark Mode */}
        <ambientLight intensity={isDark ? 0.7 : 1.1} color={isDark ? '#FFFFFF' : '#FFFFFF'} />
        <hemisphereLight
          intensity={isDark ? 0.5 : 0.7}
          groundColor={isDark ? '#171514' : '#E8DFD3'}
          color={isDark ? '#8A7A9E' : '#D5C5E5'}
        />
        <directionalLight
          position={[12, 16, 10]}
          intensity={isDark ? 1.8 : 1.4}
          color={isDark ? '#FFE5CC' : '#FFF5EB'}
        />
        <directionalLight
          position={[-10, -6, -8]}
          intensity={isDark ? 0.6 : 0.45}
          color={isDark ? '#5C4A70' : '#C5B8D8'}
        />

        {/* Dynamic Sky Gradient Dome with Dark Mode */}
        <SkyDome scrollProgress={scrollProgress} />
        <CloudLayers />

        {/* Floating Atmosphere Motes */}
        <Sparkles
          count={65}
          scale={[22, 18, 22]}
          size={isDark ? 3.5 : 3.0}
          speed={0.25}
          opacity={isDark ? 0.75 : 0.6}
          color={isDark ? '#E3836C' : '#E8C4A0'}
        />

        {/* Single Central Abstract Faceted Crystal Form */}
        <CentralCrystalModel
          scrollProgress={scrollProgress}
          onSelectHotspot={onSelectHotspot}
        />

        {/* Spiral Contracting Camera Orbit & Focal Tracking */}
        <CameraRig
          scrollProgress={scrollProgress}
          isLoaded={isLoaded}
        />
      </Canvas>
    </div>
  );
};
