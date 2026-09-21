/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Info,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { PersistencePair, PointData, TDAResult } from '../types/tda';

interface ExplainFeatureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pair: PersistencePair | null;
  tdaResult: TDAResult | null;
  points: PointData[];
  noiseThreshold: number;
}

export const ExplainFeatureDrawer: React.FC<ExplainFeatureDrawerProps> = ({
  isOpen,
  onClose,
  pair,
  tdaResult,
  points,
  noiseThreshold,
}) => {
  if (!isOpen) return null;

  if (!pair) {
    return (
      <div
        id="explain-drawer-backdrop"
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          id="explain-drawer-panel"
          className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl p-6 text-zinc-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-zinc-100">Mathematical Feature Inspector</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/40 rounded-lg transition group"
              title="Close Inspector"
            >
              <X className="w-4 h-4 group-hover:text-red-400" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium text-zinc-200">No Persistence Feature Selected</h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Click any point on the Persistence Diagram or any bar on the Barcode to inspect its homological significance and mathematical proof.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { dimension, birth, death, lifetime, isInfinite, generatorVertices, generatorEdges } = pair;
  const ratio = birth > 0.0001 ? death / birth : lifetime * 10;
  const isHighPersistence = isInfinite || lifetime > noiseThreshold * 2;
  const isNoise = !isInfinite && lifetime <= noiseThreshold;

  // Dimension titles and symbols
  const dimName = dimension === 0 ? 'Connected Component' : dimension === 1 ? '1D Loop / Tunnel' : '2D Void / Cavity';
  const dimSymbol = `H_${dimension}`;
  const dimBetti = `\\beta_${dimension}`;

  return (
    <div
      id="explain-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="explain-drawer-panel"
        className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Topological Feature Analysis
              </h2>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                <span>ID: {pair.id}</span>
                <span>•</span>
                <span className="text-cyan-300">Dimension {dimension} ({dimName})</span>
              </div>
            </div>
          </div>
          <button
            id="btn-close-explain-drawer"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/40 rounded-lg transition group"
            title="Close Inspector"
          >
            <X className="w-4 h-4 group-hover:text-red-400" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-zinc-300">
          {/* Signal Assessment Badge */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              isInfinite
                ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                : isHighPersistence
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}
          >
            {isInfinite ? (
              <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            ) : isHighPersistence ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-xs uppercase tracking-wider">
                {isInfinite
                  ? 'Essential Homology Class (Infinite Lifetime)'
                  : isHighPersistence
                  ? 'High-Confidence Geometric Invariant (True Signal)'
                  : 'Low-Persistence Filtration Fluctuation (Probable Noise)'}
              </div>
              <p className="text-xs mt-1 text-zinc-300 leading-relaxed">
                {isInfinite
                  ? 'This class never dies across all filtration scales. It establishes the global fundamental manifold topology.'
                  : isHighPersistence
                  ? `With persistence lifetime ${lifetime.toFixed(4)} (well above noise threshold ${noiseThreshold.toFixed(4)}), this feature reveals a robust non-contractible topological structure.`
                  : `With persistence lifetime ${lifetime.toFixed(4)}, this feature is close to the diagonal and likely represents local discretization artifacts or sampling jitter.`}
              </p>
            </div>
          </div>

          {/* Numerical Diagnostics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Birth (ε_b)</span>
              <div className="text-base font-bold font-mono text-white mt-0.5">{birth.toFixed(4)}</div>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Death (ε_d)</span>
              <div className="text-base font-bold font-mono text-white mt-0.5">
                {isInfinite ? '∞' : death.toFixed(4)}
              </div>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Lifetime (d - b)</span>
              <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                {lifetime.toFixed(4)}
              </div>
            </div>
          </div>

          {/* Mathematical Deep-Dive Explanation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Algebraic Topology Breakdown</span>
            </div>

            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3 text-xs leading-relaxed text-zinc-300">
              {dimension === 0 && (
                <>
                  <p>
                    <strong className="text-amber-400 font-mono">0-Dimensional Homology (H₀):</strong> Measures path-connected components. At filtration scale ε = {birth.toFixed(3)}, a distinct cluster of points initializes a new 0-cycle component in the Vietoris-Rips complex VR(X, ε).
                  </p>
                  <p>
                    {isInfinite ? (
                      <span>
                        This is the fundamental connected component that survives to infinity, representing the fact that the point cloud X is connected as ε → ∞.
                      </span>
                    ) : (
                      <span>
                        At ε = {death.toFixed(3)}, an edge of length d ≤ {death.toFixed(3)} bridges this component with an older cluster, triggering the boundary reduction rule (Elder Rule) where the younger component dies into the older one.
                      </span>
                    )}
                  </p>
                </>
              )}

              {dimension === 1 && (
                <>
                  <p>
                    <strong className="text-cyan-400 font-mono">1-Dimensional Homology (H₁):</strong> Detects 1-dimensional non-contractible loops (tunnels / vortices). At ε = {birth.toFixed(3)}, a closed cycle of {generatorEdges?.length || 'N'} edges forms such that ∂₁(c) = 0.
                  </p>
                  <p>
                    Because this cycle is not in the image of the 2-boundary operator im(∂₂), it represents a non-trivial homology class [c] ∈ H₁(X).
                  </p>
                  <p>
                    At ε = {death.toFixed(3)}, the interior void is completely filled with 2-simplices (triangles), creating a 2-chain whose boundary equals the cycle (∂₂(σ) = c), causing the homology class to vanish.
                  </p>
                </>
              )}

              {dimension === 2 && (
                <>
                  <p>
                    <strong className="text-emerald-400 font-mono">2-Dimensional Homology (H₂):</strong> Detects enclosed 2-dimensional cavities (volumetric voids / spherical cavities). At ε = {birth.toFixed(3)}, a hollow shell of triangles forms with zero boundary (∂₂ = 0).
                  </p>
                  <p>
                    At ε = {death.toFixed(3)}, 3-simplices (tetrahedra) fill the internal cavity, nullifying the H₂ generator.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Stability & Theoretical Guarantees */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Bottleneck Stability Theorem</span>
            </div>

            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs text-zinc-300">
              <div className="font-mono text-purple-300 bg-purple-950/40 p-2 rounded-lg border border-purple-800/40 text-[11px]">
                d_B(D(f), D(g)) \le \|f - g\|_\infty
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                By the Cohen-Steiner, Edelsbrunner, and Harer Stability Theorem, any perturbation of the underlying dataset coordinates by an amplitude $\delta$ cannot move this persistence point by more than $\delta$ in the $L_\infty$ diagram metric.
              </p>
            </div>
          </div>

          {/* Generator Simplex Geometry */}
          {generatorVertices && generatorVertices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Simplicial Generator Support</span>
              </div>

              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-400 font-mono">
                  <span>Cycle Vertices Count:</span>
                  <span className="text-white font-bold">{generatorVertices.length}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400 font-mono">
                  <span>Cycle Edges Count:</span>
                  <span className="text-white font-bold">{generatorEdges?.length || 0}</span>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">Participating Point IDs:</span>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto font-mono text-[10px]">
                    {generatorVertices.slice(0, 30).map((v) => (
                      <span key={v} className="bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-700">
                        p_{v}
                      </span>
                    ))}
                    {generatorVertices.length > 30 && (
                      <span className="text-zinc-500 self-center">+{generatorVertices.length - 30} more</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            Homology Engine • Dhurgham Alsaadi
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
