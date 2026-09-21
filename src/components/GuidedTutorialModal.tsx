/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Compass,
  Boxes,
  Clock,
  BarChart2,
  Volume2,
  BookOpen,
} from 'lucide-react';
import { playSoundFeedback } from '../utils/audioSonification';

interface GuidedTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge: string;
  content: string;
  mathNote?: string;
  keyPoints: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to TDA Studio',
    subtitle: 'Extracting Shape, Invariants & Topological Signal from Point Clouds',
    icon: <Compass className="w-6 h-6 text-cyan-400" />,
    badge: 'Step 1 of 5 • Overview',
    content:
      'Topological Data Analysis (TDA) is an algebraic method for discovering the multi-scale geometric shape of high-dimensional data, unaffected by continuous coordinate distortions, rotations, or metric scaling.',
    mathNote:
      'Homology groups H_k(X) classify k-dimensional topological features: H₀ represents connected clusters, H₁ represents non-contractible loops/tunnels, and H₂ represents enclosed volumetric cavities.',
    keyPoints: [
      'Coordinate-free and deformation-invariant representation',
      'Multi-scale continuous filtration replaces arbitrary distance thresholds',
      'Distinguishes true underlying geometric signal from statistical noise',
    ],
  },
  {
    title: '3D Manifold & Simplicial Complex',
    subtitle: 'Connecting Data Points into Higher-Dimensional Polyhedra',
    icon: <Boxes className="w-6 h-6 text-indigo-400" />,
    badge: 'Step 2 of 5 • Geometry',
    content:
      'Given a point cloud X, we grow metric balls of radius ε around each point. When balls intersect pairwise, an edge (1-simplex) is created. When three balls intersect, a triangle (2-simplex) is formed.',
    mathNote:
      'In a Vietoris-Rips complex VR(X, ε), a simplex [v₀, ..., v_k] is added whenever the pairwise distance between all vertices is ≤ 2ε. The Nerve Theorem guarantees homotopy equivalence to the union of balls.',
    keyPoints: [
      'Interactive 3D orbit controls (left-click rotate, right-click pan, scroll zoom)',
      'Inspect vertices, edges, triangles, and generator cycles in real time',
      'Switch between Torus, Sphere, Klein Bottle, Lorenz Attractor, or upload custom CSV/JSON',
    ],
  },
  {
    title: 'Filtration Time Machine & Playback',
    subtitle: 'Sweeping the Scale Parameter ε from 0 to ∞',
    icon: <Clock className="w-6 h-6 text-amber-400" />,
    badge: 'Step 3 of 5 • Filtration',
    content:
      'Rather than picking one distance threshold, we compute the entire nested sequence of simplicial complexes ∅ = K₀ ⊆ K₁ ⊆ ... ⊆ K_m = K as ε grows monotonically.',
    mathNote:
      'Persistent homology tracks the birth (b) and death (d) of cycles across the filtration. Features with long persistence lifetime ℓ = d - b capture prominent topological features.',
    keyPoints: [
      'Use the bottom slider or press Spacebar to play continuous filtration sweep',
      'Step forwards/backwards using keyboard Arrow keys',
      'Toggle simplex visibility: balls, edges, triangles, and highlighted generator cycles',
    ],
  },
  {
    title: 'Persistence Diagrams & Confidence Bands',
    subtitle: 'Reading (Birth, Death) Coordinates & Statistical Significance',
    icon: <BarChart2 className="w-6 h-6 text-emerald-400" />,
    badge: 'Step 4 of 5 • Persistence',
    content:
      'Every hole is represented as a point (birth, death) in the persistence diagram. Points near the diagonal y = x die quickly and represent noise; points far from the diagonal represent true global holes.',
    mathNote:
      'Bootstrapped 95% confidence bands (Fasy et al.) mark the critical distance 2c_α. Features located above the shaded boundary band are statistically significant topological signatures.',
    keyPoints: [
      'Hover over diagram points to magnetically inspect their birth/death intervals',
      'Click any point to lock on its 3D generator cycle and open the algebraic feature explanation',
      'Toggle between Persistence Diagrams, Barcode Intervals, and Persistence Landscapes',
    ],
  },
  {
    title: 'Betti Curves, Euler Invariants & Audio Sonification',
    subtitle: 'Phase Transitions, Sound Feedback & Full Scientific Export',
    icon: <Volume2 className="w-6 h-6 text-purple-400" />,
    badge: 'Step 5 of 5 • Advanced Features',
    content:
      'Track the Euler characteristic χ(ε) = β₀ - β₁ + β₂ across scales to detect sharp structural phase transitions. Experience data sonification with harmonic audio tones mapped to homology dimensions!',
    mathNote:
      'Export complete reproducible research pipelines: Copy Python code (ripser, gudhi), download ready-to-run Jupyter Notebooks (.ipynb), or export vector SVGs & 128D ML feature vectors.',
    keyPoints: [
      'Live URL Session Sharing: Share exact mathematical states instantly with colleagues',
      'Sonification: Hear topological features as you explore persistence intervals',
      'Deep Obsidian Lab & Blueprint Themes with full WCAG color-blindness palettes',
    ],
  },
];

export const GuidedTutorialModal: React.FC<GuidedTutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    playSoundFeedback('click');
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((p) => p + 1);
    }
  };

  const handlePrev = () => {
    playSoundFeedback('click');
    setCurrentStep((p) => Math.max(0, p - 1));
  };

  return (
    <div
      id="guided-tutorial-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
    >
      <div
        id="guided-tutorial-modal-card"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden text-zinc-200"
      >
        {/* Step Progress Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-300">
              {step.badge}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  playSoundFeedback('click');
                  setCurrentStep(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-cyan-400' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              playSoundFeedback('click');
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl shrink-0 shadow-md">
              {step.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono">{step.title}</h2>
              <p className="text-xs text-cyan-300 font-medium">{step.subtitle}</p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-zinc-300">{step.content}</p>

          {step.mathNote && (
            <div className="p-3.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl font-mono text-[11px] text-zinc-300 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-amber-300">Mathematical Formulation:</strong> {step.mathNote}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              Key Capabilities & Guidance
            </h4>
            <div className="space-y-1.5">
              {step.keyPoints.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-xl border border-zinc-800 font-mono text-xs flex items-center gap-1.5 transition ${
              currentStep === 0
                ? 'opacity-30 cursor-not-allowed text-zinc-500'
                : 'hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => {
              playSoundFeedback('click');
              onClose();
            }}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          >
            Skip Tutorial
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 flex items-center gap-2 font-mono text-xs transition"
          >
            <span>{isLast ? 'Start Exploring' : 'Next Step'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
