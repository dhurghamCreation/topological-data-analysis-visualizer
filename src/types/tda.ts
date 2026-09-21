/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DatasetType =
  | 'circle'
  | 'figure_eight'
  | 'torus'
  | 'sphere'
  | 'swiss_roll'
  | 'klein_bottle'
  | 'double_torus'
  | 'trefoil_knot'
  | 'clustered_moons'
  | 'lorenz_attractor'
  | 'gaussian_mixture'
  | 'cubical_grid'
  | 'custom_upload';

export type FiltrationModel = 'vietoris_rips' | 'alpha_complex' | 'cubical';

export interface PointData {
  id: number;
  originalCoords: number[];
  coords3D: [number, number, number];
  cluster?: number;
  density?: number;
  curvature?: number;
}

export interface GeneratorCycle {
  dimension: 0 | 1 | 2;
  vertices: number[];
  edges: [number, number][];
  triangles?: [number, number, number][];
}

export interface PersistencePair {
  id: string;
  dimension: 0 | 1 | 2;
  birth: number;
  death: number;
  lifetime: number;
  isInfinite: boolean;
  generatorVertices: number[];
  generatorEdges: [number, number][];
  representativeTriangles?: [number, number, number][];
  color?: string;
}

export interface BettiPoint {
  epsilon: number;
  b0: number;
  b1: number;
  b2: number;
  euler: number;
}

export interface LandscapeCurve {
  dimension: 0 | 1 | 2;
  layer: number; // 1 = 1st landscape, 2 = 2nd landscape, etc.
  points: { t: number; value: number }[];
}

export interface PhaseTransitionPoint {
  epsilon: number;
  description: string;
  type: 'component_merger' | 'loop_birth' | 'loop_death' | 'void_birth' | 'void_death' | 'euler_inflection';
  deltaEuler: number;
}

export interface VectorizationStats {
  topologicalEntropy: number;
  entropyH0: number;
  entropyH1: number;
  entropyH2: number;
  totalEntropy: number;
  normalizedEntropy: number;
  totalPersistence: number;
  maxPersistence: number;
  persLandscapeL1Norm: number;
  persLandscapeL2Norm: number;
  bettiVector: number[];
  vector128D: number[];
}

export interface TDAResult {
  pairs: PersistencePair[];
  maxEpsilon: number;
  bettiCurves: BettiPoint[];
  landscapes: LandscapeCurve[];
  vectorization: VectorizationStats;
  bootstrapBand: number; // 2 * c_alpha for 95% confidence
  phaseTransitions: PhaseTransitionPoint[];
  computationTimeMs: number;
  numVertices: number;
  numEdges: number;
  numTriangles: number;
  distanceMatrix: Float32Array;
  sampledIndices: number[];
  filtrationModel: FiltrationModel;
  complexSimplices?: {
    edges: { u: number; v: number; weight: number }[];
    triangles: { u: number; v: number; w: number; weight: number }[];
  };
}

export type DistanceMetric = 'euclidean' | 'manhattan' | 'cosine';
export type SubsamplingMethod = 'none' | 'farthest_point' | 'random';
export type ColorMapScheme = 'spectral' | 'plasma' | 'viridis' | 'cyan_amber' | 'dimension' | 'cluster';
export type ColorBlindnessMode = 'standard' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type RenderEngine = 'webgl' | 'canvas2d';
export type PrecisionMode = 'float32' | 'float64';
export type ThemeMode = 'obsidian' | 'blueprint' | 'light';

export interface AppSettings {
  theme: ThemeMode;
  renderEngine: RenderEngine;
  colorBlindness: ColorBlindnessMode;
  precision: PrecisionMode;
  showCrosshair: boolean;
  pulseGlow: boolean;
  magneticSnap: boolean;
  soundFeedback: boolean;
  showConfidenceBands: boolean;
}

export interface DatasetConfig {
  type: DatasetType;
  name: string;
  numPoints: number;
  noise: number;
  scale: number;
  paramR?: number;
  paramR2?: number;
  metric: DistanceMetric;
  filtrationModel: FiltrationModel;
  subsampling: SubsamplingMethod;
  subsampleTarget: number;
  maxDimension: 1 | 2;
  noiseFilterRatio: number; // 0 to 1, filter short-lived bars
}

export interface ActiveSimplicialComplex {
  activeEdges: [number, number][];
  activeTriangles: [number, number, number][];
  activeComponents: number;
  activeLoops: number;
  activeVoids: number;
  betti0: number;
  betti1: number;
  betti2: number;
  euler: number;
}

export interface MatchingEdge {
  sourceId: string;
  targetId: string;
  sourceCoords: [number, number]; // [birth, death]
  targetCoords: [number, number];
  distance: number;
  isToDiagonal: boolean;
}

export interface TDAComparisonResult {
  datasetA: { name: string; numPoints: number; pairs: PersistencePair[] };
  datasetB: { name: string; numPoints: number; pairs: PersistencePair[] };
  bottleneckDistanceH0: number;
  bottleneckDistanceH1: number;
  wasserstein2DistanceH0: number;
  wasserstein2DistanceH1: number;
  matchingEdgesH0: MatchingEdge[];
  matchingEdgesH1: MatchingEdge[];
}
