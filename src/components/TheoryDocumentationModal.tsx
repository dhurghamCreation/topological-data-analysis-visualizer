/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookOpen, Sigma, Code2, ShieldCheck, Cpu, Copy, Check, Gamepad2 } from 'lucide-react';

interface TheoryDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMinigame?: () => void;
}

export const TheoryDocumentationModal: React.FC<TheoryDocumentationModalProps> = ({
  isOpen,
  onClose,
  onOpenMinigame,
}) => {
  const [activeTab, setActiveTab] = useState<'foundations' | 'filtrations' | 'reduction' | 'stability' | 'python'>('foundations');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const pythonSnippet = `# Python TDA Analysis with Ripser & Gudhi
import numpy as np
from ripser import ripser
from persim import plot_diagrams, bottleneck
import matplotlib.pyplot as plt

# 1. Load or generate 3D point cloud
# For example, sample a noisy Torus:
num_points = 500
R, r = 2.0, 0.8
u = np.random.uniform(0, 2*np.pi, num_points)
v = np.random.uniform(0, 2*np.pi, num_points)
x = (R + r * np.cos(v)) * np.cos(u) + np.random.normal(0, 0.05, num_points)
y = (R + r * np.cos(v)) * np.sin(u) + np.random.normal(0, 0.05, num_points)
z = r * np.sin(v) + np.random.normal(0, 0.05, num_points)
data = np.column_stack([x, y, z])

# 2. Compute Vietoris-Rips Persistent Homology up to dimension 2
dgms = ripser(data, maxdim=2)['dgms']

# 3. Plot Persistence Diagrams (H0, H1, H2)
plt.figure(figsize=(7, 7))
plot_diagrams(dgms, show=True, title="TDA Persistence Diagram")

# 4. Extract Betti Numbers:
print(f"Number of H1 persistent loops: {len(dgms[1])}")
print(f"Number of H2 persistent voids: {len(dgms[2])}")
`;

  const copyPython = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border"
        style={{
          backgroundColor: 'var(--realtime-card)',
          borderColor: 'var(--radix-border)',
          color: 'var(--realtime-text)',
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--realtime-secondary)',
            borderColor: 'var(--radix-border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5" style={{ color: 'var(--realtime-accent)' }} />
            <div>
              <h2 className="text-base font-bold tracking-wide" style={{ color: 'var(--realtime-text)' }}>
                Topological Data Analysis (TDA) Theory & Mathematical Foundations
              </h2>
              <p className="text-xs opacity-80">
                Formal definitions, homology chain complexes, boundary matrix reduction, and stability theorems.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenMinigame && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMinigame();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition border shadow-sm"
                style={{
                  backgroundColor: 'var(--realtime-elevated)',
                  borderColor: 'var(--realtime-accent)',
                  color: 'var(--realtime-accent)',
                }}
                title="Switch to Topology Minigames"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Play Minigames</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex items-center gap-2 px-6 py-2 border-b text-xs font-medium overflow-x-auto"
          style={{
            backgroundColor: 'var(--realtime-background)',
            borderColor: 'var(--radix-border)',
          }}
        >
          {[
            { id: 'foundations', label: '1. Algebraic Topology & Homology' },
            { id: 'filtrations', label: '2. Vietoris-Rips vs Čech' },
            { id: 'reduction', label: '3. Boundary Matrix Reduction (ℤ₂)' },
            { id: 'stability', label: '4. Stability & Distances' },
            { id: 'python', label: '5. Python (Ripser/Gudhi) Export' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-mono ${
                activeTab === tab.id
                  ? 'font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              style={
                activeTab === tab.id
                  ? {
                      backgroundColor: 'var(--realtime-primary)',
                      color: '#ffffff',
                    }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          {activeTab === 'foundations' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sigma className="w-4 h-4 text-cyan-400" />
                Simplicial Complexes and Homology Groups
              </h3>
              <p>
                Let <span className="font-mono text-cyan-300">X = {'{x_1, \\dots, x_N}'}</span> be a discrete finite point cloud in Euclidean metric space <span className="font-mono text-cyan-300">(ℝᵈ, d)</span>. Topological Data Analysis infers coordinate-free topological invariants (connected components, loops, cavities) invariant under continuous deformations (homeomorphisms).
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-cyan-400 font-bold">Mathematical Chain Complex:</div>
                <div className="text-slate-200 pl-2 border-l-2 border-cyan-500">
                  ⋯ → C_{'{k+1}'} {'--∂_{k+1}-->'} C_k {'--∂_k-->'} C_{'{k-1}'} → ⋯ → C_0 {'--∂_0-->'} 0
                </div>
                <p className="text-slate-400 font-sans text-xs">
                  Where <span className="font-mono text-slate-200">C_k(K; ℤ₂)</span> is the vector space spanned by all <span className="font-mono">k</span>-simplices (vertices, edges, triangles, tetrahedra).
                </p>
                <div className="text-amber-400 font-bold">Boundary Operator ∂_k:</div>
                <div className="text-slate-200 pl-2 border-l-2 border-amber-500">
                  ∂_k([v_0, v_1, ..., v_k]) = ∑_{'{i=0}'}^k (-1)^i [v_0, ..., v̂_i, ..., v_k]
                </div>
                <p className="text-slate-400 font-sans text-xs">
                  The fundamental lemma of algebraic topology states that <span className="font-mono text-white font-bold">∂_k ∘ ∂_{'{k+1}'} = 0</span>, meaning <span className="font-mono text-cyan-300">im(∂_{'{k+1}'}) ⊆ ker(∂_k)</span>.
                </p>
              </div>

              <h4 className="text-sm font-bold text-white pt-2">The k-th Homology Group & Betti Numbers:</h4>
              <p>
                The k-th homology group is defined as the quotient space:
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 text-center">
                H_k(K; ℤ₂) = ker(∂_k) / im(∂_{'{k+1}'}) = Z_k / B_k
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
                <li><strong className="text-amber-300">β₀ = dim(H₀)</strong>: Number of connected components.</li>
                <li><strong className="text-cyan-300">β₁ = dim(H₁)</strong>: Number of 1-dimensional tunnels, handles, or independent loops.</li>
                <li><strong className="text-emerald-300">β₂ = dim(H₂)</strong>: Number of 2-dimensional enclosed voids or cavities.</li>
                <li><strong className="text-purple-300">Euler Characteristic</strong>: χ = β₀ - β₁ + β₂ = V - E + F.</li>
              </ul>
            </div>
          )}

          {activeTab === 'filtrations' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Vietoris-Rips and Čech Filtrations
              </h3>
              <p>
                Because point clouds alone have trivial discrete topology, we build a parameterized multiscale sequence of nested simplicial complexes called a <strong>filtration</strong>:
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 text-center">
                ∅ = K_0 ⊆ K_{'{ε_1}'} ⊆ K_{'{ε_2}'} ⊆ ⋯ ⊆ K_{'{ε_max}'} = K
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-cyan-400 text-sm">Vietoris-Rips Complex VR(X, ε)</h4>
                  <p className="text-xs text-slate-300">
                    A simplex <span className="font-mono">σ = [x_0, ..., x_k]</span> is included in <span className="font-mono">VR(X, ε)</span> if and only if all pairwise distances satisfy:
                  </p>
                  <div className="font-mono text-xs text-white bg-slate-900 p-2 rounded">
                    ∀ i, j : d(x_i, x_j) ≤ ε
                  </div>
                  <p className="text-xs text-slate-400">
                    <strong>Advantage:</strong> Fast combinatorial clique complex computation determined solely by pairwise edge distances.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-emerald-400 text-sm">Čech Complex Č(X, ε)</h4>
                  <p className="text-xs text-slate-300">
                    A simplex is in <span className="font-mono">Č(X, ε)</span> if balls of radius <span className="font-mono">ε/2</span> centered at all vertices have non-empty common intersection:
                  </p>
                  <div className="font-mono text-xs text-white bg-slate-900 p-2 rounded">
                    ⋂_{'{i=0}'}^k B_{'{ε/2}'}(x_i) ≠ ∅
                  </div>
                  <p className="text-xs text-slate-400">
                    <strong>Nerve Theorem:</strong> By the Leray Nerve Theorem, Č(X, ε) is homotopy equivalent to the union of balls ⋃ B_{'{ε/2}'}(x_i).
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
                <strong className="text-amber-400">Sandwich Interleaving Theorem:</strong> For any point cloud in Euclidean space, the Vietoris-Rips and Čech complexes interleave:
                <div className="font-mono text-cyan-300 mt-1">
                  Č(X, ε) ⊆ VR(X, 2ε) ⊆ Č(X, 2√2 ε)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reduction' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Boundary Matrix Reduction over Field ℤ₂
              </h3>
              <p>
                Persistent homology computes the birth time <span className="font-mono text-cyan-300">b_i</span> and death time <span className="font-mono text-amber-300">d_i</span> of topological cycles using Gaussian-like column reduction on the boundary matrix <span className="font-mono text-slate-200">D</span> over the two-element field <span className="font-mono text-white">ℤ₂ = {'{0, 1}'}</span>.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-cyan-400 font-bold">Standard Column Reduction Algorithm (Edelsbrunner et al.):</div>
                <pre className="text-slate-300 bg-slate-900 p-3 rounded-lg overflow-x-auto">
{`R = D; // Initialize reduced matrix
low = new Map(); // lowest 1 index in column

for j = 0 to num_simplices - 1:
  while low(j) != undefined and exists k < j with low(k) == low(j):
    R[:, j] = (R[:, j] + R[:, k]) mod 2; // Column addition in Z2
  
  if low(j) != undefined:
    // Simplex j destroys (kills) the cycle created by simplex low(j)
    birth = filtration_time(low(j));
    death = filtration_time(j);
    pairs.push( (birth, death) );`}
                </pre>
                <p className="text-slate-400 font-sans text-xs">
                  Unpaired simplices with <span className="font-mono">low(j) = undefined</span> generate <strong>essential homology classes</strong> with infinite persistence interval <span className="font-mono">[b_j, ∞)</span>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'stability' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Persistence Stability & Metric Distances
              </h3>
              <p>
                A vital theorem in modern data science is that persistence diagrams are mathematically stable against perturbations, outliers, and measurement noise.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-amber-400 font-bold">Bottleneck Distance d_B:</div>
                <div className="text-slate-200 pl-2 border-l-2 border-amber-500">
                  d_B(D_1, D_2) = inf_γ sup_{'{x ∈ D_1}'} ||x - γ(x)||_∞
                </div>
                <p className="text-slate-400 font-sans text-xs">
                  Where <span className="font-mono">γ</span> ranges over all bijections between diagrams <span className="font-mono">D_1</span> and <span className="font-mono">D_2</span> with diagonal points.
                </p>

                <div className="text-cyan-400 font-bold">Cohen-Steiner-Edelsbrunner-Harer Stability Theorem:</div>
                <div className="text-slate-200 pl-2 border-l-2 border-cyan-500 font-sans text-xs">
                  For tame functions <span className="font-mono">f, g: X → ℝ</span>, the bottleneck distance between their persistence diagrams is bounded by the supremum norm of their difference:
                  <div className="font-mono text-cyan-300 mt-1">
                    d_B(Dgm(f), Dgm(g)) ≤ ||f - g||_∞
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  Reproduce in Python (Ripser & Scikit-TDA)
                </h3>
                <button
                  onClick={copyPython}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-400">
                You can run this exact computation in Python using <span className="font-mono text-cyan-300">ripser</span>, <span className="font-mono text-cyan-300">persim</span>, and <span className="font-mono text-cyan-300">gudhi</span>:
              </p>

              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
                {pythonSnippet}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs"
          style={{
            backgroundColor: 'var(--realtime-secondary)',
            borderColor: 'var(--radix-border)',
            color: 'var(--realtime-text)',
          }}
        >
          <span className="opacity-80">Topological Data Analysis & Algebraic Topology Reference</span>
          <div className="flex items-center gap-2">
            {onOpenMinigame && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMinigame();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-mono font-semibold text-xs border"
                style={{
                  backgroundColor: 'var(--realtime-primary)',
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Launch Minigames</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg transition font-medium border"
              style={{
                backgroundColor: 'var(--realtime-elevated)',
                color: 'var(--realtime-text)',
                borderColor: 'var(--radix-border)',
              }}
            >
              Close Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
