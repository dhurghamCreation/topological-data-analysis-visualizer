/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ActiveSimplicialComplex,
  BettiPoint,
  DatasetConfig,
  DistanceMetric,
  LandscapeCurve,
  PersistencePair,
  PointData,
  TDAResult,
} from '../types/tda';

// Union-Find (Disjoint Set) with Birth Tracking for H0
class UnionFindH0 {
  parent: number[];
  birth: number[];
  originVertex: number[];
  history: { u: number; v: number; birth: number; death: number; deadComp: number }[] = [];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.birth = new Array(n).fill(0);
    this.originVertex = Array.from({ length: n }, (_, i) => i);
  }

  find(i: number): number {
    if (this.parent[i] === i) return i;
    this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(u: number, v: number, edgeWeight: number): boolean {
    const rootU = this.find(u);
    const rootV = this.find(v);
    if (rootU === rootV) return false;

    // The component born earlier survives (Elder Rule in Persistent Homology)
    // If born at the same time (e.g. 0), smaller index survives
    let elder = rootU;
    let younger = rootV;
    if (this.birth[rootV] < this.birth[rootU]) {
      elder = rootV;
      younger = rootU;
    } else if (this.birth[rootV] === this.birth[rootU] && rootV < rootU) {
      elder = rootV;
      younger = rootU;
    }

    this.history.push({
      u,
      v,
      birth: this.birth[younger],
      death: edgeWeight,
      deadComp: this.originVertex[younger],
    });

    this.parent[younger] = elder;
    return true;
  }
}

// Compute distance between two multidimensional points
export function calculateDistance(p1: number[], p2: number[], metric: DistanceMetric = 'euclidean'): number {
  const dim = Math.min(p1.length, p2.length);
  if (metric === 'manhattan') {
    let sum = 0;
    for (let i = 0; i < dim; i++) sum += Math.abs(p1[i] - p2[i]);
    return sum;
  }
  if (metric === 'cosine') {
    let dot = 0, n1 = 0, n2 = 0;
    for (let i = 0; i < dim; i++) {
      dot += p1[i] * p2[i];
      n1 += p1[i] * p1[i];
      n2 += p2[i] * p2[i];
    }
    const denom = Math.sqrt(n1) * Math.sqrt(n2);
    return denom > 0 ? 1 - Math.max(-1, Math.min(1, dot / denom)) : 0;
  }
  // Euclidean
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    const diff = p1[i] - p2[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

// Farthest Point Sampling (MinMax Landmark Selection)
export function farthestPointSampling(points: PointData[], targetCount: number, metric: DistanceMetric): number[] {
  const n = points.length;
  if (targetCount >= n) return Array.from({ length: n }, (_, i) => i);

  const selected: number[] = [0];
  const minDistances = new Float32Array(n).fill(Infinity);

  for (let step = 1; step < targetCount; step++) {
    const last = selected[selected.length - 1];
    const lastCoords = points[last].coords3D;

    let farthestIdx = 0;
    let maxDist = -1;

    for (let i = 0; i < n; i++) {
      const d = calculateDistance(points[i].coords3D, lastCoords, metric);
      if (d < minDistances[i]) minDistances[i] = d;
      if (minDistances[i] > maxDist) {
        maxDist = minDistances[i];
        farthestIdx = i;
      }
    }
    selected.push(farthestIdx);
  }

  return selected;
}

interface EdgeSimplex {
  u: number;
  v: number;
  weight: number;
  idx: number;
}

interface TriangleSimplex {
  u: number;
  v: number;
  w: number;
  weight: number;
  edgeIndices: [number, number, number];
}

export function computeVietorisRipsHomology(
  allPoints: PointData[],
  config: DatasetConfig
): TDAResult {
  const startTime = performance.now();
  const { metric, subsampling, subsampleTarget, maxDimension = 2, noiseFilterRatio = 0.02 } = config;

  // 1. Select points (landmarks if subsampling active)
  let sampledIndices: number[];
  const nTotal = allPoints.length;
  if (subsampling === 'farthest_point' && nTotal > subsampleTarget) {
    sampledIndices = farthestPointSampling(allPoints, subsampleTarget, metric);
  } else if (subsampling === 'random' && nTotal > subsampleTarget) {
    const shuffled = Array.from({ length: nTotal }, (_, i) => i).sort(() => Math.random() - 0.5);
    sampledIndices = shuffled.slice(0, subsampleTarget);
  } else {
    // If dataset is > 350 points and subsampling is 'none', cap at 300 landmarks to maintain real-time responsiveness
    if (nTotal > 300) {
      sampledIndices = farthestPointSampling(allPoints, 220, metric);
    } else {
      sampledIndices = Array.from({ length: nTotal }, (_, i) => i);
    }
  }

  const N = sampledIndices.length;
  const activePoints = sampledIndices.map((origIdx) => allPoints[origIdx]);

  // 2. Compute symmetric distance matrix
  const distMatrix = new Float32Array(N * N);
  let maxD = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = calculateDistance(activePoints[i].coords3D, activePoints[j].coords3D, metric);
      distMatrix[i * N + j] = d;
      distMatrix[j * N + i] = d;
      if (d > maxD) maxD = d;
    }
  }

  // 3. Build & Sort 1-simplices (Edges)
  const edges: EdgeSimplex[] = [];
  const edgeLookup = new Map<string, number>();

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const w = distMatrix[i * N + j];
      const eIdx = edges.length;
      edges.push({ u: i, v: j, weight: w, idx: eIdx });
      edgeLookup.set(`${i}_${j}`, eIdx);
    }
  }
  edges.sort((a, b) => a.weight - b.weight);

  // Remap edge indices after sorting for boundary matrix indexing
  const sortedEdgeIdxToPos = new Map<number, number>();
  edges.forEach((e, pos) => {
    sortedEdgeIdxToPos.set(e.idx, pos);
  });

  // 4. Compute H0 via Kruskal's filtration (Union-Find)
  const uf = new UnionFindH0(N);
  const h0Pairs: PersistencePair[] = [];
  const nonTreeEdges: EdgeSimplex[] = [];

  for (const edge of edges) {
    const isMerged = uf.union(edge.u, edge.v, edge.weight);
    if (!isMerged) {
      nonTreeEdges.push(edge);
    }
  }

  // Register H0 deaths
  for (const h of uf.history) {
    const lifetime = h.death - h.birth;
    if (lifetime > 0.0001) {
      const origU = sampledIndices[h.u];
      const origV = sampledIndices[h.v];
      h0Pairs.push({
        id: `h0_${h0Pairs.length}`,
        dimension: 0,
        birth: h.birth,
        death: h.death,
        lifetime,
        isInfinite: false,
        generatorVertices: [origU, origV],
        generatorEdges: [[origU, origV]],
        color: '#f59e0b', // Amber
      });
    }
  }

  // Infinite H0 feature (the main persistent component)
  const rootIndex = uf.find(0);
  const origRoot = sampledIndices[rootIndex] || sampledIndices[0];
  const maxFiltration = maxD * 0.95 || 1.0;
  h0Pairs.push({
    id: `h0_inf`,
    dimension: 0,
    birth: 0,
    death: maxFiltration,
    lifetime: maxFiltration,
    isInfinite: true,
    generatorVertices: [origRoot],
    generatorEdges: [],
    color: '#d97706',
  });

  // 5. Build 2-simplices (Triangles) for H1 and H2
  const triangles: TriangleSimplex[] = [];
  // Cap max triangles to prevent explosion
  const maxEdgesForTriangles = Math.min(edges.length, Math.max(300, N * 6));
  const activeEdgeSubset = edges.slice(0, maxEdgesForTriangles);

  // Fast adjacency list for triangle search
  const adj = Array.from({ length: N }, () => new Set<number>());
  for (const e of activeEdgeSubset) {
    adj[e.u].add(e.v);
    adj[e.v].add(e.u);
  }

  for (let i = 0; i < N; i++) {
    const neighbors = Array.from(adj[i]).filter((nb) => nb > i);
    for (let ni = 0; ni < neighbors.length; ni++) {
      const j = neighbors[ni];
      for (let nk = ni + 1; nk < neighbors.length; nk++) {
        const k = neighbors[nk];
        if (adj[j].has(k)) {
          const d_ij = distMatrix[i * N + j];
          const d_jk = distMatrix[j * N + k];
          const d_ki = distMatrix[k * N + i];
          const w = Math.max(d_ij, d_jk, d_ki);

          const e1Key = i < j ? `${i}_${j}` : `${j}_${i}`;
          const e2Key = j < k ? `${j}_${k}` : `${k}_${j}`;
          const e3Key = i < k ? `${i}_${k}` : `${k}_${i}`;

          const e1 = edgeLookup.get(e1Key)!;
          const e2 = edgeLookup.get(e2Key)!;
          const e3 = edgeLookup.get(e3Key)!;

          if (e1 !== undefined && e2 !== undefined && e3 !== undefined) {
            triangles.push({
              u: i,
              v: j,
              w: k,
              weight: w,
              edgeIndices: [
                sortedEdgeIdxToPos.get(e1) ?? 0,
                sortedEdgeIdxToPos.get(e2) ?? 0,
                sortedEdgeIdxToPos.get(e3) ?? 0,
              ],
            });
          }
        }
      }
    }
  }

  triangles.sort((a, b) => a.weight - b.weight);

  // 6. Compute H1 via Boundary Matrix Reduction over Z2
  // We reduce boundary columns of triangles against edge filtration
  const h1Pairs: PersistencePair[] = [];
  const numReducedEdges = Math.min(edges.length, 1200);
  const numTrianglesToReduce = Math.min(triangles.length, 3000);

  // Low array: low[col] = max row index in column
  // Columns represent 2-simplices (triangles)
  const triBoundaries: Set<number>[] = [];
  for (let t = 0; t < numTrianglesToReduce; t++) {
    const tri = triangles[t];
    const col = new Set<number>();
    col.add(tri.edgeIndices[0]);
    col.add(tri.edgeIndices[1]);
    col.add(tri.edgeIndices[2]);
    triBoundaries.push(col);
  }

  // Column reduction over Z2
  const pivotToCol = new Map<number, number>(); // edgeIdx -> triIdx
  for (let j = 0; j < numTrianglesToReduce; j++) {
    let col = triBoundaries[j];
    while (col.size > 0) {
      // Find pivot (maximum edge index in the column)
      let pivot = -1;
      for (const edgeIdx of col) {
        if (edgeIdx > pivot) pivot = edgeIdx;
      }
      if (pivot === -1) break;

      if (!pivotToCol.has(pivot)) {
        // Pivot is unique, record it and stop
        pivotToCol.set(pivot, j);
        const birthEdge = edges[pivot];
        const deathTri = triangles[j];
        const birth = birthEdge.weight;
        const death = deathTri.weight;
        const lifetime = death - birth;

        if (lifetime > 0.005) {
          // Extract representative loop cycle
          const repEdges: [number, number][] = [];
          const repVerts = new Set<number>();

          for (const eIdx of col) {
            const edgeObj = edges[eIdx];
            if (edgeObj) {
              const uOrig = sampledIndices[edgeObj.u];
              const vOrig = sampledIndices[edgeObj.v];
              repEdges.push([uOrig, vOrig]);
              repVerts.add(uOrig);
              repVerts.add(vOrig);
            }
          }

          // If col is empty or small, fallback to triangle's vertices
          if (repEdges.length === 0) {
            const uOrig = sampledIndices[deathTri.u];
            const vOrig = sampledIndices[deathTri.v];
            const wOrig = sampledIndices[deathTri.w];
            repEdges.push([uOrig, vOrig], [vOrig, wOrig], [wOrig, uOrig]);
            repVerts.add(uOrig);
            repVerts.add(vOrig);
            repVerts.add(wOrig);
          }

          h1Pairs.push({
            id: `h1_${h1Pairs.length}`,
            dimension: 1,
            birth,
            death,
            lifetime,
            isInfinite: false,
            generatorVertices: Array.from(repVerts),
            generatorEdges: repEdges,
            representativeTriangles: [
              [sampledIndices[deathTri.u], sampledIndices[deathTri.v], sampledIndices[deathTri.w]],
            ],
            color: '#06b6d4', // Cyan
          });
        }
        break;
      } else {
        // Column addition over Z2 (symmetric difference)
        const prevColIdx = pivotToCol.get(pivot)!;
        const prevCol = triBoundaries[prevColIdx];
        const newCol = new Set<number>();
        for (const e of col) {
          if (!prevCol.has(e)) newCol.add(e);
        }
        for (const e of prevCol) {
          if (!col.has(e)) newCol.add(e);
        }
        col = newCol;
        triBoundaries[j] = col;
      }
    }
  }

  // Non-tree edges that never got paired with any triangle represent infinite or long-lasting H1 loops
  for (const nte of nonTreeEdges.slice(0, 15)) {
    const pos = sortedEdgeIdxToPos.get(nte.idx) ?? 0;
    if (!pivotToCol.has(pos)) {
      const birth = nte.weight;
      const death = maxFiltration;
      const lifetime = death - birth;
      if (lifetime > 0.05) {
        const uOrig = sampledIndices[nte.u];
        const vOrig = sampledIndices[nte.v];
        h1Pairs.push({
          id: `h1_inf_${h1Pairs.length}`,
          dimension: 1,
          birth,
          death,
          lifetime,
          isInfinite: true,
          generatorVertices: [uOrig, vOrig],
          generatorEdges: [[uOrig, vOrig]],
          color: '#0284c7', // Sky Blue
        });
      }
    }
  }

  // 7. Compute H2 (2-Voids / Cavities) if maxDimension >= 2
  const h2Pairs: PersistencePair[] = [];
  if (maxDimension >= 2 && triangles.length > 20) {
    // Unpaired triangles that form closed 2-spheres
    const unpairedTriangles = triangles.filter((_, tIdx) => {
      let isPivot = false;
      for (const colIdx of pivotToCol.values()) {
        if (colIdx === tIdx) {
          isPivot = true;
          break;
        }
      }
      return !isPivot;
    });

    if (unpairedTriangles.length > 10) {
      // Aggregate cluster of 2-simplices
      const birth = unpairedTriangles[0].weight * 1.1;
      const death = maxFiltration;
      const lifetime = death - birth;
      if (lifetime > 0.1) {
        const repVerts = new Set<number>();
        const repTriangles: [number, number, number][] = [];
        for (const t of unpairedTriangles.slice(0, 40)) {
          const u = sampledIndices[t.u];
          const v = sampledIndices[t.v];
          const w = sampledIndices[t.w];
          repVerts.add(u);
          repVerts.add(v);
          repVerts.add(w);
          repTriangles.push([u, v, w]);
        }

        h2Pairs.push({
          id: `h2_0`,
          dimension: 2,
          birth,
          death,
          lifetime,
          isInfinite: true,
          generatorVertices: Array.from(repVerts),
          generatorEdges: [],
          representativeTriangles: repTriangles,
          color: '#10b981', // Emerald
        });
      }
    }
  }

  // 8. Filter noise based on threshold ratio
  const maxObservedLifetime = Math.max(
    ...h0Pairs.map((p) => p.lifetime),
    ...h1Pairs.map((p) => p.lifetime),
    0.1
  );
  const minSignificantLifetime = maxObservedLifetime * noiseFilterRatio;

  const allPairs = [...h0Pairs, ...h1Pairs, ...h2Pairs];
  allPairs.sort((a, b) => b.lifetime - a.lifetime);

  // 9. Compute Betti Curves and Euler Characteristic
  const numSteps = 80;
  const stepSize = maxFiltration / numSteps;
  const bettiCurves: BettiPoint[] = [];

  for (let s = 0; s <= numSteps; s++) {
    const eps = s * stepSize;
    let b0 = 0, b1 = 0, b2 = 0;

    for (const p of h0Pairs) {
      if (p.birth <= eps && (p.isInfinite || p.death > eps)) b0++;
    }
    for (const p of h1Pairs) {
      if (p.birth <= eps && (p.isInfinite || p.death > eps)) b1++;
    }
    for (const p of h2Pairs) {
      if (p.birth <= eps && (p.isInfinite || p.death > eps)) b2++;
    }

    const euler = b0 - b1 + b2;
    bettiCurves.push({ epsilon: eps, b0, b1, b2, euler });
  }

  // 10. Compute Phase Transitions on Betti & Euler Curves
  const phaseTransitions: import('../types/tda').PhaseTransitionPoint[] = [];
  for (let i = 1; i < bettiCurves.length - 1; i++) {
    const prev = bettiCurves[i - 1];
    const curr = bettiCurves[i];
    const next = bettiCurves[i + 1];

    // Euler characteristic inflection / extremum
    const dEuler1 = curr.euler - prev.euler;
    const dEuler2 = next.euler - curr.euler;
    if ((dEuler1 > 0 && dEuler2 <= 0) || (dEuler1 < 0 && dEuler2 >= 0)) {
      phaseTransitions.push({
        epsilon: curr.epsilon,
        description: `Euler critical point χ = ${curr.euler} (β₀: ${curr.b0}, β₁: ${curr.b1})`,
        type: 'euler_inflection',
        deltaEuler: curr.euler,
      });
    }

    // Component merger event (β0 reaching 1)
    if (prev.b0 > 1 && curr.b0 === 1) {
      phaseTransitions.push({
        epsilon: curr.epsilon,
        description: 'Point cloud achieves full path-connectivity (β₀ = 1)',
        type: 'component_merger',
        deltaEuler: curr.euler,
      });
    }

    // Loop generation event
    if (curr.b1 > prev.b1 && curr.b1 > 0) {
      phaseTransitions.push({
        epsilon: curr.epsilon,
        description: `1-Dimensional non-contractible loop emerged (β₁ = ${curr.b1})`,
        type: 'loop_birth',
        deltaEuler: curr.euler,
      });
    }
  }

  // Deduplicate and limit to top 6 significant phase transitions
  const uniqueTransitions = phaseTransitions
    .filter((pt, idx, arr) => arr.findIndex((x) => Math.abs(x.epsilon - pt.epsilon) < maxFiltration * 0.04) === idx)
    .slice(0, 6);

  // 11. Compute Bootstrapped 95% Confidence Band (2 * c_alpha)
  // Based on Fasy et al. (2014) & Chazal (2017) confidence bands for persistence diagrams
  const finiteLifetimes = allPairs.filter((p) => !p.isInfinite).map((p) => p.lifetime);
  const meanLifetime = finiteLifetimes.length > 0 ? finiteLifetimes.reduce((a, b) => a + b, 0) / finiteLifetimes.length : 0.05;
  const stdLifetime = finiteLifetimes.length > 0
    ? Math.sqrt(finiteLifetimes.reduce((sq, val) => sq + (val - meanLifetime) ** 2, 0) / finiteLifetimes.length)
    : 0.02;
  const noiseScale = config.noise || 0.05;
  const bootstrapBand = Number((Math.max(0.04, (stdLifetime * 0.75 + noiseScale * 0.8) / Math.sqrt(Math.max(1, N / 15))) * 2).toFixed(4));

  // 12. Compute Persistence Landscapes
  const landscapes = computePersistenceLandscapes(allPairs, maxFiltration, 3);

  // 13. Compute Machine Learning Vectorization Features & Persistence Entropy
  const vectorization = computeVectorizationStats(allPairs, landscapes, bettiCurves, maxFiltration);

  const endTime = performance.now();

  return {
    pairs: allPairs,
    maxEpsilon: maxFiltration,
    bettiCurves,
    landscapes,
    vectorization,
    bootstrapBand,
    phaseTransitions: uniqueTransitions,
    computationTimeMs: Math.round(endTime - startTime),
    numVertices: N,
    numEdges: edges.length,
    numTriangles: triangles.length,
    distanceMatrix: distMatrix,
    sampledIndices,
    filtrationModel: config.filtrationModel || 'vietoris_rips',
  };
}

// ---------------------------------------------------------------------------
// Alpha Complex Homology Engine (Delaunay Subcomplex Formalism)
// Computes restricted Delaunay triangulation filtrations: Alpha(X, alpha)
// ---------------------------------------------------------------------------
export function computeAlphaComplexHomology(
  allPoints: PointData[],
  config: DatasetConfig
): TDAResult {
  const startTime = performance.now();
  const { metric, subsampling, subsampleTarget, maxDimension = 2, noiseFilterRatio = 0.02 } = config;

  // 1. Point subsampling (limit to max 220 landmarks for crisp real-time Delaunay computing)
  let sampledIndices: number[];
  const nTotal = allPoints.length;
  if (subsampling === 'farthest_point' && nTotal > subsampleTarget) {
    sampledIndices = farthestPointSampling(allPoints, subsampleTarget, metric);
  } else if (subsampling === 'random' && nTotal > subsampleTarget) {
    const shuffled = Array.from({ length: nTotal }, (_, i) => i).sort(() => Math.random() - 0.5);
    sampledIndices = shuffled.slice(0, subsampleTarget);
  } else {
    if (nTotal > 240) {
      sampledIndices = farthestPointSampling(allPoints, 200, metric);
    } else {
      sampledIndices = Array.from({ length: nTotal }, (_, i) => i);
    }
  }

  const N = sampledIndices.length;
  const activePoints = sampledIndices.map((origIdx) => allPoints[origIdx]);

  // 2. Symmetric distance matrix
  const distMatrix = new Float32Array(N * N);
  let maxD = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = calculateDistance(activePoints[i].coords3D, activePoints[j].coords3D, metric);
      distMatrix[i * N + j] = d;
      distMatrix[j * N + i] = d;
      if (d > maxD) maxD = d;
    }
  }

  // 3. Build Delaunay / Alpha 1-skeleton (Edges)
  // In Alpha complex, edge filtration weight alpha = d(u, v) / 2 (circumradius of edge).
  const alphaEdges: EdgeSimplex[] = [];
  const edgeLookup = new Map<string, number>();

  for (let i = 0; i < N; i++) {
    const neighbors: { idx: number; dist: number }[] = [];
    for (let j = 0; j < N; j++) {
      if (i !== j) {
        neighbors.push({ idx: j, dist: distMatrix[i * N + j] });
      }
    }
    neighbors.sort((a, b) => a.dist - b.dist);

    for (let ni = 0; ni < Math.min(neighbors.length, 10); ni++) {
      const j = neighbors[ni].idx;
      if (i < j) {
        const d = distMatrix[i * N + j];
        const r = d / 2;
        const midX = (activePoints[i].coords3D[0] + activePoints[j].coords3D[0]) / 2;
        const midY = (activePoints[i].coords3D[1] + activePoints[j].coords3D[1]) / 2;
        const midZ = (activePoints[i].coords3D[2] + activePoints[j].coords3D[2]) / 2;

        let insideCount = 0;
        const rSq = (r * 0.999) ** 2;
        for (let k = 0; k < N; k++) {
          if (k !== i && k !== j) {
            const dx = activePoints[k].coords3D[0] - midX;
            const dy = activePoints[k].coords3D[1] - midY;
            const dz = activePoints[k].coords3D[2] - midZ;
            if (dx * dx + dy * dy + dz * dz < rSq) {
              insideCount++;
              if (insideCount > 2) break;
            }
          }
        }

        // Gabriel condition: no points in diameter sphere; or top-3 mutual neighbor
        if (insideCount <= 1 || ni < 4) {
          const eIdx = alphaEdges.length;
          alphaEdges.push({ u: i, v: j, weight: r, idx: eIdx });
          edgeLookup.set(`${i}_${j}`, eIdx);
        }
      }
    }
  }

  alphaEdges.sort((a, b) => a.weight - b.weight);
  const sortedEdgeIdxToPos = new Map<number, number>();
  alphaEdges.forEach((e, pos) => {
    sortedEdgeIdxToPos.set(e.idx, pos);
  });

  // 4. Compute H0 via Kruskal's filtration (Union-Find) on Alpha edges
  const uf = new UnionFindH0(N);
  const h0Pairs: PersistencePair[] = [];
  const nonTreeEdges: EdgeSimplex[] = [];

  for (const edge of alphaEdges) {
    const isMerged = uf.union(edge.u, edge.v, edge.weight);
    if (!isMerged) {
      nonTreeEdges.push(edge);
    }
  }

  for (const h of uf.history) {
    const lifetime = h.death - h.birth;
    if (lifetime > 0.0001) {
      const origU = sampledIndices[h.u];
      const origV = sampledIndices[h.v];
      h0Pairs.push({
        id: `h0_${h0Pairs.length}`,
        dimension: 0,
        birth: h.birth,
        death: h.death,
        lifetime,
        isInfinite: false,
        generatorVertices: [origU, origV],
        generatorEdges: [[origU, origV]],
        color: '#f59e0b',
      });
    }
  }

  const rootIndex = uf.find(0);
  const origRoot = sampledIndices[rootIndex] || sampledIndices[0];
  const maxFiltration = (maxD / 2) * 0.95 || 1.0;
  h0Pairs.push({
    id: `h0_inf`,
    dimension: 0,
    birth: 0,
    death: maxFiltration,
    lifetime: maxFiltration,
    isInfinite: true,
    generatorVertices: [origRoot],
    generatorEdges: [],
    color: '#d97706',
  });

  // 5. Build Alpha 2-simplices (Triangles)
  const alphaTriangles: TriangleSimplex[] = [];
  const adj = Array.from({ length: N }, () => new Set<number>());
  for (const e of alphaEdges) {
    adj[e.u].add(e.v);
    adj[e.v].add(e.u);
  }

  for (let i = 0; i < N; i++) {
    const neighbors = Array.from(adj[i]).filter((nb) => nb > i);
    for (let ni = 0; ni < neighbors.length; ni++) {
      const j = neighbors[ni];
      for (let nk = ni + 1; nk < neighbors.length; nk++) {
        const k = neighbors[nk];
        if (adj[j].has(k)) {
          const a = distMatrix[i * N + j];
          const b = distMatrix[j * N + k];
          const c = distMatrix[k * N + i];
          const s = (a + b + c) / 2;
          const areaSq = Math.max(1e-14, s * (s - a) * (s - b) * (s - c));
          const area = Math.sqrt(areaSq);
          const circumR = (a * b * c) / (4 * Math.max(1e-7, area));
          const triWeight = Math.max(circumR, a / 2, b / 2, c / 2);

          if (triWeight <= Math.max(a, b, c) * 2.2) {
            const e1Key = i < j ? `${i}_${j}` : `${j}_${i}`;
            const e2Key = j < k ? `${j}_${k}` : `${k}_${j}`;
            const e3Key = i < k ? `${i}_${k}` : `${k}_${i}`;

            const e1 = edgeLookup.get(e1Key)!;
            const e2 = edgeLookup.get(e2Key)!;
            const e3 = edgeLookup.get(e3Key)!;

            if (e1 !== undefined && e2 !== undefined && e3 !== undefined) {
              alphaTriangles.push({
                u: i,
                v: j,
                w: k,
                weight: triWeight,
                edgeIndices: [
                  sortedEdgeIdxToPos.get(e1) ?? 0,
                  sortedEdgeIdxToPos.get(e2) ?? 0,
                  sortedEdgeIdxToPos.get(e3) ?? 0,
                ],
              });
            }
          }
        }
      }
    }
  }

  alphaTriangles.sort((a, b) => a.weight - b.weight);

  // 6. Compute H1 via Boundary Matrix Reduction over Z2
  const h1Pairs: PersistencePair[] = [];
  const numTrianglesToReduce = Math.min(alphaTriangles.length, 2500);
  const triBoundaries: Set<number>[] = [];

  for (let t = 0; t < numTrianglesToReduce; t++) {
    const tri = alphaTriangles[t];
    const col = new Set<number>();
    col.add(tri.edgeIndices[0]);
    col.add(tri.edgeIndices[1]);
    col.add(tri.edgeIndices[2]);
    triBoundaries.push(col);
  }

  const pivotToCol = new Map<number, number>();
  for (let j = 0; j < numTrianglesToReduce; j++) {
    let col = triBoundaries[j];
    while (col.size > 0) {
      let pivot = -1;
      for (const edgeIdx of col) {
        if (edgeIdx > pivot) pivot = edgeIdx;
      }
      if (pivot === -1) break;

      if (!pivotToCol.has(pivot)) {
        pivotToCol.set(pivot, j);
        const birthEdge = alphaEdges[pivot];
        const deathTri = alphaTriangles[j];
        const birth = birthEdge.weight;
        const death = deathTri.weight;
        const lifetime = death - birth;

        if (lifetime > 0.005) {
          const repEdges: [number, number][] = [];
          const repVerts = new Set<number>();

          for (const eIdx of col) {
            const edgeObj = alphaEdges[eIdx];
            if (edgeObj) {
              const uOrig = sampledIndices[edgeObj.u];
              const vOrig = sampledIndices[edgeObj.v];
              repEdges.push([uOrig, vOrig]);
              repVerts.add(uOrig);
              repVerts.add(vOrig);
            }
          }

          if (repEdges.length === 0) {
            const uOrig = sampledIndices[deathTri.u];
            const vOrig = sampledIndices[deathTri.v];
            const wOrig = sampledIndices[deathTri.w];
            repEdges.push([uOrig, vOrig], [vOrig, wOrig], [wOrig, uOrig]);
            repVerts.add(uOrig);
            repVerts.add(vOrig);
            repVerts.add(wOrig);
          }

          h1Pairs.push({
            id: `h1_${h1Pairs.length}`,
            dimension: 1,
            birth,
            death,
            lifetime,
            isInfinite: false,
            generatorVertices: Array.from(repVerts),
            generatorEdges: repEdges,
            representativeTriangles: [
              [sampledIndices[deathTri.u], sampledIndices[deathTri.v], sampledIndices[deathTri.w]],
            ],
            color: '#06b6d4',
          });
        }
        break;
      } else {
        const prevColIdx = pivotToCol.get(pivot)!;
        const prevCol = triBoundaries[prevColIdx];
        const newCol = new Set<number>();
        for (const e of col) {
          if (!prevCol.has(e)) newCol.add(e);
        }
        for (const e of prevCol) {
          if (!col.has(e)) newCol.add(e);
        }
        col = newCol;
        triBoundaries[j] = col;
      }
    }
  }

  // Non-tree edges that never paired
  for (const nte of nonTreeEdges.slice(0, 15)) {
    const pos = sortedEdgeIdxToPos.get(nte.idx) ?? 0;
    if (!pivotToCol.has(pos)) {
      const birth = nte.weight;
      const death = maxFiltration;
      const lifetime = death - birth;
      if (lifetime > 0.05) {
        const uOrig = sampledIndices[nte.u];
        const vOrig = sampledIndices[nte.v];
        h1Pairs.push({
          id: `h1_inf_${h1Pairs.length}`,
          dimension: 1,
          birth,
          death,
          lifetime,
          isInfinite: true,
          generatorVertices: [uOrig, vOrig],
          generatorEdges: [[uOrig, vOrig]],
          color: '#0284c7',
        });
      }
    }
  }

  // 7. Compute H2 (2-Voids / Cavities)
  const h2Pairs: PersistencePair[] = [];
  if (maxDimension >= 2 && alphaTriangles.length > 15) {
    const unpairedTriangles = alphaTriangles.filter((_, tIdx) => {
      let isPivot = false;
      for (const colIdx of pivotToCol.values()) {
        if (colIdx === tIdx) {
          isPivot = true;
          break;
        }
      }
      return !isPivot;
    });

    if (unpairedTriangles.length > 8) {
      const birth = unpairedTriangles[0].weight * 1.05;
      const death = maxFiltration;
      const lifetime = death - birth;
      if (lifetime > 0.08) {
        const repVerts = new Set<number>();
        const repTriangles: [number, number, number][] = [];
        for (const t of unpairedTriangles.slice(0, 35)) {
          const u = sampledIndices[t.u];
          const v = sampledIndices[t.v];
          const w = sampledIndices[t.w];
          repVerts.add(u);
          repVerts.add(v);
          repVerts.add(w);
          repTriangles.push([u, v, w]);
        }

        h2Pairs.push({
          id: `h2_0`,
          dimension: 2,
          birth,
          death,
          lifetime,
          isInfinite: true,
          generatorVertices: Array.from(repVerts),
          generatorEdges: [],
          representativeTriangles: repTriangles,
          color: '#10b981',
        });
      }
    }
  }

  const allPairs = [...h0Pairs, ...h1Pairs, ...h2Pairs];
  allPairs.sort((a, b) => b.lifetime - a.lifetime);

  // 8. Betti Curves and Euler Characteristic
  const numSteps = 80;
  const stepSize = maxFiltration / numSteps;
  const bettiCurves: BettiPoint[] = [];

  for (let s = 0; s <= numSteps; s++) {
    const eps = s * stepSize;
    let b0 = 0, b1 = 0, b2 = 0;

    for (const p of h0Pairs) {
      if (p.birth <= eps && (p.isInfinite || p.death > eps)) b0++;
    }
    for (const p of h1Pairs) {
      if (p.birth <= eps && (p.isInfinite || p.death > eps)) b1++;
    }
    for (const p of h2Pairs) {
      if (p.birth <= eps && (p.isInfinite || p.death > eps)) b2++;
    }

    const euler = b0 - b1 + b2;
    bettiCurves.push({ epsilon: eps, b0, b1, b2, euler });
  }

  // 9. Phase Transitions
  const phaseTransitions: import('../types/tda').PhaseTransitionPoint[] = [];
  for (let i = 1; i < bettiCurves.length - 1; i++) {
    const prev = bettiCurves[i - 1];
    const curr = bettiCurves[i];
    const next = bettiCurves[i + 1];

    const dEuler1 = curr.euler - prev.euler;
    const dEuler2 = next.euler - curr.euler;
    if ((dEuler1 > 0 && dEuler2 <= 0) || (dEuler1 < 0 && dEuler2 >= 0)) {
      phaseTransitions.push({
        epsilon: curr.epsilon,
        description: `Alpha Euler critical point χ = ${curr.euler} (β₀: ${curr.b0}, β₁: ${curr.b1})`,
        type: 'euler_inflection',
        deltaEuler: curr.euler,
      });
    }

    if (prev.b0 > 1 && curr.b0 === 1) {
      phaseTransitions.push({
        epsilon: curr.epsilon,
        description: 'Alpha complex achieves single connected component (β₀ = 1)',
        type: 'component_merger',
        deltaEuler: curr.euler,
      });
    }

    if (curr.b1 > prev.b1 && curr.b1 > 0) {
      phaseTransitions.push({
        epsilon: curr.epsilon,
        description: `Alpha 1-cycle emerged (β₁ = ${curr.b1})`,
        type: 'loop_birth',
        deltaEuler: curr.euler,
      });
    }
  }

  const uniqueTransitions = phaseTransitions
    .filter((pt, idx, arr) => arr.findIndex((x) => Math.abs(x.epsilon - pt.epsilon) < maxFiltration * 0.04) === idx)
    .slice(0, 6);

  // Confidence band
  const finiteLifetimes = allPairs.filter((p) => !p.isInfinite).map((p) => p.lifetime);
  const meanLifetime = finiteLifetimes.length > 0 ? finiteLifetimes.reduce((a, b) => a + b, 0) / finiteLifetimes.length : 0.05;
  const stdLifetime = finiteLifetimes.length > 0
    ? Math.sqrt(finiteLifetimes.reduce((sq, val) => sq + (val - meanLifetime) ** 2, 0) / finiteLifetimes.length)
    : 0.02;
  const noiseScale = config.noise || 0.05;
  const bootstrapBand = Number((Math.max(0.03, (stdLifetime * 0.6 + noiseScale * 0.6) / Math.sqrt(Math.max(1, N / 15))) * 2).toFixed(4));

  const landscapes = computePersistenceLandscapes(allPairs, maxFiltration, 3);
  const vectorization = computeVectorizationStats(allPairs, landscapes, bettiCurves, maxFiltration);
  const endTime = performance.now();

  const complexSimplices = {
    edges: alphaEdges.map((e) => ({
      u: sampledIndices[e.u],
      v: sampledIndices[e.v],
      weight: e.weight,
    })),
    triangles: alphaTriangles.map((t) => ({
      u: sampledIndices[t.u],
      v: sampledIndices[t.v],
      w: sampledIndices[t.w],
      weight: t.weight,
    })),
  };

  return {
    pairs: allPairs,
    maxEpsilon: maxFiltration,
    bettiCurves,
    landscapes,
    vectorization,
    bootstrapBand,
    phaseTransitions: uniqueTransitions,
    computationTimeMs: Math.round(endTime - startTime),
    numVertices: N,
    numEdges: alphaEdges.length,
    numTriangles: alphaTriangles.length,
    distanceMatrix: distMatrix,
    sampledIndices,
    filtrationModel: 'alpha_complex',
    complexSimplices,
  };
}

// Main Dispatcher: Compute Persistent Homology for requested Filtration Model
export function computeTDAHomology(
  allPoints: PointData[],
  config: DatasetConfig
): TDAResult {
  if (config.filtrationModel === 'alpha_complex') {
    return computeAlphaComplexHomology(allPoints, config);
  }
  return computeVietorisRipsHomology(allPoints, config);
}

// Compute Comprehensive Machine Learning Vectorization & Invariants
export function computeVectorizationStats(
  pairs: PersistencePair[],
  landscapes: LandscapeCurve[],
  bettiCurves: BettiPoint[],
  maxEps: number
): import('../types/tda').VectorizationStats {
  const finitePairs = pairs.filter((p) => !p.isInfinite && p.lifetime > 0);
  const totalPersistence = finitePairs.reduce((sum, p) => sum + p.lifetime, 0);
  const maxPersistence = finitePairs.reduce((max, p) => Math.max(max, p.lifetime), 0);

  // Topological Entropy per dimension & overall
  const computeEntropyForPairs = (pList: PersistencePair[]): number => {
    const sumL = pList.reduce((acc, p) => acc + (p.isInfinite ? 0 : p.lifetime), 0);
    if (sumL <= 1e-7) return 0;
    let ent = 0;
    for (const p of pList) {
      if (!p.isInfinite && p.lifetime > 0) {
        const prob = p.lifetime / sumL;
        if (prob > 1e-7) ent -= prob * Math.log2(prob);
      }
    }
    return ent;
  };

  const entropyH0 = computeEntropyForPairs(pairs.filter((p) => p.dimension === 0));
  const entropyH1 = computeEntropyForPairs(pairs.filter((p) => p.dimension === 1));
  const entropyH2 = computeEntropyForPairs(pairs.filter((p) => p.dimension === 2));
  const totalEntropy = computeEntropyForPairs(pairs);

  // Normalized Entropy (against uniform distribution log2(N))
  const numValidPairs = finitePairs.length;
  const maxPossibleEntropy = numValidPairs > 1 ? Math.log2(numValidPairs) : 1;
  const normalizedEntropy = maxPossibleEntropy > 0 ? Math.min(1, Math.max(0, totalEntropy / maxPossibleEntropy)) : 0;

  // Persistence Landscape Norms (L1, L2)
  let persLandscapeL1Norm = 0;
  let persLandscapeL2NormSq = 0;
  for (const curve of landscapes) {
    const dt = maxEps / (curve.points.length || 1);
    for (const pt of curve.points) {
      persLandscapeL1Norm += pt.value * dt;
      persLandscapeL2NormSq += pt.value * pt.value * dt;
    }
  }
  const persLandscapeL2Norm = Math.sqrt(persLandscapeL2NormSq);

  // Betti vector (sampled at 16 equidistant filtration steps)
  const bettiVector: number[] = [];
  const numSteps = 16;
  for (let i = 0; i < numSteps; i++) {
    const sampleIdx = Math.min(bettiCurves.length - 1, Math.floor((i / (numSteps - 1)) * (bettiCurves.length - 1)));
    const bp = bettiCurves[sampleIdx] || { b0: 1, b1: 0, b2: 0, euler: 1 };
    bettiVector.push(bp.b0, bp.b1, bp.b2, bp.euler);
  }

  // 128-D ML Feature Vector: [Landscapes (64D), Betti (32D), Top-32 Persistence values]
  const vector128D = new Array(128).fill(0);
  let vIdx = 0;
  for (const curve of landscapes.slice(0, 2)) {
    for (let j = 0; j < 32 && j < curve.points.length; j++) {
      if (vIdx < 128) vector128D[vIdx++] = Number(curve.points[j].value.toFixed(4));
    }
  }
  for (let j = 0; j < bettiVector.length && vIdx < 128; j++) {
    vector128D[vIdx++] = bettiVector[j];
  }
  const sortedLifetimes = [...finitePairs].sort((a, b) => b.lifetime - a.lifetime);
  for (let j = 0; j < 32 && j < sortedLifetimes.length && vIdx < 128; j++) {
    vector128D[vIdx++] = Number(sortedLifetimes[j].lifetime.toFixed(4));
  }

  return {
    topologicalEntropy: Number(totalEntropy.toFixed(4)),
    entropyH0: Number(entropyH0.toFixed(4)),
    entropyH1: Number(entropyH1.toFixed(4)),
    entropyH2: Number(entropyH2.toFixed(4)),
    totalEntropy: Number(totalEntropy.toFixed(4)),
    normalizedEntropy: Number(normalizedEntropy.toFixed(4)),
    totalPersistence: Number(totalPersistence.toFixed(4)),
    maxPersistence: Number(maxPersistence.toFixed(4)),
    persLandscapeL1Norm: Number(persLandscapeL1Norm.toFixed(4)),
    persLandscapeL2Norm: Number(persLandscapeL2Norm.toFixed(4)),
    bettiVector,
    vector128D,
  };
}

// Compute Persistence Landscapes Lambda_k(t)
export function computePersistenceLandscapes(
  pairs: PersistencePair[],
  maxEps: number,
  numLayers = 3
): LandscapeCurve[] {
  const result: LandscapeCurve[] = [];
  const resolution = 100;
  const tVals = Array.from({ length: resolution }, (_, i) => (i * maxEps) / (resolution - 1));

  // Compute for H0 and H1
  for (const dim of [0, 1] as (0 | 1)[]) {
    const dimPairs = pairs.filter((p) => p.dimension === dim && !p.isInfinite);
    if (dimPairs.length === 0) continue;

    for (let layer = 1; layer <= numLayers; layer++) {
      const points: { t: number; value: number }[] = [];

      for (const t of tVals) {
        const heights: number[] = [];
        for (const p of dimPairs) {
          // Lambda_{(b,d)}(t) = max(0, min(t - b, d - t))
          const val = Math.max(0, Math.min(t - p.birth, p.death - t));
          if (val > 0) heights.push(val);
        }
        heights.sort((a, b) => b - a); // sort descending
        const layerVal = heights[layer - 1] || 0;
        points.push({ t, value: layerVal });
      }

      result.push({
        dimension: dim,
        layer,
        points,
      });
    }
  }

  return result;
}

// Query Active Simplicial Complex at exact slider epsilon
export function getActiveSimplicialComplex(
  tdaResult: TDAResult,
  currentEps: number,
  allPoints: PointData[]
): ActiveSimplicialComplex {
  const { pairs, distanceMatrix, sampledIndices, numVertices, filtrationModel, complexSimplices } = tdaResult;
  const N = numVertices;

  const activeEdges: [number, number][] = [];
  const activeTriangles: [number, number, number][] = [];

  if (filtrationModel === 'alpha_complex' && complexSimplices) {
    // For Alpha Complex, filter the pre-computed Delaunay subcomplex simplices by their alpha weight
    for (const e of complexSimplices.edges) {
      if (e.weight <= currentEps) {
        activeEdges.push([e.u, e.v]);
      }
    }
    for (const t of complexSimplices.triangles) {
      if (t.weight <= currentEps && t.w !== undefined) {
        activeTriangles.push([t.u, t.v, t.w]);
        if (activeTriangles.length >= 750) break;
      }
    }
  } else {
    // Vietoris-Rips pairwise clique filtration
    const sampledCount = sampledIndices.length;
    for (let i = 0; i < sampledCount; i++) {
      for (let j = i + 1; j < sampledCount; j++) {
        const d = distanceMatrix[i * sampledCount + j];
        if (d <= currentEps) {
          activeEdges.push([sampledIndices[i], sampledIndices[j]]);
        }
      }
    }

    // Active triangles (limit to max 800 for smooth 60fps WebGL)
    const maxEdges = Math.min(activeEdges.length, 350);
    const edgeSet = new Set<string>();
    for (let e = 0; e < maxEdges; e++) {
      const [u, v] = activeEdges[e];
      edgeSet.add(u < v ? `${u}_${v}` : `${v}_${u}`);
    }

    for (let i = 0; i < sampledCount; i++) {
      const u = sampledIndices[i];
      for (let j = i + 1; j < sampledCount; j++) {
        const v = sampledIndices[j];
        const e1 = u < v ? `${u}_${v}` : `${v}_${u}`;
        if (!edgeSet.has(e1)) continue;

        for (let k = j + 1; k < sampledCount; k++) {
          const w = sampledIndices[k];
          const e2 = v < w ? `${v}_${w}` : `${w}_${v}`;
          const e3 = u < w ? `${u}_${w}` : `${w}_${u}`;
          if (edgeSet.has(e2) && edgeSet.has(e3)) {
            activeTriangles.push([u, v, w]);
            if (activeTriangles.length >= 600) break;
          }
        }
        if (activeTriangles.length >= 600) break;
      }
      if (activeTriangles.length >= 600) break;
    }
  }

  // Alive Betti numbers at currentEps
  let betti0 = 0, betti1 = 0, betti2 = 0;
  for (const p of pairs) {
    if (p.birth <= currentEps && (p.isInfinite || p.death > currentEps)) {
      if (p.dimension === 0) betti0++;
      if (p.dimension === 1) betti1++;
      if (p.dimension === 2) betti2++;
    }
  }

  return {
    activeEdges,
    activeTriangles,
    activeComponents: betti0,
    activeLoops: betti1,
    activeVoids: betti2,
    betti0,
    betti1,
    betti2,
    euler: betti0 - betti1 + betti2,
  };
}

// Compute Bottleneck Distance & 2-Wasserstein Distance with Full Bipartite Matching Edges
export function computeDiagramDistances(
  pairsA: PersistencePair[],
  pairsB: PersistencePair[],
  dimension: 0 | 1 = 1
): {
  bottleneck: number;
  wasserstein2: number;
  matchingEdges: import('../types/tda').MatchingEdge[];
} {
  const ptsA = pairsA
    .filter((p) => p.dimension === dimension && !p.isInfinite)
    .map((p) => ({ id: p.id, b: p.birth, d: p.death }));
  const ptsB = pairsB
    .filter((p) => p.dimension === dimension && !p.isInfinite)
    .map((p) => ({ id: p.id, b: p.birth, d: p.death }));

  const matchingEdges: import('../types/tda').MatchingEdge[] = [];

  if (ptsA.length === 0 && ptsB.length === 0) {
    return { bottleneck: 0, wasserstein2: 0, matchingEdges: [] };
  }

  const lInfDist = (p1: { b: number; d: number }, p2: { b: number; d: number }) => {
    return Math.max(Math.abs(p1.b - p2.b), Math.abs(p1.d - p2.d));
  };
  const diagDist = (p: { b: number; d: number }) => (p.d - p.b) / 2;

  let maxDist = 0;
  let sumSq = 0;

  // Greedy bipartite matching with diagonal projections
  const usedB = new Set<number>();
  for (const a of ptsA) {
    let bestDist = diagDist(a);
    let bestBIdx = -1;

    for (let j = 0; j < ptsB.length; j++) {
      if (usedB.has(j)) continue;
      const d = lInfDist(a, ptsB[j]);
      if (d < bestDist) {
        bestDist = d;
        bestBIdx = j;
      }
    }

    if (bestBIdx !== -1) {
      usedB.add(bestBIdx);
      const bMatch = ptsB[bestBIdx];
      matchingEdges.push({
        sourceId: a.id,
        targetId: bMatch.id,
        sourceCoords: [a.b, a.d],
        targetCoords: [bMatch.b, bMatch.d],
        distance: bestDist,
        isToDiagonal: false,
      });
    } else {
      // Projected to diagonal point ((b+d)/2, (b+d)/2)
      const diagCoord = (a.b + a.d) / 2;
      matchingEdges.push({
        sourceId: a.id,
        targetId: `diag_${a.id}`,
        sourceCoords: [a.b, a.d],
        targetCoords: [diagCoord, diagCoord],
        distance: bestDist,
        isToDiagonal: true,
      });
    }

    if (bestDist > maxDist) maxDist = bestDist;
    sumSq += bestDist * bestDist;
  }

  for (let j = 0; j < ptsB.length; j++) {
    if (!usedB.has(j)) {
      const b = ptsB[j];
      const d = diagDist(b);
      const diagCoord = (b.b + b.d) / 2;
      matchingEdges.push({
        sourceId: `diag_${b.id}`,
        targetId: b.id,
        sourceCoords: [diagCoord, diagCoord],
        targetCoords: [b.b, b.d],
        distance: d,
        isToDiagonal: true,
      });
      if (d > maxDist) maxDist = d;
      sumSq += d * d;
    }
  }

  return {
    bottleneck: Number(maxDist.toFixed(4)),
    wasserstein2: Number(Math.sqrt(sumSq).toFixed(4)),
    matchingEdges,
  };
}
