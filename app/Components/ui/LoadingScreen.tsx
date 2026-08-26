'use client';

import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('INITIALIZING SCENE');
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    // Dynamic smooth progress progression with stabilization
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        let inc = Math.random() * 3.5 + 1.5;
        if (prev > 65) inc = Math.random() * 2.2 + 0.8;
        if (prev > 88) inc = Math.random() * 1.2 + 0.4;
        const next = Math.min(prev + inc, 100);

        if (next < 30) setStatus('LOADING 3D ATMOSPHERE');
        else if (next < 60) setStatus('CALIBRATING ISLANDS');
        else if (next < 90) setStatus('WEAVING DATA FLOWS');
        else setStatus('EXPERIENCE READY');

        return next;
      });
    }, 35);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      // 700ms stabilization buffer before smooth fade-out
      const timer = setTimeout(() => {
        setIsHiding(true);
        setTimeout(() => {
          onComplete();
        }, 600);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  // Radius = 100, circumference = 2 * PI * 100 = 628.3
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      id="v3d-loader"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F3EDE4] transition-opacity duration-600 ${
        isHiding ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* SVG Circular Progress Ring + Centered 3D Rotating Logo */}
      <div className="relative w-64 h-64 flex items-center justify-center mb-6">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="transparent"
            stroke="rgba(74, 66, 56, 0.1)"
            strokeWidth="3"
          />
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="transparent"
            stroke="#D4826A"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-150 ease-out"
          />
        </svg>

        {/* 3D Rotating Geometric Logo Prism */}
        <div className="relative w-20 h-20 flex items-center justify-center animate-v3d-rotate z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D4826A] via-[#E8C4A0] to-[#B8A9C9] shadow-lg shadow-[#D4826A]/30 transform rotate-45 animate-pulse" />
          <div className="absolute w-7 h-7 rounded-lg bg-[#F3EDE4] transform rotate-12" />
        </div>
      </div>

      {/* Status & Counter */}
      <div className="text-center space-y-2">
        <div className="text-xs font-mono tracking-[0.25em] uppercase text-[#D4826A] animate-v3d-pulse">
          {status}
        </div>
        <div className="font-serif text-3xl md:text-4xl text-[#4A4238] font-normal tracking-tight">
          {Math.floor(progress)}%
        </div>
        <div className="text-[11px] font-mono tracking-widest text-[#4A4238]/50 uppercase">
          AnalyzeIt · Spatial Intelligence
        </div>
      </div>
    </div>
  );
};
