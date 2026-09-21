/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ActiveSimplicialComplex,
  AppSettings,
  ColorBlindnessMode,
  ColorMapScheme,
  PersistencePair,
  PointData,
  TDAResult,
} from '../types/tda';
import {
  RotateCcw,
  Camera,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Compass,
  Crosshair,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Eye,
  Info,
  Shuffle,
} from 'lucide-react';
import { HOMOLOGY_COLORS, getDimensionHexColor } from '../utils/colors';
import {
  playSimplexTone,
  playSoundFeedback,
  ensureAudioContext,
  setAudioMuted,
  isSonificationEnabled,
} from '../utils/audioSonification';

export type SimplexSelection =
  | {
      type: 'edge';
      u: number;
      v: number;
      pU: [number, number, number];
      pV: [number, number, number];
      length: number;
      birthEpsilon: number;
    }
  | {
      type: 'triangle';
      u: number;
      v: number;
      w: number;
      pU: [number, number, number];
      pV: [number, number, number];
      pW: [number, number, number];
      area: number;
      perimeter: number;
      centroid: [number, number, number];
    }
  | {
      type: 'cycle';
      pair: PersistencePair;
      dimension: number;
      vertices: number[];
      edges: [number, number][];
      perimeter: number;
      centroid: [number, number, number];
    }
  | {
      type: 'point';
      id: number;
      coords: [number, number, number];
      connectedEdgesCount: number;
    }
  | null;

interface PointCloudViewer3DProps {
  points: PointData[];
  tdaResult: TDAResult | null;
  activeComplex: ActiveSimplicialComplex | null;
  currentEpsilon: number;
  selectedPair: PersistencePair | null;
  hoveredPair: PersistencePair | null;
  colorScheme: ColorMapScheme;
  colorBlindness: ColorBlindnessMode;
  settings: AppSettings;
  showBalls: boolean;
  showEdges: boolean;
  showTriangles: boolean;
  showGeneratorCycle: boolean;
  pointSize: number;
  ballOpacity: number;
  onSelectPoint?: (id: number) => void;
  onSelectPair?: (pair: PersistencePair | null) => void;
  onOpenExplain?: (pair?: PersistencePair) => void;
}

export const PointCloudViewer3D: React.FC<PointCloudViewer3DProps> = ({
  points,
  tdaResult,
  activeComplex,
  currentEpsilon,
  selectedPair,
  hoveredPair,
  colorScheme,
  colorBlindness,
  settings,
  showBalls,
  showEdges,
  showTriangles,
  showGeneratorCycle,
  pointSize,
  ballOpacity,
  onSelectPoint,
  onSelectPair,
  onOpenExplain,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Three.js object references
  const pointsMeshRef = useRef<THREE.Points | null>(null);
  const edgesLinesRef = useRef<THREE.LineSegments | null>(null);
  const trianglesMeshRef = useRef<THREE.Mesh | null>(null);
  const ballsGroupRef = useRef<THREE.Group | null>(null);
  const generatorCycleRef = useRef<THREE.LineSegments | null>(null);
  const generatorPointsRef = useRef<THREE.Points | null>(null);
  const pulseAuraGroupRef = useRef<THREE.Group | null>(null);

  // Dynamic Selection & Radiant Glow Rig
  const selectionHighlightGroupRef = useRef<THREE.Group | null>(null);
  const selectionPointLightRef = useRef<THREE.PointLight | null>(null);
  const selectionBeaconRef = useRef<THREE.Mesh | null>(null);

  const [selectedSimplex, setSelectedSimplex] = useState<SimplexSelection>(null);
  const [simplexFilterMode, setSimplexFilterMode] = useState<'all' | 'balls' | 'edges' | 'triangles' | 'cycles'>('all');

  const [isSoundOn, setIsSoundOn] = useState<boolean>(isSonificationEnabled());
  const [justPlayedSound, setJustPlayedSound] = useState<boolean>(false);

  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const isAutoRotatingRef = useRef(isAutoRotating);
  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Check if current mode is light
  const isLightTheme =
    settings.theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.getAttribute('data-appearance') === 'light');

  // Crosshair & Telemetry State
  const [cursorTelemetry, setCursorTelemetry] = useState<{
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    worldZ: number;
    curvature: number;
    nearestPointId: number;
    isVisible: boolean;
  }>({
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    worldZ: 0,
    curvature: 0,
    nearestPointId: 0,
    isVisible: false,
  });

  // Interaction state
  const isDraggingRef = useRef(false);
  const isRightDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0, time: 0 });
  const cameraRotationRef = useRef({ theta: 0.8, phi: 0.6, radius: 8.5 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Raycaster for telemetry and interactive selection
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 450;

    const scene = new THREE.Scene();
    const isLight =
      settings.theme === 'light' ||
      (typeof document !== 'undefined' && document.documentElement.getAttribute('data-appearance') === 'light');
    const currentBg =
      getComputedStyle(document.documentElement).getPropertyValue('--realtime-background').trim() ||
      (isLight ? '#f8fafc' : '#111318');
    scene.background = new THREE.Color(currentBg);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Realtime / Radix Palette Background Sync Listener
    const handlePaletteChange = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (sceneRef.current && customEvt.detail?.background) {
        sceneRef.current.background = new THREE.Color(customEvt.detail.background);
      }
    };
    window.addEventListener('realtime-palette-change', handlePaletteChange);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 0.85 : 1.0);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(isLight ? 0x64748b : 0x818cf8, isLight ? 1.1 : 1.4);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(isLight ? 0x94a3b8 : 0x38bdf8, isLight ? 0.7 : 0.9);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // Coordinate grid matching theme contrast
    const gridHelper = new THREE.GridHelper(
      12,
      24,
      isLight ? 0x64748b : 0x3e63dd,
      isLight ? 0xcbd5e1 : 0x222631
    );
    gridHelper.position.y = -2.6;
    scene.add(gridHelper);

    // Groups
    const ballsGroup = new THREE.Group();
    scene.add(ballsGroup);
    ballsGroupRef.current = ballsGroup;

    const pulseGroup = new THREE.Group();
    scene.add(pulseGroup);
    pulseAuraGroupRef.current = pulseGroup;

    // Dedicated Selection & Glowing Light Rig Group
    const selectionGroup = new THREE.Group();
    scene.add(selectionGroup);
    selectionHighlightGroupRef.current = selectionGroup;

    // Dynamic 3D Radiant PointLight for selected simplex
    const selectionPointLight = new THREE.PointLight(0x00f0ff, 0, 18, 1.2);
    scene.add(selectionPointLight);
    selectionPointLightRef.current = selectionPointLight;

    // Glowing core beacon sphere
    const beaconGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const selectionBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    selectionBeacon.visible = false;
    scene.add(selectionBeacon);
    selectionBeaconRef.current = selectionBeacon;

    // Animation Loop with Pulsing Ethereal Neon Aura
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      if (isAutoRotatingRef.current) {
        cameraRotationRef.current.theta += 0.005;
      }

      const { theta, phi, radius } = cameraRotationRef.current;
      const x = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.cos(theta);

      camera.position.set(
        x + cameraTargetRef.current.x,
        y + cameraTargetRef.current.y,
        z + cameraTargetRef.current.z
      );
      camera.lookAt(cameraTargetRef.current);

      // Pulsing Homology Aura animation
      if (settingsRef.current.pulseGlow && generatorCycleRef.current) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 4.0);
        if (generatorCycleRef.current.material instanceof THREE.LineBasicMaterial) {
          generatorCycleRef.current.material.opacity = 0.6 + 0.4 * pulse;
        }
      }

      // Continuous Radiant Pulsing Glow for Selected Simplex Light
      if (selectionPointLightRef.current && selectionPointLightRef.current.intensity > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 6.5);
        selectionPointLightRef.current.intensity = 3.5 + 3.0 * pulse;
        if (selectionBeaconRef.current && selectionBeaconRef.current.visible) {
          const s = 1.0 + 0.35 * pulse;
          selectionBeaconRef.current.scale.set(s, s, s);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    let resizeRafId: number | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeRafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect;
          if (w > 0 && h > 0 && (Math.abs(w - lastWidth) >= 1 || Math.abs(h - lastHeight) >= 1)) {
            lastWidth = w;
            lastHeight = h;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h, false);
            renderer.render(scene, camera);
          }
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('realtime-palette-change', handlePaletteChange);
      cancelAnimationFrame(animationFrameId);
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Points Geometry and Colors
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (pointsMeshRef.current) {
      scene.remove(pointsMeshRef.current);
      pointsMeshRef.current.geometry.dispose();
      (pointsMeshRef.current.material as THREE.Material).dispose();
      pointsMeshRef.current = null;
    }

    if (points.length === 0) return;

    const n = points.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);

    let maxDensity = 0.001;
    for (let i = 0; i < n; i++) {
      if ((points[i].density || 0) > maxDensity) {
        maxDensity = points[i].density || 0;
      }
    }

    for (let i = 0; i < n; i++) {
      const p = points[i];
      positions[i * 3] = p.coords3D[0];
      positions[i * 3 + 1] = p.coords3D[1];
      positions[i * 3 + 2] = p.coords3D[2];

      const col = getColorForPoint(p, colorScheme, colorBlindness, maxDensity, isLightTheme);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Dynamic point size with slight boost in light mode for sharp contrast
    const actualPointSize = isLightTheme ? pointSize * 1.25 : pointSize;

    const material = new THREE.PointsMaterial({
      size: actualPointSize,
      vertexColors: true,
      transparent: true,
      opacity: isLightTheme ? 0.95 : 0.85,
      sizeAttenuation: true,
    });

    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
    pointsMeshRef.current = mesh;

    // Recenter camera target
    let cx = 0,
      cy = 0,
      cz = 0;
    for (let i = 0; i < n; i++) {
      cx += positions[i * 3];
      cy += positions[i * 3 + 1];
      cz += positions[i * 3 + 2];
    }
    if (n > 0) {
      cameraTargetRef.current.set(cx / n, cy / n, cz / n);
    }
  }, [points, colorScheme, colorBlindness, pointSize, isLightTheme]);

  // Update 1-Simplices (Edges) with rich colormap & selection highlighting
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (edgesLinesRef.current) {
      scene.remove(edgesLinesRef.current);
      edgesLinesRef.current.geometry.dispose();
      (edgesLinesRef.current.material as THREE.Material).dispose();
      edgesLinesRef.current = null;
    }

    if (!showEdges || !activeComplex || activeComplex.activeEdges.length === 0) return;

    const edges = activeComplex.activeEdges;
    const positions = new Float32Array(edges.length * 6);
    const colors = new Float32Array(edges.length * 6);

    const edgeHex = getDimensionHexColor(1, colorBlindness);
    const fallbackEdgeCol = new THREE.Color(isLightTheme ? 0x0284c7 : edgeHex);
    const maxDensity = Math.max(1, ...points.map((p) => p.density || 0));

    for (let i = 0; i < edges.length; i++) {
      const [u, v] = edges[i];
      const pU = points[u];
      const pV = points[v];
      const pUCoords = pU?.coords3D || [0, 0, 0];
      const pVCoords = pV?.coords3D || [0, 0, 0];

      positions[i * 6] = pUCoords[0];
      positions[i * 6 + 1] = pUCoords[1];
      positions[i * 6 + 2] = pUCoords[2];

      positions[i * 6 + 3] = pVCoords[0];
      positions[i * 6 + 4] = pVCoords[1];
      positions[i * 6 + 5] = pVCoords[2];

      // Check if this specific edge is selected
      const isSelected =
        selectedSimplex?.type === 'edge' &&
        ((selectedSimplex.u === u && selectedSimplex.v === v) ||
          (selectedSimplex.u === v && selectedSimplex.v === u));

      if (isSelected) {
        // High-contrast radiant golden amber
        colors[i * 6] = 1.0;
        colors[i * 6 + 1] = 0.82;
        colors[i * 6 + 2] = 0.15;
        colors[i * 6 + 3] = 1.0;
        colors[i * 6 + 4] = 0.82;
        colors[i * 6 + 5] = 0.15;
      } else {
        // Vibrant colormap gradient across the edge vertices matching point cloud & balls
        const colU = pU ? getColorForPoint(pU, colorScheme, colorBlindness, maxDensity, isLightTheme) : fallbackEdgeCol;
        const colV = pV ? getColorForPoint(pV, colorScheme, colorBlindness, maxDensity, isLightTheme) : fallbackEdgeCol;

        colors[i * 6] = colU.r;
        colors[i * 6 + 1] = colU.g;
        colors[i * 6 + 2] = colU.b;
        colors[i * 6 + 3] = colV.r;
        colors[i * 6 + 4] = colV.g;
        colors[i * 6 + 5] = colV.b;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isLightTheme ? 0.92 : 0.75,
      linewidth: isLightTheme ? 2.5 : 1.8,
    });

    const lines = new THREE.LineSegments(geometry, material);
    scene.add(lines);
    edgesLinesRef.current = lines;
  }, [activeComplex, showEdges, points, colorScheme, colorBlindness, isLightTheme, selectedSimplex]);

  // Update 2-Simplices (Triangles) with rich colormap & selection highlighting
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (trianglesMeshRef.current) {
      scene.remove(trianglesMeshRef.current);
      trianglesMeshRef.current.geometry.dispose();
      (trianglesMeshRef.current.material as THREE.Material).dispose();
      trianglesMeshRef.current = null;
    }

    if (!showTriangles || !activeComplex || activeComplex.activeTriangles.length === 0) return;

    const triangles = activeComplex.activeTriangles;
    const positions = new Float32Array(triangles.length * 9);
    const colors = new Float32Array(triangles.length * 9);

    const triHex = getDimensionHexColor(2, colorBlindness);
    const fallbackTriCol = new THREE.Color(isLightTheme ? 0x4338ca : triHex);
    const maxDensity = Math.max(1, ...points.map((p) => p.density || 0));

    for (let i = 0; i < triangles.length; i++) {
      const [u, v, w] = triangles[i];
      const pU = points[u];
      const pV = points[v];
      const pW = points[w];
      const pUCoords = pU?.coords3D || [0, 0, 0];
      const pVCoords = pV?.coords3D || [0, 0, 0];
      const pWCoords = pW?.coords3D || [0, 0, 0];

      positions[i * 9] = pUCoords[0];
      positions[i * 9 + 1] = pUCoords[1];
      positions[i * 9 + 2] = pUCoords[2];

      positions[i * 9 + 3] = pVCoords[0];
      positions[i * 9 + 4] = pVCoords[1];
      positions[i * 9 + 5] = pVCoords[2];

      positions[i * 9 + 6] = pWCoords[0];
      positions[i * 9 + 7] = pWCoords[1];
      positions[i * 9 + 8] = pWCoords[2];

      const isSelected =
        selectedSimplex?.type === 'triangle' &&
        selectedSimplex.u === u &&
        selectedSimplex.v === v &&
        selectedSimplex.w === w;

      if (isSelected) {
        // High-contrast glowing golden face
        for (let k = 0; k < 3; k++) {
          colors[i * 9 + k * 3] = 1.0;
          colors[i * 9 + k * 3 + 1] = 0.82;
          colors[i * 9 + k * 3 + 2] = 0.15;
        }
      } else {
        const colU = pU ? getColorForPoint(pU, colorScheme, colorBlindness, maxDensity, isLightTheme) : fallbackTriCol;
        const colV = pV ? getColorForPoint(pV, colorScheme, colorBlindness, maxDensity, isLightTheme) : fallbackTriCol;
        const colW = pW ? getColorForPoint(pW, colorScheme, colorBlindness, maxDensity, isLightTheme) : fallbackTriCol;

        colors[i * 9] = colU.r;
        colors[i * 9 + 1] = colU.g;
        colors[i * 9 + 2] = colU.b;

        colors[i * 9 + 3] = colV.r;
        colors[i * 9 + 4] = colV.g;
        colors[i * 9 + 5] = colV.b;

        colors[i * 9 + 6] = colW.r;
        colors[i * 9 + 7] = colW.g;
        colors[i * 9 + 8] = colW.b;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      emissive: isLightTheme ? 0x1e1b4b : 0x09090b,
      transparent: true,
      opacity: isLightTheme ? 0.48 : 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      shininess: 50,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    trianglesMeshRef.current = mesh;
  }, [activeComplex, showTriangles, points, colorScheme, colorBlindness, isLightTheme, selectedSimplex]);

  // Update Balls (ε/2 Vietoris-Rips balls) with vibrant per-point colormap colors
  useEffect(() => {
    const ballsGroup = ballsGroupRef.current;
    if (!ballsGroup) return;

    while (ballsGroup.children.length > 0) {
      const obj = ballsGroup.children[0];
      ballsGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    }

    if (!showBalls || currentEpsilon <= 0.01 || points.length === 0) return;

    const ballRadius = currentEpsilon / 2;
    const ballPoints = points.length > 120 ? points.slice(0, 120) : points;
    const sphereGeo = new THREE.SphereGeometry(ballRadius, 14, 10);
    const maxDensity = Math.max(1, ...points.map((p) => p.density || 0));

    for (const p of ballPoints) {
      const isPointSelected = selectedSimplex?.type === 'point' && selectedSimplex.id === p.id;
      const isEdgeVertex =
        selectedSimplex?.type === 'edge' && (selectedSimplex.u === p.id || selectedSimplex.v === p.id);
      const isTriVertex =
        selectedSimplex?.type === 'triangle' &&
        (selectedSimplex.u === p.id || selectedSimplex.v === p.id || selectedSimplex.w === p.id);
      const isCycleVertex = selectedSimplex?.type === 'cycle' && selectedSimplex.vertices?.includes(p.id);

      const isSelected = isPointSelected || isEdgeVertex || isTriVertex || isCycleVertex;

      const pCol = isSelected
        ? new THREE.Color(0xfbbf24) // Radiant golden amber for selected ball
        : getColorForPoint(p, colorScheme, colorBlindness, maxDensity, isLightTheme);

      const sphereMat = new THREE.MeshLambertMaterial({
        color: pCol,
        emissive: isSelected ? new THREE.Color(0x78350f) : new THREE.Color(0x000000),
        transparent: true,
        opacity: isSelected
          ? (isLightTheme ? 0.88 : 0.78)
          : (isLightTheme ? ballOpacity * 0.48 : ballOpacity * 0.38),
        depthWrite: false,
      });

      const ball = new THREE.Mesh(sphereGeo, sphereMat);
      ball.position.set(p.coords3D[0], p.coords3D[1], p.coords3D[2]);
      ballsGroup.add(ball);
    }
  }, [showBalls, currentEpsilon, ballOpacity, points, colorScheme, colorBlindness, isLightTheme, selectedSimplex]);

  // Update Generator Representative Cycle Highlighting
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (generatorCycleRef.current) {
      scene.remove(generatorCycleRef.current);
      generatorCycleRef.current.geometry.dispose();
      (generatorCycleRef.current.material as THREE.Material).dispose();
      generatorCycleRef.current = null;
    }
    if (generatorPointsRef.current) {
      scene.remove(generatorPointsRef.current);
      generatorPointsRef.current.geometry.dispose();
      (generatorPointsRef.current.material as THREE.Material).dispose();
      generatorPointsRef.current = null;
    }

    const targetPair = hoveredPair || selectedPair;
    if (!showGeneratorCycle || !targetPair) return;

    const { generatorEdges, generatorVertices, dimension } = targetPair;
    const highlightHex = getDimensionHexColor(dimension, colorBlindness);

    if (generatorEdges && generatorEdges.length > 0) {
      const positions = new Float32Array(generatorEdges.length * 6);
      for (let i = 0; i < generatorEdges.length; i++) {
        const [u, v] = generatorEdges[i];
        const pU = points[u]?.coords3D || [0, 0, 0];
        const pV = points[v]?.coords3D || [0, 0, 0];

        positions[i * 6] = pU[0];
        positions[i * 6 + 1] = pU[1];
        positions[i * 6 + 2] = pU[2];
        positions[i * 6 + 3] = pV[0];
        positions[i * 6 + 4] = pV[1];
        positions[i * 6 + 5] = pV[2];
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: isLightTheme ? 0xb91c1c : highlightHex,
        linewidth: 4.0,
        transparent: true,
        opacity: 0.98,
      });

      const lineSegments = new THREE.LineSegments(geometry, material);
      scene.add(lineSegments);
      generatorCycleRef.current = lineSegments;
    }

    if (generatorVertices && generatorVertices.length > 0) {
      const vertPos = new Float32Array(generatorVertices.length * 3);
      for (let i = 0; i < generatorVertices.length; i++) {
        const u = generatorVertices[i];
        const pU = points[u]?.coords3D || [0, 0, 0];
        vertPos[i * 3] = pU[0];
        vertPos[i * 3 + 1] = pU[1];
        vertPos[i * 3 + 2] = pU[2];
      }

      const vertGeo = new THREE.BufferGeometry();
      vertGeo.setAttribute('position', new THREE.BufferAttribute(vertPos, 3));

      // In light mode, vertices must be dark/high-contrast (not white!)
      const vertMat = new THREE.PointsMaterial({
        color: isLightTheme ? 0x0f172a : 0xffffff,
        size: pointSize * 2.2,
        transparent: true,
        opacity: 1.0,
      });

      const ptsMesh = new THREE.Points(vertGeo, vertMat);
      scene.add(ptsMesh);
      generatorPointsRef.current = ptsMesh;
    }
  }, [selectedPair, hoveredPair, showGeneratorCycle, points, pointSize, colorBlindness, isLightTheme]);

  // Update Dynamic Selection Rig with Glowing Light and Visual Geometry
  useEffect(() => {
    const group = selectionHighlightGroupRef.current;
    const light = selectionPointLightRef.current;
    const beacon = selectionBeaconRef.current;
    if (!group || !light || !beacon) return;

    // Clear old objects
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else (child.material as THREE.Material).dispose();
      }
    }

    if (!selectedSimplex) {
      light.intensity = 0;
      beacon.visible = false;
      return;
    }

    if (selectedSimplex.type === 'edge') {
      const { pU, pV } = selectedSimplex;
      const cx = (pU[0] + pV[0]) / 2;
      const cy = (pU[1] + pV[1]) / 2;
      const cz = (pU[2] + pV[2]) / 2;

      light.color.set(0x00f0ff);
      light.position.set(cx, cy, cz);
      light.intensity = 4.5;

      beacon.position.set(cx, cy, cz);
      (beacon.material as THREE.MeshBasicMaterial).color.set(0x38bdf8);
      beacon.visible = true;

      // Radiant glowing neon line
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array([...pU, ...pV]);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        linewidth: 4.5,
        transparent: true,
        opacity: 1.0,
      });
      group.add(new THREE.Line(geo, mat));

      // Glowing vertex spheres at both ends
      const vertGeo = new THREE.SphereGeometry(pointSize * 0.18, 16, 16);
      const vertMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.0,
        roughness: 0.1,
      });
      const b1 = new THREE.Mesh(vertGeo, vertMat);
      b1.position.set(pU[0], pU[1], pU[2]);
      const b2 = new THREE.Mesh(vertGeo, vertMat);
      b2.position.set(pV[0], pV[1], pV[2]);
      group.add(b1);
      group.add(b2);
    } else if (selectedSimplex.type === 'triangle') {
      const { pU, pV, pW, centroid } = selectedSimplex;
      light.color.set(0x10b981);
      light.position.set(centroid[0], centroid[1], centroid[2]);
      light.intensity = 4.8;

      beacon.position.set(centroid[0], centroid[1], centroid[2]);
      (beacon.material as THREE.MeshBasicMaterial).color.set(0x34d399);
      beacon.visible = true;

      // Glowing illuminated face
      const triGeo = new THREE.BufferGeometry();
      const triPos = new Float32Array([...pU, ...pV, ...pW]);
      triGeo.setAttribute('position', new THREE.BufferAttribute(triPos, 3));
      triGeo.computeVertexNormals();
      const triMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x047857,
        emissiveIntensity: 1.2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        roughness: 0.2,
      });
      group.add(new THREE.Mesh(triGeo, triMat));

      // Radiant glowing wireframe border
      const borderGeo = new THREE.BufferGeometry();
      const borderPos = new Float32Array([...pU, ...pV, ...pV, ...pW, ...pW, ...pU]);
      borderGeo.setAttribute('position', new THREE.BufferAttribute(borderPos, 3));
      const borderMat = new THREE.LineBasicMaterial({
        color: 0x6ee7b7,
        linewidth: 4.0,
        transparent: true,
        opacity: 1.0,
      });
      group.add(new THREE.LineSegments(borderGeo, borderMat));

      // 3 vertex beacons
      const vGeo = new THREE.SphereGeometry(pointSize * 0.16, 16, 16);
      const vMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 2.2,
      });
      [pU, pV, pW].forEach((pt) => {
        const vMesh = new THREE.Mesh(vGeo, vMat);
        vMesh.position.set(pt[0], pt[1], pt[2]);
        group.add(vMesh);
      });
    } else if (selectedSimplex.type === 'cycle') {
      const { edges, centroid, vertices } = selectedSimplex;
      light.color.set(0xa855f7);
      light.position.set(centroid[0], centroid[1], centroid[2]);
      light.intensity = 5.2;

      beacon.position.set(centroid[0], centroid[1], centroid[2]);
      (beacon.material as THREE.MeshBasicMaterial).color.set(0xc084fc);
      beacon.visible = true;

      if (edges.length > 0) {
        const linePos = new Float32Array(edges.length * 6);
        for (let i = 0; i < edges.length; i++) {
          const [u, v] = edges[i];
          const p1 = points[u]?.coords3D || [0, 0, 0];
          const p2 = points[v]?.coords3D || [0, 0, 0];
          linePos[i * 6] = p1[0];
          linePos[i * 6 + 1] = p1[1];
          linePos[i * 6 + 2] = p1[2];
          linePos[i * 6 + 3] = p2[0];
          linePos[i * 6 + 4] = p2[1];
          linePos[i * 6 + 5] = p2[2];
        }
        const cycleGeo = new THREE.BufferGeometry();
        cycleGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
        const cycleMat = new THREE.LineBasicMaterial({
          color: 0xe879f9,
          linewidth: 5.0,
          transparent: true,
          opacity: 1.0,
        });
        group.add(new THREE.LineSegments(cycleGeo, cycleMat));
      }

      const cVGeo = new THREE.SphereGeometry(pointSize * 0.22, 16, 16);
      const cVMat = new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: 0xec4899,
        emissiveIntensity: 2.5,
      });
      vertices.forEach((vIdx) => {
        const p = points[vIdx]?.coords3D;
        if (p) {
          const vm = new THREE.Mesh(cVGeo, cVMat);
          vm.position.set(p[0], p[1], p[2]);
          group.add(vm);
        }
      });
    } else if (selectedSimplex.type === 'point') {
      const { coords } = selectedSimplex;
      light.color.set(0x38bdf8);
      light.position.set(coords[0], coords[1], coords[2]);
      light.intensity = 4.8;

      beacon.position.set(coords[0], coords[1], coords[2]);
      (beacon.material as THREE.MeshBasicMaterial).color.set(0x38bdf8);
      beacon.visible = true;
    }
  }, [selectedSimplex, points, pointSize]);

  // Simplex Selection Handlers
  const selectEdge = (u: number, v: number) => {
    const pU = points[u]?.coords3D || [0, 0, 0];
    const pV = points[v]?.coords3D || [0, 0, 0];
    const length = Math.hypot(pU[0] - pV[0], pU[1] - pV[1], pU[2] - pV[2]);

    setSelectedSimplex({
      type: 'edge',
      u,
      v,
      pU,
      pV,
      length,
      birthEpsilon: currentEpsilon,
    });
    playSimplexTone(1, u + v);
  };

  const selectTriangle = (u: number, v: number, w: number) => {
    const pU = points[u]?.coords3D || [0, 0, 0];
    const pV = points[v]?.coords3D || [0, 0, 0];
    const pW = points[w]?.coords3D || [0, 0, 0];
    const centroid: [number, number, number] = [
      (pU[0] + pV[0] + pW[0]) / 3,
      (pU[1] + pV[1] + pW[1]) / 3,
      (pU[2] + pV[2] + pW[2]) / 3,
    ];

    const ab = [pV[0] - pU[0], pV[1] - pU[1], pV[2] - pU[2]];
    const ac = [pW[0] - pU[0], pW[1] - pU[1], pW[2] - pU[2]];
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const area = 0.5 * Math.hypot(cross[0], cross[1], cross[2]);
    const d1 = Math.hypot(pV[0] - pU[0], pV[1] - pU[1], pV[2] - pU[2]);
    const d2 = Math.hypot(pW[0] - pV[0], pW[1] - pV[1], pW[2] - pV[2]);
    const d3 = Math.hypot(pU[0] - pW[0], pU[1] - pW[1], pU[2] - pW[2]);

    setSelectedSimplex({
      type: 'triangle',
      u,
      v,
      w,
      pU,
      pV,
      pW,
      area,
      perimeter: d1 + d2 + d3,
      centroid,
    });
    playSimplexTone(2, u + v + w);
  };

  const selectCycle = (pair: PersistencePair) => {
    const verts = pair.generatorVertices || [];
    const edges = pair.generatorEdges || [];
    let cx = 0,
      cy = 0,
      cz = 0,
      count = 0;
    verts.forEach((idx) => {
      const p = points[idx]?.coords3D;
      if (p) {
        cx += p[0];
        cy += p[1];
        cz += p[2];
        count++;
      }
    });
    const centroid: [number, number, number] = count > 0 ? [cx / count, cy / count, cz / count] : [0, 0, 0];
    let perimeter = 0;
    edges.forEach(([u, v]) => {
      const p1 = points[u]?.coords3D;
      const p2 = points[v]?.coords3D;
      if (p1 && p2) {
        perimeter += Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]);
      }
    });

    setSelectedSimplex({
      type: 'cycle',
      pair,
      dimension: pair.dimension,
      vertices: verts,
      edges,
      perimeter,
      centroid,
    });
    if (onSelectPair) {
      onSelectPair(pair);
    }
    playSimplexTone('cycle', pair.dimension);
  };

  const selectPoint = (id: number) => {
    const pt = points[id];
    if (!pt) return;
    const connectedEdgesCount = activeComplex?.activeEdges.filter(([u, v]) => u === id || v === id).length || 0;
    setSelectedSimplex({
      type: 'point',
      id,
      coords: pt.coords3D,
      connectedEdgesCount,
    });
    playSimplexTone(0, id);
    onSelectPoint?.(id);
  };

  // 3D Raycasting Hit-Detection for Interactive Selection
  const handle3DSelectionRaycast = (clientX: number, clientY: number) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const mouseVec = new THREE.Vector2(
      (mouseX / rect.width) * 2 - 1,
      -(mouseY / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseVec, cameraRef.current);
    const ray = raycaster.ray;

    // 1. Check Generator Cycle if active and shown
    const activePair = hoveredPair || selectedPair;
    if (showGeneratorCycle && activePair && activePair.generatorEdges && activePair.generatorEdges.length > 0) {
      for (const [u, v] of activePair.generatorEdges) {
        const pU = points[u]?.coords3D;
        const pV = points[v]?.coords3D;
        if (pU && pV) {
          const v0 = new THREE.Vector3(...pU);
          const v1 = new THREE.Vector3(...pV);
          const distSq = ray.distanceSqToSegment(v0, v1);
          if (distSq < 0.2) {
            selectCycle(activePair);
            return;
          }
        }
      }
    }

    // 2. Check 2-Simplices (Triangles)
    if (showTriangles && activeComplex && activeComplex.activeTriangles.length > 0 && trianglesMeshRef.current) {
      const intersects = raycaster.intersectObject(trianglesMeshRef.current);
      if (intersects.length > 0 && typeof intersects[0].faceIndex === 'number') {
        const triIdx = intersects[0].faceIndex;
        const tri = activeComplex.activeTriangles[triIdx];
        if (tri) {
          selectTriangle(tri[0], tri[1], tri[2]);
          return;
        }
      }
    }

    // 3. Check 1-Simplices (Edges)
    if (showEdges && activeComplex && activeComplex.activeEdges.length > 0) {
      let closestEdge: [number, number] | null = null;
      let minEdgeDistSq = 0.16; // Hit threshold

      for (const [u, v] of activeComplex.activeEdges) {
        const pU = points[u]?.coords3D;
        const pV = points[v]?.coords3D;
        if (pU && pV) {
          const v0 = new THREE.Vector3(...pU);
          const v1 = new THREE.Vector3(...pV);
          const distSq = ray.distanceSqToSegment(v0, v1);
          if (distSq < minEdgeDistSq) {
            minEdgeDistSq = distSq;
            closestEdge = [u, v];
          }
        }
      }

      if (closestEdge) {
        selectEdge(closestEdge[0], closestEdge[1]);
        return;
      }
    }

    // 4. Check 0-Simplices (Points)
    if (pointsMeshRef.current) {
      raycaster.params.Points.threshold = 0.35;
      const ptIntersects = raycaster.intersectObject(pointsMeshRef.current);
      if (ptIntersects.length > 0 && ptIntersects[0].index !== undefined) {
        selectPoint(ptIntersects[0].index);
        return;
      }
    }
  };

  const focusOnSimplex = (cx: number, cy: number, cz: number) => {
    cameraTargetRef.current.set(cx, cy, cz);
    cameraRotationRef.current.radius = Math.max(3.2, cameraRotationRef.current.radius * 0.75);
    playSoundFeedback('click');
  };

  const handleStepSimplex = (direction: 1 | -1) => {
    if (!activeComplex) return;
    const edges = activeComplex.activeEdges;
    const triangles = activeComplex.activeTriangles;

    if (simplexFilterMode === 'balls' || selectedSimplex?.type === 'point') {
      if (points.length === 0) return;
      const currentIdx = selectedSimplex?.type === 'point' ? selectedSimplex.id : -1;
      const nextIdx = (currentIdx + direction + points.length) % points.length;
      selectPoint(nextIdx);
    } else if (simplexFilterMode === 'edges' || (selectedSimplex?.type === 'edge' && simplexFilterMode !== 'triangles')) {
      if (edges.length === 0) return;
      const currentIdx =
        selectedSimplex?.type === 'edge'
          ? edges.findIndex(([u, v]) => u === selectedSimplex.u && v === selectedSimplex.v)
          : -1;
      const nextIdx = (currentIdx + direction + edges.length) % edges.length;
      const [u, v] = edges[nextIdx];
      selectEdge(u, v);
    } else if (simplexFilterMode === 'triangles' || selectedSimplex?.type === 'triangle') {
      if (triangles.length === 0) return;
      const currentIdx =
        selectedSimplex?.type === 'triangle'
          ? triangles.findIndex(
              ([u, v, w]) => u === selectedSimplex.u && v === selectedSimplex.v && w === selectedSimplex.w
            )
          : -1;
      const nextIdx = (currentIdx + direction + triangles.length) % triangles.length;
      const [u, v, w] = triangles[nextIdx];
      selectTriangle(u, v, w);
    } else {
      if (edges.length > 0) {
        selectEdge(edges[0][0], edges[0][1]);
      }
    }
  };

  const handleRandomSimplex = () => {
    if (!activeComplex) return;
    const edges = activeComplex.activeEdges;
    const triangles = activeComplex.activeTriangles;
    if (simplexFilterMode === 'balls' && points.length > 0) {
      const randPt = Math.floor(Math.random() * points.length);
      selectPoint(randPt);
    } else if (simplexFilterMode === 'triangles' && triangles.length > 0) {
      const rand = triangles[Math.floor(Math.random() * triangles.length)];
      selectTriangle(rand[0], rand[1], rand[2]);
    } else if (edges.length > 0) {
      const rand = edges[Math.floor(Math.random() * edges.length)];
      selectEdge(rand[0], rand[1]);
    }
  };

  // Mouse Handlers with Click-to-Select Detection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) isDraggingRef.current = true;
    if (e.button === 2) isRightDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      cameraRotationRef.current.theta -= deltaX * 0.008;
      cameraRotationRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, cameraRotationRef.current.phi - deltaY * 0.008)
      );
    } else if (isRightDraggingRef.current) {
      const factor = cameraRotationRef.current.radius * 0.0015;
      cameraTargetRef.current.x -= deltaX * factor;
      cameraTargetRef.current.y += deltaY * factor;
    }

    // Telemetry Raycast when hovering
    if (settings.showCrosshair && containerRef.current && cameraRef.current && pointsMeshRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      mouseVecRef.current.x = (mouseX / rect.width) * 2 - 1;
      mouseVecRef.current.y = -(mouseY / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
      raycasterRef.current.params.Points.threshold = 0.3;

      const intersects = raycasterRef.current.intersectObject(pointsMeshRef.current);

      if (intersects.length > 0 && intersects[0].index !== undefined) {
        const idx = intersects[0].index;
        const pt = points[idx];
        if (pt) {
          setCursorTelemetry({
            x: mouseX,
            y: mouseY,
            worldX: pt.coords3D[0],
            worldY: pt.coords3D[1],
            worldZ: pt.coords3D[2],
            curvature: pt.curvature || Math.abs(Math.sin(pt.coords3D[0] * 1.5) * Math.cos(pt.coords3D[1])),
            nearestPointId: pt.id,
            isVisible: true,
          });
        }
      } else {
        const unproj = new THREE.Vector3(mouseVecRef.current.x, mouseVecRef.current.y, 0.5);
        unproj.unproject(cameraRef.current);
        setCursorTelemetry((prev) => ({
          ...prev,
          x: mouseX,
          y: mouseY,
          worldX: unproj.x,
          worldY: unproj.y,
          worldZ: unproj.z,
          curvature: Math.abs(Math.sin(unproj.x) * 0.42),
          isVisible: true,
        }));
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isDraggingRef.current = false;
    isRightDraggingRef.current = false;

    const distMoved = Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y);
    const duration = performance.now() - mouseDownPosRef.current.time;

    // Genuine click on 3D canvas (not a camera rotation/pan drag)
    if (distMoved < 6 && duration < 400 && containerRef.current && cameraRef.current) {
      handle3DSelectionRaycast(e.clientX, e.clientY);
    }
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    isRightDraggingRef.current = false;
    setCursorTelemetry((prev) => ({ ...prev, isVisible: false }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    cameraRotationRef.current.radius = Math.max(
      2.0,
      Math.min(30.0, cameraRotationRef.current.radius + e.deltaY * 0.008)
    );
  };

  const handleResetCamera = (view: 'iso' | 'top' | 'front' | 'side' = 'iso') => {
    cameraTargetRef.current.set(0, 0, 0);
    if (view === 'iso') {
      cameraRotationRef.current = { theta: 0.8, phi: 0.8, radius: 8.5 };
    } else if (view === 'top') {
      cameraRotationRef.current = { theta: 0, phi: 0.05, radius: 8.5 };
    } else if (view === 'front') {
      cameraRotationRef.current = { theta: 0, phi: Math.PI / 2, radius: 8.5 };
    } else if (view === 'side') {
      cameraRotationRef.current = { theta: Math.PI / 2, phi: Math.PI / 2, radius: 8.5 };
    }
  };

  const captureSnapshot = () => {
    if (!rendererRef.current || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `tda_manifold_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      ref={containerRef}
      id="point-cloud-3d-container"
      className={`relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border shadow-2xl flex flex-col group ${
        isLightTheme ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
      } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        id="threejs-canvas"
        className="w-full h-full flex-1 cursor-crosshair active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={handleWheel}
      />

      {/* Top Floating Overlay Badge */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5 z-10">
        <div
          className={`flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-lg border shadow-md ${
            isLightTheme
              ? 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-200/50'
              : 'bg-zinc-900/85 text-zinc-100 border-zinc-800'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide">3D Manifold Complex</span>
          <span className="text-[11px] font-mono text-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-800/50 font-bold">
            N = {points.length}
          </span>
        </div>

        {/* Live Active Simplices Badge */}
        {activeComplex && (
          <div
            className={`flex items-center gap-2.5 backdrop-blur-md px-3 py-1 rounded-md border text-[11px] font-mono shadow-xs ${
              isLightTheme
                ? 'bg-white/95 text-slate-700 border-slate-200'
                : 'bg-zinc-900/85 text-zinc-300 border-zinc-800'
            }`}
          >
            <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-500'}>1-Simp (Edges):</span>
            <span className="text-cyan-600 dark:text-cyan-300 font-semibold">{activeComplex.activeEdges.length}</span>
            <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-500'}>2-Simp (Faces):</span>
            <span className="text-indigo-600 dark:text-indigo-300 font-semibold">
              {activeComplex.activeTriangles.length}
            </span>
            <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-500'}>ε:</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{currentEpsilon.toFixed(3)}</span>
          </div>
        )}
      </div>

      {/* Selected Simplex Glowing Light Inspector Card */}
      {selectedSimplex && (
        <div
          id="simplex-selection-inspector"
          className={`absolute top-3 right-3 z-30 w-72 backdrop-blur-xl rounded-xl border p-3.5 shadow-2xl transition-all animate-in fade-in slide-in-from-right-3 duration-200 ${
            isLightTheme
              ? 'bg-white/95 text-slate-900 border-blue-400/60 shadow-blue-900/10'
              : 'bg-zinc-900/95 text-zinc-100 border-cyan-500/50 shadow-black/80'
          }`}
        >
          {/* Header with Glowing Indicator and Close X Button */}
          <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                {selectedSimplex.type === 'edge'
                  ? '1-Simplex (Edge)'
                  : selectedSimplex.type === 'triangle'
                  ? '2-Simplex (Face)'
                  : selectedSimplex.type === 'cycle'
                  ? 'H₁ Cycle Generator'
                  : '0-Simplex (Node)'}
              </span>
            </div>
            <button
              id="btn-close-simplex-inspector"
              onClick={() => setSelectedSimplex(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-500/20 border border-transparent hover:border-red-500/40 transition group"
              title="Deselect & Dismiss Glowing Light"
            >
              <X className="w-3.5 h-3.5 group-hover:text-red-500" />
            </button>
          </div>

          {/* Details & Metrics */}
          <div className="py-2.5 space-y-1.5 text-xs font-mono">
            {selectedSimplex.type === 'edge' && (
              <>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Vertices:</span>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-300">
                    [p_{selectedSimplex.u}, p_{selectedSimplex.v}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Length ||p-q||:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-300">
                    {selectedSimplex.length.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Boundary ∂₁:</span>
                  <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                    p_{selectedSimplex.v} − p_{selectedSimplex.u}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Filtration ε:</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold">
                    {currentEpsilon.toFixed(3)}
                  </span>
                </div>
              </>
            )}

            {selectedSimplex.type === 'triangle' && (
              <>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Vertices:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                    [p_{selectedSimplex.u}, p_{selectedSimplex.v}, p_{selectedSimplex.w}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Surface Area:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-300">
                    {selectedSimplex.area.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Perimeter:</span>
                  <span className="text-cyan-600 dark:text-cyan-300">{selectedSimplex.perimeter.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Boundary ∂₂:</span>
                  <span className="text-violet-600 dark:text-violet-300 font-semibold">3 Edges Loop</span>
                </div>
              </>
            )}

            {selectedSimplex.type === 'cycle' && (
              <>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Homology Class:</span>
                  <span className="font-bold text-pink-500">
                    H_{selectedSimplex.dimension} ({selectedSimplex.pair.id})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Loop Vertices:</span>
                  <span className="text-pink-600 dark:text-pink-300">{selectedSimplex.vertices.length} Nodes</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Loop Perimeter:</span>
                  <span className="text-amber-600 dark:text-amber-300">{selectedSimplex.perimeter.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Persistence:</span>
                  <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                    Life = {selectedSimplex.pair.lifetime.toFixed(4)}
                  </span>
                </div>
              </>
            )}

            {selectedSimplex.type === 'point' && (
              <>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Point Index:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-300">p_{selectedSimplex.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>3D Coords:</span>
                  <span className={isLightTheme ? 'text-slate-700' : 'text-zinc-200'}>
                    [{selectedSimplex.coords[0].toFixed(2)}, {selectedSimplex.coords[1].toFixed(2)},{' '}
                    {selectedSimplex.coords[2].toFixed(2)}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Neighbor Edges:</span>
                  <span className="text-amber-600 dark:text-amber-300">{selectedSimplex.connectedEdgesCount}</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center gap-1.5">
            <button
              onClick={() => {
                if (selectedSimplex.type === 'edge') {
                  focusOnSimplex(
                    (selectedSimplex.pU[0] + selectedSimplex.pV[0]) / 2,
                    (selectedSimplex.pU[1] + selectedSimplex.pV[1]) / 2,
                    (selectedSimplex.pU[2] + selectedSimplex.pV[2]) / 2
                  );
                } else if (selectedSimplex.type === 'triangle' || selectedSimplex.type === 'cycle') {
                  focusOnSimplex(...selectedSimplex.centroid);
                } else if (selectedSimplex.type === 'point') {
                  focusOnSimplex(...selectedSimplex.coords);
                }
              }}
              className="flex-1 py-1 px-2 rounded-md text-[11px] font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 flex items-center justify-center gap-1 transition"
              title="Center 3D camera onto this glowing simplex"
            >
              <Eye className="w-3 h-3" />
              <span>Focus 3D</span>
            </button>

            {/* Sound Button */}
            <button
              onClick={() => {
                ensureAudioContext();
                if (!isSoundOn) {
                  setAudioMuted(false);
                  setIsSoundOn(true);
                }
                if (selectedSimplex.type === 'edge') playSimplexTone(1, selectedSimplex.u);
                else if (selectedSimplex.type === 'triangle') playSimplexTone(2, selectedSimplex.u);
                else if (selectedSimplex.type === 'cycle') playSimplexTone('cycle', 1);
                else if (selectedSimplex.type === 'point') playSimplexTone(0, selectedSimplex.id);
                setJustPlayedSound(true);
                setTimeout(() => setJustPlayedSound(false), 450);
              }}
              className={`p-1.5 rounded-md border transition flex items-center gap-1 ${
                isLightTheme
                  ? isSoundOn
                    ? 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border-cyan-300 font-semibold'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300'
                  : isSoundOn
                  ? 'text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900 border-cyan-500/50'
                  : 'text-zinc-400 bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/60'
              }`}
              title={isSoundOn ? 'Sonify Simplex Frequency Tone' : 'Audio is muted — Click to unmute & sonify tone'}
            >
              {isSoundOn ? (
                <Volume2
                  className={`w-3.5 h-3.5 ${
                    justPlayedSound ? 'text-emerald-500 scale-125' : 'text-cyan-500'
                  } transition-transform`}
                />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>

            {/* Explain Feature Toggle Button */}
            {onOpenExplain && (
              <button
                onClick={() => {
                  let targetPair: PersistencePair | undefined;
                  if (selectedSimplex.type === 'cycle') {
                    targetPair = selectedSimplex.pair;
                  } else if (selectedSimplex.type === 'edge') {
                    targetPair =
                      tdaResult?.pairs.find(
                        (p) =>
                          p.generatorEdges?.some(
                            ([u, v]) =>
                              (u === selectedSimplex.u && v === selectedSimplex.v) ||
                              (u === selectedSimplex.v && v === selectedSimplex.u)
                          ) ||
                          p.generatorVertices?.includes(selectedSimplex.u) ||
                          p.generatorVertices?.includes(selectedSimplex.v)
                      ) || {
                        id: `e(${selectedSimplex.u},${selectedSimplex.v})`,
                        dimension: 1,
                        birth: selectedSimplex.birthEpsilon,
                        death: selectedSimplex.birthEpsilon + selectedSimplex.length,
                        lifetime: selectedSimplex.length,
                        isInfinite: false,
                        generatorVertices: [selectedSimplex.u, selectedSimplex.v],
                        generatorEdges: [[selectedSimplex.u, selectedSimplex.v]],
                      };
                  } else if (selectedSimplex.type === 'triangle') {
                    targetPair =
                      tdaResult?.pairs.find((p) => p.dimension === 2) || {
                        id: `Δ(${selectedSimplex.u},${selectedSimplex.v},${selectedSimplex.w})`,
                        dimension: 2,
                        birth: currentEpsilon * 0.8,
                        death: currentEpsilon * 0.8 + 0.25,
                        lifetime: 0.25,
                        isInfinite: false,
                        generatorVertices: [selectedSimplex.u, selectedSimplex.v, selectedSimplex.w],
                        generatorEdges: [
                          [selectedSimplex.u, selectedSimplex.v],
                          [selectedSimplex.v, selectedSimplex.w],
                          [selectedSimplex.w, selectedSimplex.u],
                        ],
                      };
                  } else if (selectedSimplex.type === 'point') {
                    targetPair =
                      tdaResult?.pairs.find(
                        (p) => p.dimension === 0 && p.generatorVertices?.includes(selectedSimplex.id)
                      ) ||
                      tdaResult?.pairs.find((p) => p.dimension === 0) || {
                        id: `p_${selectedSimplex.id}`,
                        dimension: 0,
                        birth: 0,
                        death: currentEpsilon,
                        lifetime: currentEpsilon,
                        isInfinite: false,
                        generatorVertices: [selectedSimplex.id],
                        generatorEdges: [],
                      };
                  }
                  onOpenExplain(targetPair);
                }}
                className={`py-1 px-2.5 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1 transition ${
                  isLightTheme
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold'
                    : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/40'
                }`}
                title="Toggle AI Topology Copilot Explanation"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Explain</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Representative Generator Highlight Banner (if no individual simplex selected) */}
      {!selectedSimplex && (hoveredPair || selectedPair) && showGeneratorCycle && (
        <div
          className={`absolute top-3 right-3 z-10 backdrop-blur-md border px-3.5 py-2 rounded-xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in duration-200 cursor-pointer transition ${
            isLightTheme
              ? 'bg-white/95 border-cyan-500/50 hover:border-cyan-600'
              : 'bg-zinc-900/90 border-cyan-500/40 hover:border-cyan-400'
          }`}
          onClick={() => {
            const targetPair = hoveredPair || selectedPair;
            if (targetPair) selectCycle(targetPair);
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
            <div className="text-xs">
              <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Generator: </span>
              <span className="font-semibold font-mono text-cyan-600 dark:text-cyan-300">
                {(hoveredPair || selectedPair)?.id} (H_{(hoveredPair || selectedPair)?.dimension})
              </span>
              <span className={`text-[11px] ml-2 ${isLightTheme ? 'text-slate-500' : 'text-zinc-400'}`}>
                Life: {((hoveredPair || selectedPair)?.lifetime || 0).toFixed(3)}
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-800 font-medium">
            Select Cycle ↗
          </span>
        </div>
      )}

      {/* Real-time Mathematical Crosshair Telemetry Overlay */}
      {settings.showCrosshair && cursorTelemetry.isVisible && (
        <div
          className={`absolute z-20 pointer-events-none backdrop-blur-md border rounded-lg p-2 shadow-2xl text-[10px] font-mono space-y-0.5 transition-all duration-75 ${
            isLightTheme
              ? 'bg-white/95 text-slate-800 border-slate-300'
              : 'bg-zinc-900/90 text-zinc-300 border-zinc-700/80'
          }`}
          style={{
            left: Math.min(cursorTelemetry.x + 15, (containerRef.current?.clientWidth || 500) - 170),
            top: Math.min(cursorTelemetry.y + 15, (containerRef.current?.clientHeight || 400) - 100),
          }}
        >
          <div className="flex items-center gap-1.5 text-cyan-500 font-semibold border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
            <Crosshair className="w-3 h-3" />
            <span>Manifold Probe</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={isLightTheme ? 'text-slate-400' : 'text-zinc-500'}>Coord:</span>
            <span className={isLightTheme ? 'text-slate-900 font-semibold' : 'text-white'}>
              [{cursorTelemetry.worldX.toFixed(2)}, {cursorTelemetry.worldY.toFixed(2)},{' '}
              {cursorTelemetry.worldZ.toFixed(2)}]
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={isLightTheme ? 'text-slate-400' : 'text-zinc-500'}>Curvature κ:</span>
            <span className="text-amber-600 dark:text-amber-300 font-bold">{cursorTelemetry.curvature.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={isLightTheme ? 'text-slate-400' : 'text-zinc-500'}>Nearest p:</span>
            <span className="text-emerald-600 dark:text-emerald-300 font-bold">p_{cursorTelemetry.nearestPointId}</span>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Left: Camera View Orientation Buttons */}
        <div
          className={`flex items-center gap-1 backdrop-blur-md p-1 rounded-lg border shadow-md ${
            isLightTheme ? 'bg-white/95 border-slate-200' : 'bg-zinc-900/85 border-zinc-800'
          }`}
        >
          <button
            id="btn-view-iso"
            onClick={() => handleResetCamera('iso')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Isometric Perspective"
          >
            ISO
          </button>
          <button
            id="btn-view-top"
            onClick={() => handleResetCamera('top')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Top View (XY Plane)"
          >
            TOP
          </button>
          <button
            id="btn-view-front"
            onClick={() => handleResetCamera('front')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Front View (XZ Plane)"
          >
            FRONT
          </button>
          <button
            id="btn-reset-cam"
            onClick={() => handleResetCamera('iso')}
            className={`p-1 rounded transition ml-1 ${
              isLightTheme
                ? 'text-slate-500 hover:text-black hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Reset Camera Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Simplex Explorer & Carousel Navigation Bar */}
        <div
          className={`flex items-center gap-1 backdrop-blur-md p-1 rounded-lg border shadow-md ${
            isLightTheme ? 'bg-white/95 border-slate-200' : 'bg-zinc-900/85 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSimplexFilterMode('all')}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition ${
                simplexFilterMode === 'all'
                  ? isLightTheme
                    ? 'bg-slate-200 text-slate-900 font-bold'
                    : 'bg-zinc-700 text-white font-bold'
                  : isLightTheme
                  ? 'text-slate-500 hover:text-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setSimplexFilterMode('balls');
                if (points.length > 0) {
                  selectPoint(0);
                }
              }}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition ${
                simplexFilterMode === 'balls'
                  ? 'bg-sky-500 text-white border border-sky-400 font-bold shadow-xs'
                  : isLightTheme
                  ? 'text-slate-500 hover:text-sky-600'
                  : 'text-zinc-400 hover:text-sky-300'
              }`}
            >
              ε/2 Balls ({points.length})
            </button>
            <button
              onClick={() => {
                setSimplexFilterMode('edges');
                if (activeComplex && activeComplex.activeEdges.length > 0) {
                  selectEdge(activeComplex.activeEdges[0][0], activeComplex.activeEdges[0][1]);
                }
              }}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition ${
                simplexFilterMode === 'edges'
                  ? 'bg-teal-500 text-white border border-teal-400 font-bold shadow-xs'
                  : isLightTheme
                  ? 'text-slate-500 hover:text-teal-600'
                  : 'text-zinc-400 hover:text-teal-300'
              }`}
            >
              1-Edges ({activeComplex?.activeEdges.length || 0})
            </button>
            <button
              onClick={() => {
                setSimplexFilterMode('triangles');
                if (activeComplex && activeComplex.activeTriangles.length > 0) {
                  selectTriangle(
                    activeComplex.activeTriangles[0][0],
                    activeComplex.activeTriangles[0][1],
                    activeComplex.activeTriangles[0][2]
                  );
                }
              }}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition ${
                simplexFilterMode === 'triangles'
                  ? 'bg-indigo-600 text-white border border-indigo-400 font-bold shadow-xs'
                  : isLightTheme
                  ? 'text-slate-500 hover:text-indigo-600'
                  : 'text-zinc-400 hover:text-indigo-300'
              }`}
            >
              2-Triangles ({activeComplex?.activeTriangles.length || 0})
            </button>
            {(hoveredPair || selectedPair) && (
              <button
                onClick={() => {
                  const targetPair = hoveredPair || selectedPair;
                  if (targetPair) selectCycle(targetPair);
                }}
                className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-400 text-slate-950 border border-amber-300 font-black shadow-xs hover:bg-amber-300 transition flex items-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5 text-slate-950 fill-slate-950" />
                <span>H₁ Cycle</span>
              </button>
            )}
          </div>

          <div className="h-3 w-[1px] bg-slate-300 dark:bg-zinc-700 mx-0.5" />

          {/* Stepper buttons */}
          <button
            onClick={() => handleStepSimplex(-1)}
            className={`p-1 rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Previous Simplex (Lights up in 3D)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStepSimplex(1)}
            className={`p-1 rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Next Simplex (Lights up in 3D)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRandomSimplex}
            className={`p-1 rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-amber-600 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-800'
            }`}
            title="Random Simplex Spotlight"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Camera Tools (Auto-rotate, Snapshot, Fullscreen) */}
        <div
          className={`flex items-center gap-1.5 backdrop-blur-md p-1 rounded-lg border shadow-md ${
            isLightTheme ? 'bg-white/95 border-slate-200' : 'bg-zinc-900/85 border-zinc-800'
          }`}
        >
          <button
            id="btn-autorotate-toggle"
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition ${
              isAutoRotating
                ? 'shadow-sm font-semibold'
                : isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            style={
              isAutoRotating
                ? {
                    backgroundColor: 'var(--realtime-secondary)',
                    color: 'var(--realtime-accent)',
                    borderColor: 'var(--realtime-accent)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }
                : undefined
            }
            title="Toggle 3D Orbit Auto-Rotation"
          >
            <Compass className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} />
            <span>{isAutoRotating ? 'Rotating' : 'Orbit'}</span>
          </button>

          <button
            id="btn-capture-snapshot"
            onClick={captureSnapshot}
            className={`p-1.5 rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Save PNG Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-fullscreen-toggle"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1.5 rounded transition ${
              isLightTheme
                ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

function getColorForPoint(
  p: PointData,
  scheme: ColorMapScheme,
  blindness: ColorBlindnessMode,
  maxDensity: number,
  isLight = false
): THREE.Color {
  const [x, y, z] = p.coords3D;
  const colors = HOMOLOGY_COLORS[blindness];

  if (scheme === 'spectral') {
    const norm = (x + y + z) / 6 + 0.5;
    const hue = Math.max(0, Math.min(1, norm));
    const col = new THREE.Color();
    col.setHSL(0.7 - hue * 0.7, 0.95, isLight ? 0.42 : 0.55);
    return col;
  }

  if (scheme === 'plasma') {
    const t = Math.hypot(x, y, z) / 3.5;
    const col = new THREE.Color();
    col.setHSL(0.8 - t * 0.7, 0.95, isLight ? 0.42 : 0.5 + t * 0.1);
    return col;
  }

  if (scheme === 'viridis') {
    const t = Math.max(0, Math.min(1, (z + 2) / 4));
    const col = new THREE.Color();
    col.setHSL(0.35 + t * 0.45, 0.95, isLight ? 0.32 : 0.35 + t * 0.3);
    return col;
  }

  if (scheme === 'cluster') {
    const clusterHex = [colors.hex0, colors.hex1, colors.hex2, 0xa855f7, 0xf43f5e];
    const cIdx = (p.cluster || 0) % clusterHex.length;
    const col = new THREE.Color(clusterHex[cIdx]);
    if (isLight) col.offsetHSL(0, 0.1, -0.15);
    return col;
  }

  // Cyan / Amber default with colorblind adjustment
  const densityRatio = (p.density || 0) / (maxDensity || 1);
  const col = new THREE.Color();
  col.lerpColors(new THREE.Color(colors.hex1), new THREE.Color(colors.hex0), densityRatio);
  if (isLight) col.offsetHSL(0, 0.1, -0.15);
  return col;
}
