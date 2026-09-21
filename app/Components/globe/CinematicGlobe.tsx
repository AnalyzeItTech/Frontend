'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WORLD_COUNTRY_RINGS } from '../3d/countryBorders';
import { WORLD_LANDMASS_POLYGONS } from '../3d/landmassData';
import {
  fillUnwrappedRing,
  latLonToVec,
  lonLatToCanvas,
  strokeUnwrappedRing,
  vecToLatLon,
} from './geoSphere';
import { GLOBE_HUBS } from './sourceCatalog';
import type { GlobeCamera, GlobeMapHandle, GlobeVariant, SourcePoint } from './types';

export { GLOBE_HUBS };

const RADIUS = 1.72;

const CITY_LIGHTS: Array<[number, number]> = [
  [40.71, -74.01],
  [34.05, -118.24],
  [37.77, -122.42],
  [41.88, -87.63],
  [51.51, -0.13],
  [48.86, 2.35],
  [52.52, 13.41],
  [55.76, 37.62],
  [35.68, 139.65],
  [31.23, 121.47],
  [22.32, 114.17],
  [1.35, 103.82],
  [19.08, 72.88],
  [28.61, 77.21],
  [-23.55, -46.63],
  [-34.6, -58.38],
  [19.43, -99.13],
  [30.04, 31.24],
  [25.2, 55.27],
  [-33.87, 151.21],
  [-37.81, 144.96],
  [39.9, 116.41],
  [37.57, 126.98],
  [13.76, 100.5],
  [41.01, 28.98],
  [59.33, 18.07],
  [50.11, 8.68],
  [45.46, 9.19],
  [40.42, -3.7],
  [38.72, -9.14],
];

function zoomToDistance(zoom: number) {
  const t = Math.min(1, Math.max(0, (zoom - 1.1) / 9));
  return THREE.MathUtils.lerp(5.05, 2.28, t);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createArc(p1: THREE.Vector3, p2: THREE.Vector3, radius: number) {
  const d = p1.distanceTo(p2);
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(radius + d * 0.28);
  const c1 = new THREE.Vector3().addVectors(p1, mid).multiplyScalar(0.5).normalize().multiplyScalar(radius + d * 0.22);
  const c2 = new THREE.Vector3().addVectors(p2, mid).multiplyScalar(0.5).normalize().multiplyScalar(radius + d * 0.22);
  return new THREE.CubicBezierCurve3(p1, c1, c2, p2);
}

function paintNightTextures(quality: 'mini' | 'full') {
  const width = quality === 'mini' ? 1024 : 2048;
  const height = quality === 'mini' ? 512 : 1024;
  const color = document.createElement('canvas');
  color.width = width;
  color.height = height;
  const ctx = color.getContext('2d')!;

  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#07101f');
  ocean.addColorStop(0.5, '#0a1830');
  ocean.addColorStop(1, '#060e1c');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1c4d78';
  WORLD_LANDMASS_POLYGONS.forEach((poly) => {
    fillUnwrappedRing(ctx, poly.coords, width, height);
  });

  ctx.strokeStyle = 'rgba(160, 220, 255, 0.42)';
  ctx.lineWidth = quality === 'mini' ? 0.45 : 0.7;
  ctx.lineJoin = 'round';
  WORLD_COUNTRY_RINGS.forEach((ring) => {
    strokeUnwrappedRing(ctx, ring, width, height);
  });

  ctx.strokeStyle = 'rgba(120, 210, 255, 0.22)';
  ctx.lineWidth = quality === 'mini' ? 0.8 : 1.2;
  WORLD_LANDMASS_POLYGONS.forEach((poly) => {
    strokeUnwrappedRing(ctx, poly.coords, width, height);
  });

  const emissive = document.createElement('canvas');
  emissive.width = width;
  emissive.height = height;
  const ectx = emissive.getContext('2d')!;
  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, width, height);

  const sprinkle = quality === 'mini' ? 900 : 2800;
  const land = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0; i < sprinkle; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(height * 0.12 + Math.random() * height * 0.76);
    const idx = (y * width + x) * 4;
    if (land[idx + 2] < 90) continue;
    const g = ectx.createRadialGradient(x, y, 0, x, y, 1.2 + Math.random() * 2.4);
    g.addColorStop(0, 'rgba(210, 245, 255, 0.95)');
    g.addColorStop(1, 'rgba(80, 170, 255, 0)');
    ectx.fillStyle = g;
    ectx.fillRect(x - 3, y - 3, 6, 6);
  }

  CITY_LIGHTS.forEach(([lat, lon]) => {
    const { x, y } = lonLatToCanvas(lon, lat, width, height);
    const g = ectx.createRadialGradient(x, y, 0, x, y, quality === 'mini' ? 6 : 11);
    g.addColorStop(0, 'rgba(255, 236, 210, 1)');
    g.addColorStop(0.35, 'rgba(120, 210, 255, 0.7)');
    g.addColorStop(1, 'rgba(40, 120, 255, 0)');
    ectx.fillStyle = g;
    ectx.beginPath();
    ectx.arc(x, y, quality === 'mini' ? 7 : 12, 0, Math.PI * 2);
    ectx.fill();
  });

  const colorTex = new THREE.CanvasTexture(color);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.anisotropy = 8;
  colorTex.wrapS = THREE.RepeatWrapping;
  colorTex.wrapT = THREE.ClampToEdgeWrapping;
  colorTex.flipY = true;
  const emitTex = new THREE.CanvasTexture(emissive);
  emitTex.colorSpace = THREE.SRGBColorSpace;
  emitTex.wrapS = THREE.RepeatWrapping;
  emitTex.wrapT = THREE.ClampToEdgeWrapping;
  emitTex.flipY = true;
  return { colorTex, emitTex };
}

function makeStarField(count: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 18 + Math.random() * 40;
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xc8e4ff,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
}

export interface CinematicGlobeProps {
  variant?: GlobeVariant;
  selected?: { lat: number; lon: number; name?: string } | null;
  activeHub?: string | null;
  comparePlaces?: Array<{ lat: number; lon: number; name?: string }>;
  sourcePoints?: SourcePoint[];
  idleDrift?: boolean;
  inFlight?: boolean;
  paused?: boolean;
  freezeResize?: boolean;
  onHubSelect?: (hub: (typeof GLOBE_HUBS)[number]) => void;
  onPlaceSelect?: (place: { lat: number; lon: number; name?: string }) => void;
  onEngineReady?: (handle: GlobeMapHandle) => void;
  initialCamera?: GlobeCamera;
  className?: string;
}

export function CinematicGlobe({
  variant = 'full',
  selected,
  activeHub,
  comparePlaces = [],
  sourcePoints = [],
  idleDrift = false,
  inFlight = false,
  paused = false,
  freezeResize = false,
  onHubSelect,
  onPlaceSelect,
  onEngineReady,
  initialCamera,
  className = '',
}: CinematicGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    earth: THREE.Group;
    globe: THREE.Mesh;
    markerGroup: THREE.Group;
    arcGroup: THREE.Group;
    pulses: Array<{ mesh: THREE.Mesh; curve: THREE.CubicBezierCurve3; t: number; speed: number }>;
    flyGen: number;
    paused: boolean;
    idle: boolean;
    inFlight: boolean;
    raf: number;
    disposed: boolean;
  } | null>(null);
  const onPlaceRef = useRef(onPlaceSelect);
  onPlaceRef.current = onPlaceSelect;
  const onHubRef = useRef(onHubSelect);
  onHubRef.current = onHubSelect;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pointsRef = useRef(sourcePoints);
  pointsRef.current = sourcePoints;
  const readyOnce = useRef(false);

  const variantRef = useRef(variant);
  variantRef.current = variant;
  const idleRef = useRef(idleDrift);
  idleRef.current = idleDrift;

  const flyTo = useCallback((opts: { lat: number; lon: number; zoom?: number }) => {
    const eng = engineRef.current;
    if (!eng) return Promise.resolve();
    const gen = ++eng.flyGen;
    const cam = eng.camera;
    const controls = eng.controls;
    const dir = latLonToVec(opts.lat, opts.lon, 1).normalize();
    const start = cam.position.clone();
    const startLen = start.length();
    const endLen = zoomToDistance(opts.zoom ?? 3.2);
    const startDir = start.clone().normalize();
    const qStart = new THREE.Quaternion();
    const qEnd = new THREE.Quaternion().setFromUnitVectors(startDir, dir);
    const duration = 1600;
    const t0 = performance.now();
    controls.enabled = false;
    eng.inFlight = true;

    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (!engineRef.current || engineRef.current.disposed || gen !== engineRef.current.flyGen) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - t0) / duration);
        const e = easeInOutCubic(t);
        const q = qStart.clone().slerp(qEnd, e);
        const d = startDir.clone().applyQuaternion(q);
        const arc = Math.sin(e * Math.PI) * 1.15;
        cam.position.copy(d.multiplyScalar(THREE.MathUtils.lerp(startLen, endLen, e) + arc));
        cam.lookAt(0, 0, 0);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          controls.target.set(0, 0, 0);
          controls.enabled = variantRef.current !== 'mini';
          engineRef.current.inFlight = false;
          controls.update();
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = Math.max(8, mount.clientWidth);
    const h = Math.max(8, mount.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04080f);
    scene.fog = new THREE.FogExp2(0x04080f, 0.012);

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 80);
    const startLat = initialCamera?.lat ?? 12;
    const startLon = initialCamera?.lng ?? -40;
    const startDist = zoomToDistance(initialCamera?.zoom ?? 1.45);
    camera.position.copy(latLonToVec(startLat, startLon, startDist));
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 2.22;
    controls.maxDistance = 6.4;
    controls.rotateSpeed = 0.55;
    controls.autoRotate = Boolean(idleDrift) || variant === 'mini';
    controls.autoRotateSpeed = 0.38;
    controls.enabled = variant !== 'mini';
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x4c6d99, 0.55));
    const key = new THREE.DirectionalLight(0xd4eeff, 1.55);
    key.position.set(6, 3.2, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x3aa0ff, 0.85);
    rim.position.set(-5, -1.5, -4);
    scene.add(rim);
    const fill = new THREE.PointLight(0x7ad0ff, 1.1, 18);
    fill.position.set(-2.2, 1.4, 3.4);
    scene.add(fill);

    scene.add(makeStarField(1400));

    const earth = new THREE.Group();
    scene.add(earth);
    const { colorTex, emitTex } = paintNightTextures('full');
    const segs = 96;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, segs, segs),
      new THREE.MeshStandardMaterial({
        map: colorTex,
        emissiveMap: emitTex,
        emissive: new THREE.Color(0x9fd9ff),
        emissiveIntensity: 1.05,
        roughness: 0.42,
        metalness: 0.22,
      }),
    );
    earth.add(globe);

    const atmos = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.045, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(0x5ec8ff) } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform vec3 color;
          void main() {
            float i = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.15);
            gl_FragColor = vec4(color, i * 0.95);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    scene.add(atmos);

    const fresnel = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.012, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(0xa8e4ff) } },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          uniform vec3 color;
          void main() {
            float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.2);
            gl_FragColor = vec4(color, f * 0.42);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    earth.add(fresnel);

    [1.28, 1.46].forEach((scale, i) => {
        const curve = new THREE.EllipseCurve(0, 0, RADIUS * scale, RADIUS * scale * (i ? 0.62 : 0.78), 0, Math.PI * 2);
        const pts = curve.getPoints(160);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: 0x7ec8ff,
            transparent: true,
            opacity: 0.16,
          }),
        );
        line.rotation.x = Math.PI / 2.15;
        line.rotation.z = i ? 0.42 : -0.18;
        scene.add(line);
      });

    const markerGroup = new THREE.Group();
    earth.add(markerGroup);
    const arcGroup = new THREE.Group();
    earth.add(arcGroup);
    const pulses: Array<{ mesh: THREE.Mesh; curve: THREE.CubicBezierCurve3; t: number; speed: number }> = [];

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (ev: PointerEvent) => {
      if (variantRef.current === 'mini' || !engineRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(globe, false);
      if (!hits[0]) return;
      const local = globe.worldToLocal(hits[0].point.clone());
      const { lat, lon } = vecToLatLon(local);
      const hub = GLOBE_HUBS.find((h) => Math.hypot(h.lat - lat, h.lon - lon) < 6);
      if (hub) {
        onHubRef.current?.(hub);
        return;
      }
      onPlaceRef.current?.({ lat, lon });
    };
    renderer.domElement.addEventListener('pointerup', onClick);

    const eng = {
      renderer,
      scene,
      camera,
      controls,
      earth,
      globe,
      markerGroup,
      arcGroup,
      pulses,
      flyGen: 0,
      paused: false,
      idle: Boolean(idleDrift),
      inFlight: false,
      raf: 0,
      disposed: false,
    };
    engineRef.current = eng;

    const tick = () => {
      if (eng.disposed) return;
      eng.raf = requestAnimationFrame(tick);
      if (eng.paused) return;
      controls.autoRotate = eng.idle && !eng.inFlight;
      controls.update();
      earth.rotation.set(0, 0, 0);
      for (const p of eng.pulses) {
        p.t = (p.t + p.speed) % 1;
        p.mesh.position.copy(p.curve.getPoint(p.t));
      }
      renderer.render(scene, camera);
    };
    tick();

    const handle: GlobeMapHandle = {
      flyTo: (opts) => flyTo(opts),
      resize: () => {
        if (eng.disposed || !mountRef.current) return;
        const nw = Math.max(8, mountRef.current.clientWidth);
        const nh = Math.max(8, mountRef.current.clientHeight);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      },
      getView: () => {
        const { lat, lon } = vecToLatLon(camera.position);
        return { lat, lng: lon, zoom: initialCamera?.zoom ?? 1.45 };
      },
      pause: () => {
        eng.paused = true;
      },
      resume: () => {
        eng.paused = false;
      },
    };
    if (!readyOnce.current) {
      readyOnce.current = true;
      onEngineReady?.(handle);
    }

    return () => {
      eng.disposed = true;
      cancelAnimationFrame(eng.raf);
      renderer.domElement.removeEventListener('pointerup', onClick);
      controls.dispose();
      renderer.dispose();
      colorTex.dispose();
      emitTex.dispose();
      globe.geometry.dispose();
      (globe.material as THREE.Material).dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      engineRef.current = null;
      readyOnce.current = false;
    };
    // Mount once — slot is portaled; variant only toggles interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.paused = Boolean(paused);
  }, [paused]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.controls.enabled = variant !== 'mini';
  }, [variant]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.idle = Boolean(idleDrift) && !inFlight;
    eng.inFlight = Boolean(inFlight);
    eng.controls.autoRotate = eng.idle && !eng.inFlight;
  }, [idleDrift, inFlight]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng || freezeResize) return;
    eng.renderer.setSize(Math.max(8, mountRef.current?.clientWidth || 8), Math.max(8, mountRef.current?.clientHeight || 8));
    const cam = eng.camera;
    const el = mountRef.current;
    if (el) {
      cam.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      cam.updateProjectionMatrix();
    }
  }, [freezeResize, variant]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    while (eng.markerGroup.children.length) {
      const ch = eng.markerGroup.children[0];
      eng.markerGroup.remove(ch);
      if (ch instanceof THREE.Mesh) {
        ch.geometry.dispose();
        const m = ch.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    }
    while (eng.arcGroup.children.length) {
      const ch = eng.arcGroup.children[0];
      eng.arcGroup.remove(ch);
      if (ch instanceof THREE.Mesh) {
        ch.geometry.dispose();
        const m = ch.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    }
    eng.pulses.length = 0;

    const addDot = (lat: number, lon: number, color: number, scale: number, pulse: boolean) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.018 * scale, 10, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
      );
      mesh.position.copy(latLonToVec(lat, lon, RADIUS * 1.012));
      eng.markerGroup.add(mesh);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.042 * scale, 10, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: pulse ? 0.35 : 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      glow.position.copy(mesh.position);
      eng.markerGroup.add(glow);
    };

    GLOBE_HUBS.forEach((hub) => {
      const on = activeHub === hub.name;
      addDot(hub.lat, hub.lon, on ? 0xffc27a : 0x7ee0ff, on ? 1.55 : 1.15, on);
    });
    sourcePoints.forEach((p) => {
      if (p.kind === 'hub') return;
      const live = p.kind === 'live' || p.kind === 'place' || p.pulse;
      addDot(p.lat, p.lon, live ? 0xffb066 : 0x8ad4ff, live ? 1.35 : 0.85, Boolean(p.pulse));
    });
    comparePlaces.forEach((p) => addDot(p.lat, p.lon, 0xe7c9a0, 1.1, false));
    if (selected) addDot(selected.lat, selected.lon, 0xffd59a, 1.8, true);

    const anchors = [
      ...GLOBE_HUBS.map((h) => [h.lat, h.lon] as [number, number]),
      ...sourcePoints.filter((p) => p.kind === 'live' || p.kind === 'place').slice(0, 6).map((p) => [p.lat, p.lon] as [number, number]),
    ];
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < anchors.length; i++) {
      const j = (i + 1) % anchors.length;
      if (i < j || anchors.length < 8) pairs.push([i, j]);
    }
    const used = pairs.slice(0, variant === 'mini' ? 7 : 14);
    used.forEach(([a, b], idx) => {
      const p1 = latLonToVec(anchors[a][0], anchors[a][1], RADIUS * 1.01);
      const p2 = latLonToVec(anchors[b][0], anchors[b][1], RADIUS * 1.01);
      const curve = createArc(p1, p2, RADIUS);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, 0.0045, 6, false),
        new THREE.MeshBasicMaterial({
          color: idx % 3 === 0 ? 0xffc27a : 0x6fd4ff,
          transparent: true,
          opacity: 0.38,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      eng.arcGroup.add(tube);
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
      );
      eng.arcGroup.add(pulse);
      eng.pulses.push({ mesh: pulse, curve, t: (idx * 0.13) % 1, speed: 0.004 + (idx % 3) * 0.0015 });
    });
  }, [sourcePoints, selected, activeHub, comparePlaces, variant]);

  return <div ref={mountRef} className={`absolute inset-0 h-full w-full bg-[#04080f] ${className}`} />;
}
