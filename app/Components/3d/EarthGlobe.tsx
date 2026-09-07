'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useTheme } from '../ui/ThemeProvider';
import { WORLD_LANDMASS_POLYGONS } from './landmassData';
import {
  IconX,
  IconWorld,
  IconPlus,
  IconMinus,
  IconCompass,
  IconGridDots,
  IconCloud,
  IconRoute,
  IconActivity,
  IconMapPin,
  IconSearch,
} from '@tabler/icons-react';

interface EarthGlobeProps {
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  className?: string;
}

export interface GlobeLocation {
  name: string;
  country: string;
  lat: number;
  lon: number;
  ping: string;
  status: string;
  throughput: string;
  region: string;
  isMajorHub?: boolean;
}

// Global Hubs and Major Searchable Destinations Worldwide
const SEARCHABLE_LOCATIONS: GlobeLocation[] = [
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lon: -122.4194, ping: '12ms', status: 'Optimal', throughput: '4.8 GB/s', region: 'US West', isMajorHub: true },
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.006, ping: '18ms', status: 'Optimal', throughput: '6.2 GB/s', region: 'US East', isMajorHub: true },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, ping: '24ms', status: 'Optimal', throughput: '5.1 GB/s', region: 'Europe West', isMajorHub: true },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lon: 8.6821, ping: '26ms', status: 'Optimal', throughput: '7.4 GB/s', region: 'Europe Central', isMajorHub: true },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, ping: '42ms', status: 'Optimal', throughput: '4.2 GB/s', region: 'Asia East', isMajorHub: true },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, ping: '38ms', status: 'Optimal', throughput: '3.9 GB/s', region: 'Asia South', isMajorHub: true },
  { name: 'Mumbai', country: 'India', lat: 19.076, lon: 72.8777, ping: '34ms', status: 'Optimal', throughput: '4.5 GB/s', region: 'India West', isMajorHub: true },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, ping: '64ms', status: 'Optimal', throughput: '2.8 GB/s', region: 'Oceania', isMajorHub: true },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, ping: '72ms', status: 'Optimal', throughput: '2.1 GB/s', region: 'South America', isMajorHub: true },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708, ping: '30ms', status: 'Optimal', throughput: '3.6 GB/s', region: 'Middle East', isMajorHub: true },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, ping: '28ms', status: 'Optimal', throughput: '3.8 GB/s', region: 'Europe West' },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.405, ping: '31ms', status: 'Optimal', throughput: '3.2 GB/s', region: 'Europe Central' },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, ping: '22ms', status: 'Optimal', throughput: '5.8 GB/s', region: 'Europe West' },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, ping: '25ms', status: 'Optimal', throughput: '3.4 GB/s', region: 'North America' },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298, ping: '19ms', status: 'Optimal', throughput: '4.1 GB/s', region: 'US Midwest' },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437, ping: '15ms', status: 'Optimal', throughput: '4.6 GB/s', region: 'US West' },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lon: -122.3321, ping: '14ms', status: 'Optimal', throughput: '4.9 GB/s', region: 'US Northwest' },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.978, ping: '44ms', status: 'Optimal', throughput: '5.0 GB/s', region: 'Asia East' },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lon: 114.1694, ping: '40ms', status: 'Optimal', throughput: '4.7 GB/s', region: 'Asia East' },
  { name: 'Bengaluru', country: 'India', lat: 12.9716, lon: 77.5946, ping: '36ms', status: 'Optimal', throughput: '4.0 GB/s', region: 'India South' },
  { name: 'Delhi', country: 'India', lat: 28.6139, lon: 77.209, ping: '35ms', status: 'Optimal', throughput: '3.8 GB/s', region: 'India North' },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lon: 8.5417, ping: '29ms', status: 'Optimal', throughput: '3.1 GB/s', region: 'Europe Central' },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lon: 18.0686, ping: '33ms', status: 'Optimal', throughput: '2.9 GB/s', region: 'Europe North' },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241, ping: '92ms', status: 'Optimal', throughput: '1.8 GB/s', region: 'Africa South' },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, ping: '48ms', status: 'Optimal', throughput: '2.4 GB/s', region: 'North Africa' },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, ping: '78ms', status: 'Optimal', throughput: '1.9 GB/s', region: 'South America' },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332, ping: '38ms', status: 'Optimal', throughput: '2.6 GB/s', region: 'North America' },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lon: 174.7633, ping: '68ms', status: 'Optimal', throughput: '2.2 GB/s', region: 'Oceania' },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lon: -6.2603, ping: '21ms', status: 'Optimal', throughput: '4.9 GB/s', region: 'Europe West' },
  { name: 'Helsinki', country: 'Finland', lat: 60.1699, lon: 24.9384, ping: '35ms', status: 'Optimal', throughput: '2.7 GB/s', region: 'Europe North' },
];

const MAJOR_HUBS = SEARCHABLE_LOCATIONS.filter((l) => l.isMajorHub);

const ARC_PAIRS: Array<[number, number]> = [
  [0, 1], // SF -> NY
  [1, 2], // NY -> London
  [2, 3], // London -> Frankfurt
  [3, 9], // Frankfurt -> Dubai
  [9, 6], // Dubai -> Mumbai
  [6, 5], // Mumbai -> Singapore
  [5, 4], // Singapore -> Tokyo
  [4, 0], // Tokyo -> SF
  [5, 7], // Singapore -> Sydney
  [1, 8], // NY -> São Paulo
];

/**
 * Generate high-definition texture map using authentic Natural Earth landmass dataset
 * with seamless antimeridian handling and calibrated high contrast
 */
function createEditorialEarthTextures(isDark: boolean) {
  const width = 2048;
  const height = 1024;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Ocean Color: Clear separation from landmass
  if (isDark) {
    const oceanGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width);
    oceanGrad.addColorStop(0, '#171514');
    oceanGrad.addColorStop(1, '#0F0E0D');
    ctx.fillStyle = oceanGrad;
  } else {
    const oceanGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width);
    oceanGrad.addColorStop(0, '#F0E8DD');
    oceanGrad.addColorStop(1, '#E2D6C6');
    ctx.fillStyle = oceanGrad;
  }
  ctx.fillRect(0, 0, width, height);

  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // 2. Render Authentic Landmass Polygons from Natural Earth Data with antimeridian seam safety
  WORLD_LANDMASS_POLYGONS.forEach((poly) => {
    ctx.beginPath();
    let prevLon: number | null = null;
    poly.coords.forEach(([lon, lat], idx) => {
      const x = toX(lon);
      const y = toY(lat);
      if (idx === 0 || (prevLon !== null && Math.abs(lon - prevLon) > 180)) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      prevLon = lon;
    });
    ctx.closePath();

    if (isDark) {
      ctx.fillStyle = '#2E2721';
      ctx.fill();
      ctx.strokeStyle = '#E3836C';
      ctx.lineWidth = 2.0;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#C8B6A2';
      ctx.fill();
      ctx.strokeStyle = '#A85A44';
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
  });

  // 3. Prominent City Hub Clusters (Glowing Amber / Gold)
  SEARCHABLE_LOCATIONS.forEach((loc) => {
    const x = toX(loc.lon);
    const y = toY(loc.lat);
    const radius = loc.isMajorHub ? 6 : 4;
    const rad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.5);
    rad.addColorStop(0, '#FFB74D');
    rad.addColorStop(0.4, 'rgba(212, 130, 106, 0.7)');
    rad.addColorStop(1, 'rgba(212, 130, 106, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Cloud Canopy Texture
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 1024;
  cloudCanvas.height = 512;
  const cloudCtx = cloudCanvas.getContext('2d')!;
  cloudCtx.clearRect(0, 0, 1024, 512);

  for (let i = 0; i < 35; i++) {
    const cx = Math.random() * 1024;
    const cy = 70 + Math.random() * 370;
    const rx = 50 + Math.random() * 110;
    const ry = 14 + Math.random() * 28;
    const grad = cloudCtx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0, isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.6, isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.12)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    cloudCtx.fillStyle = grad;
    cloudCtx.beginPath();
    cloudCtx.ellipse(cx, cy, rx, ry, (Math.random() - 0.5) * 0.3, 0, Math.PI * 2);
    cloudCtx.fill();
  }

  const earthTexture = new THREE.CanvasTexture(canvas);
  earthTexture.colorSpace = THREE.SRGBColorSpace;

  const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
  cloudTexture.colorSpace = THREE.SRGBColorSpace;

  return { earthTexture, cloudTexture };
}

// Convert Geo coordinates to 3D Cartesian coordinates on sphere
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Convert 3D Point on sphere back to Lat/Lon
function vector3ToLatLon(point: THREE.Vector3): { lat: number; lon: number } {
  const norm = point.clone().normalize();
  const phi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
  const theta = Math.atan2(norm.z, -norm.x);
  const lat = 90 - (phi * 180) / Math.PI;
  let lon = (theta * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  return { lat, lon };
}

// 3D Bézier Spline for Telemetry Flight Arcs
function createArcCurve(p1: THREE.Vector3, p2: THREE.Vector3, radius: number): THREE.CubicBezierCurve3 {
  const distance = p1.distanceTo(p2);
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const altitude = radius + distance * 0.24;
  mid.normalize().multiplyScalar(altitude);

  const control1 = new THREE.Vector3().addVectors(p1, mid).multiplyScalar(0.5).normalize().multiplyScalar(altitude * 0.95);
  const control2 = new THREE.Vector3().addVectors(p2, mid).multiplyScalar(0.5).normalize().multiplyScalar(altitude * 0.95);

  return new THREE.CubicBezierCurve3(p1, control1, control2, p2);
}

export const EarthGlobe: React.FC<EarthGlobeProps> = ({
  isExpanded,
  onToggleExpand,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Feature UI States
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showClouds, setShowClouds] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [selectedHub, setSelectedHub] = useState<GlobeLocation | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [cameraAltitude, setCameraAltitude] = useState(6400);

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SEARCHABLE_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.country.toLowerCase().includes(q) ||
        loc.region.toLowerCase().includes(q)
    ).slice(0, 7);
  }, [searchQuery]);

  // Mutable Three.js Object References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const earthMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const atmosphereMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const cloudMeshRef = useRef<THREE.Mesh | null>(null);
  const gridGroupRef = useRef<THREE.Group | null>(null);
  const telemetryGroupRef = useRef<THREE.Group | null>(null);
  const arcMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const hubMarkersRef = useRef<THREE.Mesh[]>([]);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const isFlyingRef = useRef(false);

  // Smooth Zoom In / Zoom Out
  const handleZoom = useCallback((delta: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || isFlyingRef.current) return;

    const currentLen = camera.position.length();
    const targetLen = Math.max(3.8, Math.min(14.5, currentLen + delta));
    const factor = targetLen / currentLen;
    camera.position.multiplyScalar(factor);
    controls.update();
  }, []);

  // Google Earth "Fly To" City Navigation with Great-Circle Spherical Slerp
  const flyToCity = useCallback((hub: GlobeLocation) => {
    setSelectedHub(hub);
    setSearchQuery('');
    setIsSearchOpen(false);

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || isFlyingRef.current) return;

    isFlyingRef.current = true;
    controls.enabled = false;

    const targetDir = latLonToVector3(hub.lat, hub.lon, 1.0).normalize();
    const startPos = camera.position.clone();
    const startDist = startPos.length();
    const startDir = startPos.clone().normalize();

    const qTarget = new THREE.Quaternion().setFromUnitVectors(startDir, targetDir);
    const qStart = new THREE.Quaternion();

    const duration = 1400;
    const startTime = performance.now();
    const targetDist = 5.8;

    function stepFly(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const currentDir = startDir.clone();
      const currentQ = qStart.clone().slerp(qTarget, ease);
      currentDir.applyQuaternion(currentQ);

      const arcAltitude = Math.sin(ease * Math.PI) * 2.2;
      const currentDist = THREE.MathUtils.lerp(startDist, targetDist, ease) + arcAltitude;

      camera!.position.copy(currentDir.multiplyScalar(currentDist));
      camera!.lookAt(0, 0, 0);

      if (t < 1) {
        requestAnimationFrame(stepFly);
      } else {
        controls!.target.set(0, 0, 0);
        controls!.enabled = true;
        controls!.update();
        isFlyingRef.current = false;
      }
    }
    requestAnimationFrame(stepFly);
  }, []);

  // Reset North Orientation
  const resetNorth = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || isFlyingRef.current) return;

    isFlyingRef.current = true;
    controls.enabled = false;

    const currentDist = camera.position.length();
    const targetPos = new THREE.Vector3(0, 2.5, currentDist * 0.95);
    const startPos = camera.position.clone();
    const startTime = performance.now();

    function stepNorth(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / 800);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      camera!.position.lerpVectors(startPos, targetPos, ease);

      if (t < 1) {
        requestAnimationFrame(stepNorth);
      } else {
        controls!.target.set(0, 0, 0);
        controls!.enabled = true;
        controls!.update();
        isFlyingRef.current = false;
      }
    }
    requestAnimationFrame(stepNorth);
  }, []);

  // ─── 1. MOUNT EFFECT: Creates Three.js Scene ONCE on mount ───────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2.5, isExpanded ? 7.2 : 9.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.2 : 1.05;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 3.8;
    controls.maxDistance = 14.5;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.autoRotate = !isExpanded;
    controls.autoRotateSpeed = 0.45;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.0 : 1.3);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xfff5ea, isDark ? 2.4 : 2.2);
    sunLight.position.set(14, 10, 12);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const rimLight = new THREE.DirectionalLight(0xe3836c, isDark ? 0.8 : 0.5);
    rimLight.position.set(-12, -6, -10);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const earthRadius = 2.6;
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const { earthTexture, cloudTexture } = createEditorialEarthTextures(isDark);

    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.65,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;
    earthMatRef.current = earthMat;

    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.035, 48, 48);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
          gl_FragColor = vec4(glowColor, intensity * 0.7);
        }
      `,
      uniforms: {
        glowColor: { value: new THREE.Color(isDark ? 0xe3836c : 0x8fa98f) },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);
    atmosphereMatRef.current = atmosphereMat;

    const cloudGeo = new THREE.SphereGeometry(earthRadius * 1.018, 48, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: isDark ? 0.45 : 0.6,
      blending: THREE.AdditiveBlending,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudMesh);
    cloudMeshRef.current = cloudMesh;

    const gridGroup = new THREE.Group();
    earthGroup.add(gridGroup);
    gridGroupRef.current = gridGroup;

    const gridMat = new THREE.LineBasicMaterial({
      color: isDark ? 0xe3836c : 0x4a4238,
      transparent: true,
      opacity: isDark ? 0.08 : 0.09,
    });

    for (let lat = -75; lat <= 75; lat += 15) {
      const points: THREE.Vector3[] = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        points.push(latLonToVector3(lat, lon, earthRadius * 1.002));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      gridGroup.add(new THREE.Line(lineGeo, gridMat));
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      const points: THREE.Vector3[] = [];
      for (let lat = -85; lat <= 85; lat += 5) {
        points.push(latLonToVector3(lat, lon, earthRadius * 1.002));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      gridGroup.add(new THREE.Line(lineGeo, gridMat));
    }

    const telemetryGroup = new THREE.Group();
    earthGroup.add(telemetryGroup);
    telemetryGroupRef.current = telemetryGroup;

    const hubMarkers: THREE.Mesh[] = [];
    const pinGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xe3836c });
    const ringGeo = new THREE.RingGeometry(0.055, 0.075, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffa07a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    MAJOR_HUBS.forEach((hub) => {
      const pos = latLonToVector3(hub.lat, hub.lon, earthRadius);
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      telemetryGroup.add(pin);
      hubMarkers.push(pin);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos.clone().multiplyScalar(1.002));
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      telemetryGroup.add(ring);
    });
    hubMarkersRef.current = hubMarkers;

    const pulseObjects: Array<{ curve: THREE.CubicBezierCurve3; mesh: THREE.Mesh; progress: number; speed: number }> = [];
    const pulseGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    arcMaterialsRef.current = [];

    ARC_PAIRS.forEach(([fromIdx, toIdx], idx) => {
      const p1 = latLonToVector3(MAJOR_HUBS[fromIdx].lat, MAJOR_HUBS[fromIdx].lon, earthRadius);
      const p2 = latLonToVector3(MAJOR_HUBS[toIdx].lat, MAJOR_HUBS[toIdx].lon, earthRadius);
      const curve = createArcCurve(p1, p2, earthRadius);

      const tubeGeo = new THREE.TubeGeometry(curve, 44, 0.0065, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0xe3836c,
        transparent: true,
        opacity: isExpanded ? 0.45 : 0.25,
      });
      arcMaterialsRef.current.push(tubeMat);
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      telemetryGroup.add(tubeMesh);

      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      telemetryGroup.add(pulseMesh);
      pulseObjects.push({
        curve,
        mesh: pulseMesh,
        progress: (idx * 0.1) % 1.0,
        speed: 0.0035 + (idx % 3) * 0.0012,
      });
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const earthHit = raycaster.intersectObject(earthMesh);
      if (earthHit.length > 0) {
        const localPoint = earthGroup.worldToLocal(earthHit[0].point.clone());
        const geo = vector3ToLatLon(localPoint);
        setCursorCoords(geo);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hubMarkers);

      if (intersects.length > 0) {
        const hitIdx = hubMarkers.indexOf(intersects[0].object as THREE.Mesh);
        if (hitIdx !== -1) {
          flyToCity(MAJOR_HUBS[hitIdx]);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animId: number;
    let lastHudTime = 0;
    let lastAltKm = 6400;
    let lastHeading = 0;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);

      cloudMesh.rotation.y += 0.0006;

      pulseObjects.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1.0) p.progress = 0;
        p.mesh.position.copy(p.curve.getPointAt(p.progress));
      });

      if (!isFlyingRef.current) {
        controls.update();
      }

      if (time - lastHudTime > 180) {
        lastHudTime = time;
        const dist = camera.position.length();
        const altKm = Math.round((dist - earthRadius) * 1600);
        if (Math.abs(altKm - lastAltKm) > 15) {
          lastAltKm = altKm;
          setCameraAltitude(altKm);
        }

        const heading = Math.round(Math.atan2(camera.position.x, camera.position.z) * (180 / Math.PI));
        const normalizedHeading = heading < 0 ? heading + 360 : heading;
        if (Math.abs(normalizedHeading - lastHeading) > 1) {
          lastHeading = normalizedHeading;
          setCompassHeading(normalizedHeading);
        }
      }

      renderer.render(scene, camera);
    };

    animate(0);
    setIsSceneReady(true);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      earthTexture.dispose();
      cloudTexture.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();

      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ─── 2. REACTIVE EFFECT: isExpanded ─────────────────────────────────────
  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    controls.autoRotate = !isExpanded;

    const targetDist = isExpanded ? 7.2 : 9.5;
    const currentDist = camera.position.length();
    const factor = targetDist / currentDist;
    camera.position.multiplyScalar(factor);
    controls.update();

    arcMaterialsRef.current.forEach((mat) => {
      mat.opacity = isExpanded ? 0.45 : 0.25;
    });
  }, [isExpanded]);

  // ─── 3. REACTIVE EFFECT: isDark ─────────────────────────────────────────
  useEffect(() => {
    const earthMat = earthMatRef.current;
    const atmosphereMat = atmosphereMatRef.current;
    const ambientLight = ambientLightRef.current;
    const sunLight = sunLightRef.current;
    const rimLight = rimLightRef.current;
    const renderer = rendererRef.current;
    if (!earthMat || !atmosphereMat) return;

    const { earthTexture, cloudTexture } = createEditorialEarthTextures(isDark);
    const oldEarthMap = earthMat.map;
    earthMat.map = earthTexture;
    earthMat.needsUpdate = true;
    oldEarthMap?.dispose();

    if (cloudMeshRef.current) {
      const cloudMat = cloudMeshRef.current.material as THREE.MeshStandardMaterial;
      const oldCloudMap = cloudMat.map;
      cloudMat.map = cloudTexture;
      cloudMat.opacity = isDark ? 0.45 : 0.6;
      cloudMat.needsUpdate = true;
      oldCloudMap?.dispose();
    }

    atmosphereMat.uniforms.glowColor.value.set(isDark ? 0xe3836c : 0x8fa98f);
    if (ambientLight) ambientLight.intensity = isDark ? 1.0 : 1.3;
    if (sunLight) sunLight.intensity = isDark ? 2.4 : 2.2;
    if (rimLight) rimLight.intensity = isDark ? 0.8 : 0.5;
    if (renderer) renderer.toneMappingExposure = isDark ? 1.2 : 1.05;
  }, [isDark]);

  // ─── 4. REACTIVE LAYER TOGGLES ──────────────────────────────────────────
  useEffect(() => {
    if (gridGroupRef.current) gridGroupRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (cloudMeshRef.current) cloudMeshRef.current.visible = showClouds;
  }, [showClouds]);

  useEffect(() => {
    if (telemetryGroupRef.current) telemetryGroupRef.current.visible = showTelemetry;
  }, [showTelemetry]);

  return (
    <div
      className={`fixed inset-0 select-none overflow-hidden transition-all duration-700 ${
        isExpanded ? 'z-40' : 'z-0'
      } ${className}`}
    >
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Loading Skeleton */}
      {!isSceneReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-xs font-mono text-xs text-[#4A4238]/60 dark:text-[#91867E]">
          <span className="w-3 h-3 rounded-full bg-[#E3836C] animate-ping mr-2" />
          <span>Initializing 3D Planetary WebGL…</span>
        </div>
      )}

      {/* Ambient Mode Trigger Pill */}
      {!isExpanded && isSceneReady && (
        <div className="absolute bottom-6 right-6 z-10">
          <button
            type="button"
            onClick={() => onToggleExpand(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full glass-card dark:bg-[#211E1C]/80 dark:border-[#3A3430] hover:border-[#E3836C]/50 text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] shadow-lg backdrop-blur-xl transition-all transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/50"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#E3836C] animate-pulse" />
            <IconWorld size={16} className="text-[#E3836C]" />
            <span>Google Earth View · Expand</span>
          </button>
        </div>
      )}

      {/* Expanded Mode: Full Google Earth Controls, Search Bar & Layers */}
      {isExpanded && isSceneReady && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 sm:p-8 z-50">
          
          {/* Top Bar: Close Button + Interactive Search Bar + Fly To Quick Cities */}
          <div className="pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
            
            {/* Top-Left Controls: Close Button & Search Bar */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onToggleExpand(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-[#211E1C]/90 text-[#4A4238] dark:text-[#F4EDE5] border border-[#4A4238]/15 dark:border-[#3A3430] shadow-2xl backdrop-blur-xl font-mono text-xs uppercase tracking-wider transition-all transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/50 shrink-0"
              >
                <IconX size={16} />
                <span>Close</span>
              </button>

              {/* ─── INTERACTIVE SEARCH BAR FOR GLOBE ─────────────────────── */}
              <div className="relative flex-1 sm:w-80">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-card backdrop-blur-xl border border-[#4A4238]/15 dark:border-[#3A3430] shadow-xl transition-all focus-within:border-[#E3836C] focus-within:ring-2 focus-within:ring-[#E3836C]/30">
                  <IconSearch size={15} className="text-[#E3836C] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search city, country, region…"
                    className="w-full bg-transparent text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] placeholder-[#4A4238]/40 dark:placeholder-[#80766F] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="text-[#4A4238]/40 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-white cursor-pointer"
                    >
                      <IconX size={13} />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearchOpen && filteredLocations.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl glass-card dark:bg-[#302B28]/95 border border-[#4A4238]/15 dark:border-[#504740] shadow-2xl backdrop-blur-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
                      {filteredLocations.map((loc) => (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => flyToCity(loc)}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs font-mono transition-colors cursor-pointer group"
                        >
                          <div>
                            <span className="font-serif text-sm text-[#4A4238] dark:text-[#F4EDE5] group-hover:text-[#ED967F] transition-colors block">
                              {loc.name}
                            </span>
                            <span className="text-[10px] text-[#4A4238]/50 dark:text-[#91867E]">
                              {loc.country} · {loc.region}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#E3836C] font-bold block">{loc.ping}</span>
                            <span className="text-[9px] text-[#4A4238]/40 dark:text-[#91867E]">
                              {loc.lat.toFixed(1)}°, {loc.lon.toFixed(1)}°
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Earth "Fly To" City Chips */}
            <div className="hidden lg:flex items-center gap-1.5 p-1.5 rounded-2xl glass-card backdrop-blur-xl border border-[#4A4238]/15 dark:border-[#3A3430] overflow-x-auto max-w-full">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#E3836C] px-2 font-bold flex items-center gap-1">
                <IconMapPin size={12} /> Hubs:
              </span>
              {MAJOR_HUBS.map((hub) => (
                <button
                  key={hub.name}
                  type="button"
                  onClick={() => flyToCity(hub)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40 ${
                    selectedHub?.name === hub.name
                      ? 'bg-[#E3836C] text-white font-bold shadow-xs'
                      : 'hover:bg-black/5 dark:hover:bg-white/10 text-[#4A4238]/70 dark:text-[#C5B9AE]'
                  }`}
                >
                  {hub.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right Floating Google Earth Control Dock (Zoom, Compass, Grid, Layers) */}
          <div className="pointer-events-auto self-end flex flex-col items-center gap-2">
            
            {/* Compass (Rotates with view & resets North on click) */}
            <button
              type="button"
              onClick={resetNorth}
              className="p-3 rounded-2xl glass-card text-[#E3836C] hover:border-[#E3836C]/50 shadow-xl backdrop-blur-xl transition-all transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40"
              title={`Compass Heading: ${compassHeading}° (Click to reset North)`}
            >
              <div style={{ transform: `rotate(${-compassHeading}deg)`, transition: 'transform 0.15s ease-out' }}>
                <IconCompass size={20} />
              </div>
            </button>

            {/* Zoom In & Zoom Out Buttons */}
            <div className="flex flex-col rounded-2xl glass-card border border-[#4A4238]/15 dark:border-[#3A3430] shadow-xl backdrop-blur-xl overflow-hidden">
              <button
                type="button"
                onClick={() => handleZoom(-1.4)}
                className="p-3 hover:bg-black/5 dark:hover:bg-white/10 text-[#4A4238] dark:text-[#F4EDE5] transition-colors cursor-pointer border-b border-[#4A4238]/10 dark:border-[#3A3430] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40"
                title="Zoom In"
              >
                <IconPlus size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(1.4)}
                className="p-3 hover:bg-black/5 dark:hover:bg-white/10 text-[#4A4238] dark:text-[#F4EDE5] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40"
                title="Zoom Out"
              >
                <IconMinus size={18} />
              </button>
            </div>

            {/* Layer Toggles: Grid View, Clouds, Telemetry */}
            <div className="flex flex-col rounded-2xl glass-card border border-[#4A4238]/15 dark:border-[#3A3430] shadow-xl backdrop-blur-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40 ${
                  showGrid
                    ? 'bg-[#E3836C] text-white'
                    : 'text-[#4A4238]/50 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-white'
                }`}
                title="Toggle Latitude/Longitude Grid Lines"
              >
                <IconGridDots size={16} />
              </button>

              <button
                type="button"
                onClick={() => setShowClouds((v) => !v)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40 ${
                  showClouds
                    ? 'bg-[#E3836C] text-white'
                    : 'text-[#4A4238]/50 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-white'
                }`}
                title="Toggle Atmospheric Clouds"
              >
                <IconCloud size={16} />
              </button>

              <button
                type="button"
                onClick={() => setShowTelemetry((v) => !v)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40 ${
                  showTelemetry
                    ? 'bg-[#E3836C] text-white'
                    : 'text-[#4A4238]/50 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-white'
                }`}
                title="Toggle Telemetry Flight Arcs"
              >
                <IconRoute size={16} />
              </button>
            </div>

          </div>

          {/* Bottom HUD: Live Selected City Card, Cursor Coordinates & Altitude Bar */}
          <div className="pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            
            {/* Selected City or Hover Pinpoint */}
            {selectedHub ? (
              <div className="p-4 rounded-2xl glass-card border border-[#4A4238]/15 dark:border-[#3A3430] shadow-2xl backdrop-blur-2xl max-w-sm w-full space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif text-base font-semibold text-[#4A4238] dark:text-[#F4EDE5]">
                      {selectedHub.name}
                    </h4>
                    <span className="text-[10px] font-mono text-[#4A4238]/50 dark:text-[#91867E]">
                      {selectedHub.country} · {selectedHub.region} · {selectedHub.lat.toFixed(2)}°, {selectedHub.lon.toFixed(2)}°
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8FA98F]/20 text-[#8FA98F] font-bold">
                    {selectedHub.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-[#4A4238]/10 dark:border-[#3A3430]">
                  <div>
                    <span className="text-[10px] opacity-50 block">Round-trip Ping</span>
                    <span className="font-bold text-[#E3836C]">{selectedHub.ping}</span>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-50 block">Telemetry Bandwidth</span>
                    <span className="font-bold">{selectedHub.throughput}</span>
                  </div>
                </div>
              </div>
            ) : cursorCoords ? (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl glass-card text-xs font-mono text-[#4A4238]/80 dark:text-[#C5B9AE] shadow-lg">
                <IconActivity size={14} className="text-[#E3836C]" />
                <span>
                  Cursor: {cursorCoords.lat.toFixed(2)}°{cursorCoords.lat >= 0 ? 'N' : 'S'}, {Math.abs(cursorCoords.lon).toFixed(2)}°{cursorCoords.lon >= 0 ? 'E' : 'W'}
                </span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl glass-card text-xs font-mono text-[#4A4238]/70 dark:text-[#C5B9AE] shadow-lg">
                <IconActivity size={14} className="text-[#E3836C]" />
                <span>Click or search any city to fly camera &amp; inspect metrics</span>
              </div>
            )}

            {/* Bottom Google Earth Coordinate & Altitude Telemetry Status Bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-full glass-card border border-[#4A4238]/15 dark:border-[#3A3430] shadow-xl backdrop-blur-xl font-mono text-xs text-[#4A4238]/80 dark:text-[#C5B9AE]">
              <span>Heading: <strong className="text-[#E3836C]">{compassHeading}°</strong></span>
              <span className="opacity-40">|</span>
              <span>Altitude: <strong>{cameraAltitude.toLocaleString()} km</strong></span>
              <span className="opacity-40">|</span>
              <span>Grid: <strong>{showGrid ? 'On' : 'Off'}</strong></span>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
