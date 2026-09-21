/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Trophy,
  RefreshCw,
  X,
  Sparkles,
  Award,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Layers,
  Search,
  Compass,
  Flame,
  Check,
  RotateCw,
  RotateCcw,
  Gamepad2,
  Minus,
  Plus,
  Lightbulb,
} from 'lucide-react';
import { playSoundFeedback } from '../utils/audioSonification';

export type MinigameMode = 'betti' | 'diagram_match' | 'homeomorphism' | 'hole_hunter';

interface TdaMinigameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTheory?: () => void;
  initialMode?: MinigameMode;
}

// ---------------- GAME 1: BETTI NUMBER CHALLENGE ----------------
interface BettiQuestion {
  id: number;
  shape: string;
  description: string;
  b0: number;
  b1: number;
  b2: number;
  hint: string;
}

const BETTI_QUESTIONS: BettiQuestion[] = [
  {
    id: 1,
    shape: '2-Sphere (S²)',
    description: 'A hollow spherical shell or beach ball surface in ℝ³.',
    b0: 1,
    b1: 0,
    b2: 1,
    hint: 'It is connected (β₀=1), has no 1D tunnels (β₁=0), and encloses 1 hollow 2D cavity (β₂=1).',
  },
  {
    id: 2,
    shape: 'Torus (T²)',
    description: 'A classic donut surface in ℝ³.',
    b0: 1,
    b1: 2,
    b2: 1,
    hint: '2 independent circular loops (around tube & around hole) and 1 enclosed inner cavity: β₀=1, β₁=2, β₂=1.',
  },
  {
    id: 3,
    shape: 'Circle (S¹)',
    description: 'A 1-dimensional closed loop.',
    b0: 1,
    b1: 1,
    b2: 0,
    hint: '1 connected component, exactly 1 circular cycle, no 2D voids.',
  },
  {
    id: 4,
    shape: 'Trefoil Knot (S¹ in ℝ³)',
    description: 'A knotted closed loop that cannot be untied in 3D without cutting.',
    b0: 1,
    b1: 1,
    b2: 0,
    hint: 'Topologically it is still homeomorphic to a circle (S¹)! β₀=1, β₁=1, β₂=0.',
  },
  {
    id: 5,
    shape: 'Figure Eight (S¹ ∨ S¹)',
    description: 'Two closed loops joined at a single point (wedge sum).',
    b0: 1,
    b1: 2,
    b2: 0,
    hint: 'Single connected piece with two independent 1D hole cycles.',
  },
  {
    id: 6,
    shape: 'Double Torus (Genus 2 Surface)',
    description: 'A two-holed pretzel surface in ℝ³.',
    b0: 1,
    b1: 4,
    b2: 1,
    hint: 'Each handle contributes 2 independent 1D loops: β₁ = 2 × 2 = 4.',
  },
];

// ---------------- GAME 2: PERSISTENCE DIAGRAM MATCHER ----------------
interface DiagramMatchQuestion {
  id: number;
  manifoldName: string;
  manifoldDescription: string;
  correctOptionIndex: number;
  options: {
    label: string;
    diagramDescription: string;
    pointsSummary: string;
  }[];
  explanation: string;
}

const DIAGRAM_QUESTIONS: DiagramMatchQuestion[] = [
  {
    id: 1,
    manifoldName: 'Single Noisy Circle (S¹)',
    manifoldDescription: 'Points sampled uniformly around a ring with slight Gaussian noise.',
    correctOptionIndex: 0,
    options: [
      {
        label: 'Diagram A',
        diagramDescription: 'One high-persistence red H₁ point far above the diagonal; many H₀ points near birth 0.',
        pointsSummary: '1 prominent persistent cycle (birth=0.35, death=1.82)',
      },
      {
        label: 'Diagram B',
        diagramDescription: 'Two prominent red H₁ points and one prominent green H₂ point.',
        pointsSummary: '2 loops and 1 void (Torus signature)',
      },
      {
        label: 'Diagram C',
        diagramDescription: 'Zero red H₁ points, only a single blue H₀ feature surviving to infinity.',
        pointsSummary: 'Solid ball or cluster with no persistent loops',
      },
    ],
    explanation: 'A circle has exactly one non-trivial 1D homology loop (H₁) with high persistence (long lifespan before triangulation closes it).',
  },
  {
    id: 2,
    manifoldName: 'Hollow 2-Sphere (S²)',
    manifoldDescription: 'Points sampled evenly over the surface of a hollow sphere.',
    correctOptionIndex: 1,
    options: [
      {
        label: 'Diagram A',
        diagramDescription: 'No H₂ features, four prominent H₁ points.',
        pointsSummary: 'Genus 2 surface signature',
      },
      {
        label: 'Diagram B',
        diagramDescription: 'Zero prominent H₁ loops, but one high-persistence green H₂ point surviving until high filtration scale.',
        pointsSummary: '1 hollow 2D void (H₂ birth=0.6, death=2.1)',
      },
      {
        label: 'Diagram C',
        diagramDescription: 'Points tightly scattered only on the diagonal line birth ≈ death.',
        pointsSummary: 'Pure topological noise, no features',
      },
    ],
    explanation: 'A 2-Sphere has trivial H₁=0 (any loop on a sphere contracts to a point) and non-trivial H₂=1 (enclosing a hollow interior).',
  },
  {
    id: 3,
    manifoldName: '3 Disjoint Clusters (Noisy Point Clouds)',
    manifoldDescription: 'Three separate spherical clusters far apart from each other.',
    correctOptionIndex: 2,
    options: [
      {
        label: 'Diagram A',
        diagramDescription: 'One H₀ bar and five prominent H₁ loops.',
        pointsSummary: 'Punctured plane or multi-hole mesh',
      },
      {
        label: 'Diagram B',
        diagramDescription: 'Two green H₂ points and one red H₁ point.',
        pointsSummary: 'Complex manifold with cavities',
      },
      {
        label: 'Diagram C',
        diagramDescription: 'Three distinct H₀ components with long persistence before merging at large distance.',
        pointsSummary: '3 independent connected components (H₀)',
      },
    ],
    explanation: 'Disjoint clusters manifest as multiple prominent H₀ bars/points that only merge at large filtration radii.',
  },
];

// ---------------- GAME 3: HOMEOMORPHISM MASTER ----------------
interface HomeomorphismQuestion {
  id: number;
  pair: [string, string];
  isHomeomorphic: boolean;
  explanation: string;
}

const HOMEOMORPHISM_QUESTIONS: HomeomorphismQuestion[] = [
  {
    id: 1,
    pair: ['Coffee Mug (with 1 handle)', 'Glazed Donut (Torus)'],
    isHomeomorphic: true,
    explanation: 'Classic topology result! Both have exactly 1 tunnel/hole (Genus g=1, β₁=2 as closed surfaces), so a ceramic mug can be continuously deformed into a donut.',
  },
  {
    id: 2,
    pair: ['Solid Ball (3D Ball B³)', 'Hollow Sphere Shell (S²)'],
    isHomeomorphic: false,
    explanation: 'The hollow sphere has a non-trivial 2D void (β₂=1) and is a 2D surface, while the solid ball has trivial homology in all positive dimensions and is a 3D volume.',
  },
  {
    id: 3,
    pair: ['Cube Surface', 'Sphere Surface (S²)'],
    isHomeomorphic: true,
    explanation: 'Both are closed 2D surfaces of genus 0 with β₀=1, β₁=0, β₂=1. The corners can be smoothly rounded off without tearing or gluing.',
  },
  {
    id: 4,
    pair: ['Circle (S¹)', 'Figure-Eight (S¹ ∨ S¹)'],
    isHomeomorphic: false,
    explanation: 'Removing the crossing point from a figure-eight splits it into two disconnected pieces, whereas removing any point from a circle leaves it connected. Different β₁ (1 vs 2).',
  },
  {
    id: 5,
    pair: ['Trefoil Knot (1D Curve)', 'Unknotted Circle (S¹)'],
    isHomeomorphic: true,
    explanation: 'As abstract 1-dimensional topological spaces, both are homeomorphic to S¹! The "knottedness" is a property of their embedding in ℝ³, not of the intrinsic topology.',
  },
];

// ---------------- GAME 4: FILTRATION HOLE HUNTER ----------------
interface HoleHunterQuestion {
  id: number;
  manifold: string;
  description: string;
  targetFeature: string;
  correctEpsilonRange: [number, number];
  recommendedEpsilon: number;
  hint: string;
}

const HOLE_HUNTER_QUESTIONS: HoleHunterQuestion[] = [
  {
    id: 1,
    manifold: 'Noisy Circle (Radius = 2.0)',
    description: 'At small ε, points are disconnected. At large ε, triangles fill the center.',
    targetFeature: 'Find the optimal scale ε where all points connect into a cycle, but the central hole is still open!',
    correctEpsilonRange: [0.5, 1.2],
    recommendedEpsilon: 0.85,
    hint: 'If ε < 0.4, edges are broken. If ε > 1.6, 2-simplices span across the center and kill the loop.',
  },
  {
    id: 2,
    manifold: 'Dense Torus (R = 2.5, r = 0.8)',
    description: 'Two circular loops need to be captured without filling the central tunnel.',
    targetFeature: 'Find the scale ε where the tube connects without collapsing the big donut hole.',
    correctEpsilonRange: [0.45, 0.95],
    recommendedEpsilon: 0.72,
    hint: 'Tube cross-section distance is smaller than the inner donut aperture.',
  },
];

export const TdaMinigameModal: React.FC<TdaMinigameModalProps> = ({
  isOpen,
  onClose,
  onOpenTheory,
  initialMode = 'betti',
}) => {
  const [activeMode, setActiveMode] = useState<MinigameMode>(initialMode);

  // Common scoring
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  // Game 1: Betti state
  const [bettiIdx, setBettiIdx] = useState(0);
  const [selectedB0, setSelectedB0] = useState<number>(1);
  const [selectedB1, setSelectedB1] = useState<number>(0);
  const [selectedB2, setSelectedB2] = useState<number>(0);
  const [bettiSubmitted, setBettiSubmitted] = useState(false);
  const [bettiCorrect, setBettiCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Game 2: Diagram Matcher state
  const [diagIdx, setDiagIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [diagSubmitted, setDiagSubmitted] = useState(false);

  // Game 3: Homeomorphism state
  const [homeoIdx, setHomeoIdx] = useState(0);
  const [userHomeoChoice, setUserHomeoChoice] = useState<boolean | null>(null);
  const [homeoSubmitted, setHomeoSubmitted] = useState(false);

  // Game 4: Hole Hunter state
  const [hunterIdx, setHunterIdx] = useState(0);
  const [sliderEps, setSliderEps] = useState(0.3);
  const [hunterSubmitted, setHunterSubmitted] = useState(false);
  const [hunterCorrect, setHunterCorrect] = useState(false);

  if (!isOpen) return null;

  // Handler for Betti answer check
  const handleCheckBetti = () => {
    playSoundFeedback('click');
    const q = BETTI_QUESTIONS[bettiIdx];
    const isOk = selectedB0 === q.b0 && selectedB1 === q.b1 && selectedB2 === q.b2;
    setBettiCorrect(isOk);
    setBettiSubmitted(true);
    if (isOk) {
      setScore((s) => s + 25);
      setStreak((st) => st + 1);
      playSoundFeedback('complete');
    } else {
      setStreak(0);
    }
  };

  const handleRetryBetti = () => {
    playSoundFeedback('click');
    setBettiSubmitted(false);
    setBettiCorrect(false);
  };

  const handleAutoApplyBetti = () => {
    playSoundFeedback('complete');
    const q = BETTI_QUESTIONS[bettiIdx];
    setSelectedB0(q.b0);
    setSelectedB1(q.b1);
    setSelectedB2(q.b2);
    setBettiCorrect(true);
    setBettiSubmitted(true);
    setScore((s) => s + 15);
    setStreak((st) => st + 1);
  };

  const handleSelectBettiQuestion = (idx: number) => {
    playSoundFeedback('click');
    setBettiIdx(idx);
    setBettiSubmitted(false);
    setBettiCorrect(false);
    setShowHint(false);
  };

  const handleNextBetti = () => {
    playSoundFeedback('click');
    setBettiSubmitted(false);
    setBettiCorrect(false);
    setShowHint(false);
    if (bettiIdx < BETTI_QUESTIONS.length - 1) {
      setBettiIdx((i) => i + 1);
      setSelectedB0(1);
      setSelectedB1(0);
      setSelectedB2(0);
    } else {
      setBettiIdx(0);
    }
  };

  // Handler for Diagram Matcher check
  const handleCheckDiagram = (optIdx: number) => {
    if (diagSubmitted) return;
    playSoundFeedback('click');
    setSelectedOption(optIdx);
    setDiagSubmitted(true);
    const q = DIAGRAM_QUESTIONS[diagIdx];
    if (optIdx === q.correctOptionIndex) {
      setScore((s) => s + 25);
      setStreak((st) => st + 1);
      playSoundFeedback('complete');
    } else {
      setStreak(0);
    }
  };

  const handleNextDiagram = () => {
    playSoundFeedback('click');
    setDiagSubmitted(false);
    setSelectedOption(null);
    if (diagIdx < DIAGRAM_QUESTIONS.length - 1) {
      setDiagIdx((i) => i + 1);
    } else {
      setDiagIdx(0);
    }
  };

  // Handler for Homeomorphism check
  const handleCheckHomeo = (choice: boolean) => {
    if (homeoSubmitted) return;
    playSoundFeedback('click');
    setUserHomeoChoice(choice);
    setHomeoSubmitted(true);
    const q = HOMEOMORPHISM_QUESTIONS[homeoIdx];
    if (choice === q.isHomeomorphic) {
      setScore((s) => s + 25);
      setStreak((st) => st + 1);
      playSoundFeedback('complete');
    } else {
      setStreak(0);
    }
  };

  const handleNextHomeo = () => {
    playSoundFeedback('click');
    setHomeoSubmitted(false);
    setUserHomeoChoice(null);
    if (homeoIdx < HOMEOMORPHISM_QUESTIONS.length - 1) {
      setHomeoIdx((i) => i + 1);
    } else {
      setHomeoIdx(0);
    }
  };

  // Handler for Hole Hunter check
  const handleCheckHunter = () => {
    playSoundFeedback('click');
    const q = HOLE_HUNTER_QUESTIONS[hunterIdx];
    const isOk = sliderEps >= q.correctEpsilonRange[0] && sliderEps <= q.correctEpsilonRange[1];
    setHunterCorrect(isOk);
    setHunterSubmitted(true);
    if (isOk) {
      setScore((s) => s + 25);
      setStreak((st) => st + 1);
      playSoundFeedback('complete');
    } else {
      setStreak(0);
    }
  };

  const handleNextHunter = () => {
    playSoundFeedback('click');
    setHunterSubmitted(false);
    if (hunterIdx < HOLE_HUNTER_QUESTIONS.length - 1) {
      setHunterIdx((i) => i + 1);
      setSliderEps(0.3);
    } else {
      setHunterIdx(0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        style={{
          backgroundColor: 'var(--realtime-card)',
          borderColor: 'var(--radix-border)',
          color: 'var(--realtime-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Mode Switcher */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800"
          style={{
            backgroundColor: 'var(--realtime-secondary)',
            borderColor: 'var(--radix-border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: 'var(--realtime-primary)',
                color: '#ffffff',
              }}
            >
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-wide" style={{ color: 'var(--realtime-text)' }}>
                TDA Topology Minigames & Puzzles
              </h2>
              <p className="text-[11px] opacity-80">
                Choose any game below to master Betti numbers, barcodes, and homology
              </p>
            </div>
          </div>

          {/* Score, Streak & Close */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold border shadow-sm"
              style={{
                backgroundColor: 'var(--realtime-elevated)',
                borderColor: 'var(--radix-border)',
                color: 'var(--realtime-accent)',
              }}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{score} pts</span>
              {streak > 1 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-bounce" />
                  <span>{streak}</span>
                </span>
              )}
            </div>

            <button
              id="btn-close-minigame-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/40 transition group"
              title="Close Minigame"
            >
              <X className="w-4 h-4 group-hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Game Mode Selector Bar */}
        <div
          className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 overflow-x-auto text-xs font-mono font-medium"
          style={{
            backgroundColor: 'var(--realtime-background)',
            borderColor: 'var(--radix-border)',
          }}
        >
          <span className="text-[11px] text-zinc-400 whitespace-nowrap mr-1">Game:</span>

          <button
            id="minigame-tab-betti"
            onClick={() => {
              playSoundFeedback('click');
              setActiveMode('betti');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeMode === 'betti' ? 'font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            style={
              activeMode === 'betti'
                ? {
                    backgroundColor: 'var(--realtime-primary)',
                    color: '#ffffff',
                  }
                : undefined
            }
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Betti Numbers</span>
          </button>

          <button
            id="minigame-tab-diagram"
            onClick={() => {
              playSoundFeedback('click');
              setActiveMode('diagram_match');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeMode === 'diagram_match' ? 'font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            style={
              activeMode === 'diagram_match'
                ? {
                    backgroundColor: 'var(--realtime-primary)',
                    color: '#ffffff',
                  }
                : undefined
            }
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Barcode Matcher</span>
          </button>

          <button
            id="minigame-tab-homeo"
            onClick={() => {
              playSoundFeedback('click');
              setActiveMode('homeomorphism');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeMode === 'homeomorphism' ? 'font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            style={
              activeMode === 'homeomorphism'
                ? {
                    backgroundColor: 'var(--realtime-primary)',
                    color: '#ffffff',
                  }
                : undefined
            }
          >
            <Compass className="w-3.5 h-3.5" />
            <span>3. Homeomorphism</span>
          </button>

          <button
            id="minigame-tab-hunter"
            onClick={() => {
              playSoundFeedback('click');
              setActiveMode('hole_hunter');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeMode === 'hole_hunter' ? 'font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            style={
              activeMode === 'hole_hunter'
                ? {
                    backgroundColor: 'var(--realtime-primary)',
                    color: '#ffffff',
                  }
                : undefined
            }
          >
            <Search className="w-3.5 h-3.5" />
            <span>4. Hole Hunter</span>
          </button>
        </div>

        {/* Active Game Body */}
        <div className="p-5 overflow-y-auto max-h-[65vh]">
          {/* ================= MODE 1: BETTI NUMBERS ================= */}
          {/* ================= MODE 1: BETTI NUMBER CHALLENGE ================= */}
          {activeMode === 'betti' && (
            <div className="space-y-4">
              {/* Question Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {BETTI_QUESTIONS.map((q, idx) => {
                  const isCurrent = bettiIdx === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleSelectBettiQuestion(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold shadow-sm'
                          : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span>Q{q.id}:</span>
                      <span>{q.shape.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="text-zinc-300 font-bold">
                  Question {bettiIdx + 1} of {BETTI_QUESTIONS.length}: {BETTI_QUESTIONS[bettiIdx].shape}
                </span>
                <span className="text-[11px] opacity-80">Target: β₀ (pieces), β₁ (loops), β₂ (cavities)</span>
              </div>

              {/* Question Card */}
              <div
                className="p-4 rounded-xl border space-y-2"
                style={{
                  backgroundColor: 'var(--realtime-elevated)',
                  borderColor: 'var(--radix-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: 'var(--realtime-accent)' }}>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    {BETTI_QUESTIONS[bettiIdx].shape}
                  </h3>
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 text-amber-300 border border-amber-500/30 transition"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-zinc-300 font-sans">
                  {BETTI_QUESTIONS[bettiIdx].description}
                </p>

                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-200 font-sans italic"
                  >
                    💡 <strong>Topological Clue:</strong> {BETTI_QUESTIONS[bettiIdx].hint}
                  </motion.div>
                )}
              </div>

              {/* Interactive Invariant Steppers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* β₀ Stepper */}
                <div
                  className="p-3 rounded-xl border flex flex-col items-center justify-between gap-2.5"
                  style={{
                    backgroundColor: 'var(--realtime-background)',
                    borderColor: 'var(--radix-border)',
                  }}
                >
                  <div className="text-center">
                    <span className="text-xs font-mono font-bold block text-cyan-400">
                      β₀ (Connected Components)
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">
                      Number of disjoint pieces
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedB0((v) => Math.max(0, v - 1))}
                      disabled={bettiSubmitted || selectedB0 <= 0}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center transition border border-zinc-700"
                      title="Decrease β₀"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-12 h-10 rounded-lg bg-zinc-900/90 border border-cyan-500/40 flex items-center justify-center font-mono text-lg font-bold text-cyan-300">
                      {selectedB0}
                    </div>
                    <button
                      onClick={() => setSelectedB0((v) => Math.min(5, v + 1))}
                      disabled={bettiSubmitted || selectedB0 >= 5}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center transition border border-zinc-700"
                      title="Increase β₀"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick pills */}
                  <div className="flex items-center gap-1 pt-1">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setSelectedB0(num)}
                        disabled={bettiSubmitted}
                        className={`w-6 h-6 rounded text-[11px] font-mono transition border ${
                          selectedB0 === num
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                            : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* β₁ Stepper */}
                <div
                  className="p-3 rounded-xl border flex flex-col items-center justify-between gap-2.5"
                  style={{
                    backgroundColor: 'var(--realtime-background)',
                    borderColor: 'var(--radix-border)',
                  }}
                >
                  <div className="text-center">
                    <span className="text-xs font-mono font-bold block text-emerald-400">
                      β₁ (1D Circular Loops)
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">
                      Non-bounding cycle tunnels
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedB1((v) => Math.max(0, v - 1))}
                      disabled={bettiSubmitted || selectedB1 <= 0}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center transition border border-zinc-700"
                      title="Decrease β₁"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-12 h-10 rounded-lg bg-zinc-900/90 border border-emerald-500/40 flex items-center justify-center font-mono text-lg font-bold text-emerald-300">
                      {selectedB1}
                    </div>
                    <button
                      onClick={() => setSelectedB1((v) => Math.min(5, v + 1))}
                      disabled={bettiSubmitted || selectedB1 >= 5}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center transition border border-zinc-700"
                      title="Increase β₁"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick pills */}
                  <div className="flex items-center gap-1 pt-1">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setSelectedB1(num)}
                        disabled={bettiSubmitted}
                        className={`w-6 h-6 rounded text-[11px] font-mono transition border ${
                          selectedB1 === num
                            ? 'bg-emerald-500 text-black font-bold border-emerald-400'
                            : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* β₂ Stepper */}
                <div
                  className="p-3 rounded-xl border flex flex-col items-center justify-between gap-2.5"
                  style={{
                    backgroundColor: 'var(--realtime-background)',
                    borderColor: 'var(--radix-border)',
                  }}
                >
                  <div className="text-center">
                    <span className="text-xs font-mono font-bold block text-amber-400">
                      β₂ (2D Enclosed Cavities)
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">
                      Hollow 2D interior voids
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedB2((v) => Math.max(0, v - 1))}
                      disabled={bettiSubmitted || selectedB2 <= 0}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center transition border border-zinc-700"
                      title="Decrease β₂"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-12 h-10 rounded-lg bg-zinc-900/90 border border-amber-500/40 flex items-center justify-center font-mono text-lg font-bold text-amber-300">
                      {selectedB2}
                    </div>
                    <button
                      onClick={() => setSelectedB2((v) => Math.min(5, v + 1))}
                      disabled={bettiSubmitted || selectedB2 >= 5}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center transition border border-zinc-700"
                      title="Increase β₂"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick pills */}
                  <div className="flex items-center gap-1 pt-1">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setSelectedB2(num)}
                        disabled={bettiSubmitted}
                        className={`w-6 h-6 rounded text-[11px] font-mono transition border ${
                          selectedB2 === num
                            ? 'bg-amber-500 text-black font-bold border-amber-400'
                            : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {bettiSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border text-xs font-sans leading-relaxed ${
                      bettiCorrect
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow-lg'
                        : 'bg-rose-950/60 border-rose-500/60 text-rose-200 shadow-lg'
                    }`}
                  >
                    <div className="font-bold font-mono flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {bettiCorrect ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <X className="w-5 h-5 text-rose-400" />
                        )}
                        <span className="text-sm">
                          {bettiCorrect
                            ? 'Correct! Exact Invariants Verified.'
                            : 'Incorrect.'}
                        </span>
                      </div>
                      {!bettiCorrect && (
                        <button
                          onClick={handleAutoApplyBetti}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-semibold flex items-center gap-1 shadow-sm transition"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply Correct Values</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs opacity-95">
                      Target Betti invariants:{' '}
                      <strong className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/20">
                        β₀={BETTI_QUESTIONS[bettiIdx].b0}, β₁={BETTI_QUESTIONS[bettiIdx].b1}, β₂={BETTI_QUESTIONS[bettiIdx].b2}
                      </strong>
                    </p>
                    <p className="text-xs mt-1.5 italic opacity-90 leading-normal">
                      {BETTI_QUESTIONS[bettiIdx].hint}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              {!bettiSubmitted ? (
                <button
                  onClick={handleCheckBetti}
                  className="w-full py-3 rounded-xl text-xs font-mono font-bold transition shadow-lg text-white hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--realtime-primary)' }}
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Topological Answer (β₀={selectedB0}, β₁={selectedB1}, β₂={selectedB2})</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  {!bettiCorrect && (
                    <button
                      onClick={handleRetryBetti}
                      className="flex-1 py-2.5 rounded-xl text-xs font-mono font-semibold transition bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Try Again & Revise</span>
                    </button>
                  )}
                  <button
                    onClick={handleNextBetti}
                    className="flex-1 py-2.5 rounded-xl text-xs font-mono font-semibold transition shadow-lg text-white flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: 'var(--realtime-primary)',
                    }}
                  >
                    {bettiIdx < BETTI_QUESTIONS.length - 1 ? (
                      <span>Next Manifold ({BETTI_QUESTIONS[bettiIdx + 1].shape.split(' ')[0]}) →</span>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Cycle Challenges</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 2: PERSISTENCE DIAGRAM MATCHER ================= */}
          {activeMode === 'diagram_match' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>
                  Challenge {diagIdx + 1} of {DIAGRAM_QUESTIONS.length}
                </span>
                <span className="text-[11px] opacity-80">Match point cloud to its persistence diagram</span>
              </div>

              <div
                className="p-4 rounded-xl border space-y-1.5"
                style={{
                  backgroundColor: 'var(--realtime-elevated)',
                  borderColor: 'var(--radix-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" style={{ color: 'var(--realtime-accent)' }} />
                  <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--realtime-text)' }}>
                    {DIAGRAM_QUESTIONS[diagIdx].manifoldName}
                  </h3>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {DIAGRAM_QUESTIONS[diagIdx].manifoldDescription}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {DIAGRAM_QUESTIONS[diagIdx].options.map((opt, i) => {
                  const isChosen = selectedOption === i;
                  const isAnswer = i === DIAGRAM_QUESTIONS[diagIdx].correctOptionIndex;
                  let borderCol = 'var(--radix-border)';
                  let bgCol = 'var(--realtime-background)';

                  if (diagSubmitted) {
                    if (isAnswer) {
                      borderCol = '#10b981';
                      bgCol = 'rgba(16, 185, 129, 0.15)';
                    } else if (isChosen) {
                      borderCol = '#ef4444';
                      bgCol = 'rgba(239, 68, 68, 0.15)';
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleCheckDiagram(i)}
                      disabled={diagSubmitted}
                      className="w-full text-left p-3 rounded-xl border transition shadow-sm flex flex-col gap-1"
                      style={{
                        backgroundColor: bgCol,
                        borderColor: borderCol,
                        cursor: diagSubmitted ? 'default' : 'pointer',
                      }}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span style={{ color: 'var(--realtime-accent)' }}>{opt.label}</span>
                        {diagSubmitted && isAnswer && (
                          <span className="text-emerald-400 font-sans text-[11px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Correct Diagram</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-200 font-sans">{opt.diagramDescription}</p>
                      <span className="text-[11px] text-zinc-400 font-mono">{opt.pointsSummary}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {diagSubmitted && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-sans">
                    <strong>Topological Reason:</strong> {DIAGRAM_QUESTIONS[diagIdx].explanation}
                  </div>
                  <button
                    onClick={handleNextDiagram}
                    className="w-full py-2.5 rounded-xl text-xs font-mono font-semibold transition text-white shadow-lg flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'var(--realtime-primary)' }}
                  >
                    {diagIdx < DIAGRAM_QUESTIONS.length - 1 ? (
                      <span>Next Diagram Challenge →</span>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Cycle Challenges</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 3: HOMEOMORPHISM MASTER ================= */}
          {activeMode === 'homeomorphism' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>
                  Question {homeoIdx + 1} of {HOMEOMORPHISM_QUESTIONS.length}
                </span>
                <span className="text-[11px] opacity-80">Are they topologically equivalent (≅)?</span>
              </div>

              <div
                className="p-5 rounded-xl border text-center space-y-3"
                style={{
                  backgroundColor: 'var(--realtime-elevated)',
                  borderColor: 'var(--radix-border)',
                }}
              >
                <div className="text-xs text-zinc-400 font-mono">Compare Objects:</div>
                <div className="flex items-center justify-center gap-3 text-sm font-bold font-mono">
                  <span
                    className="px-3 py-1.5 rounded-lg border"
                    style={{ backgroundColor: 'var(--realtime-background)', borderColor: 'var(--radix-border)' }}
                  >
                    {HOMEOMORPHISM_QUESTIONS[homeoIdx].pair[0]}
                  </span>
                  <span className="text-zinc-500">vs</span>
                  <span
                    className="px-3 py-1.5 rounded-lg border"
                    style={{ backgroundColor: 'var(--realtime-background)', borderColor: 'var(--radix-border)' }}
                  >
                    {HOMEOMORPHISM_QUESTIONS[homeoIdx].pair[1]}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans">
                  Can one be continuously stretched, twisted, and deformed into the other without cutting or gluing?
                </p>
              </div>

              {/* Choice Buttons */}
              {!homeoSubmitted ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleCheckHomeo(true)}
                    className="py-3 rounded-xl text-xs font-mono font-bold bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800 transition shadow-sm"
                  >
                    YES (Homeomorphic ≅)
                  </button>
                  <button
                    onClick={() => handleCheckHomeo(false)}
                    className="py-3 rounded-xl text-xs font-mono font-bold bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800 transition shadow-sm"
                  >
                    NO (Not Homeomorphic ≇)
                  </button>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in">
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-sans ${
                      userHomeoChoice === HOMEOMORPHISM_QUESTIONS[homeoIdx].isHomeomorphic
                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                        : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    <div className="font-bold font-mono mb-1 flex items-center gap-1.5">
                      {userHomeoChoice === HOMEOMORPHISM_QUESTIONS[homeoIdx].isHomeomorphic ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Correct Insight!</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-rose-400" />
                          <span>Not quite.</span>
                        </>
                      )}
                    </div>
                    <p>{HOMEOMORPHISM_QUESTIONS[homeoIdx].explanation}</p>
                  </div>

                  <button
                    onClick={handleNextHomeo}
                    className="w-full py-2.5 rounded-xl text-xs font-mono font-semibold transition text-white shadow-lg flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'var(--realtime-primary)' }}
                  >
                    {homeoIdx < HOMEOMORPHISM_QUESTIONS.length - 1 ? (
                      <span>Next Pair →</span>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Cycle Pairs</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 4: HOLE HUNTER ================= */}
          {activeMode === 'hole_hunter' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>
                  Level {hunterIdx + 1} of {HOLE_HUNTER_QUESTIONS.length}
                </span>
                <span className="text-[11px] opacity-80">Tune filtration scale ε to capture signal</span>
              </div>

              <div
                className="p-4 rounded-xl border space-y-2"
                style={{
                  backgroundColor: 'var(--realtime-elevated)',
                  borderColor: 'var(--radix-border)',
                }}
              >
                <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--realtime-accent)' }}>
                  {HOLE_HUNTER_QUESTIONS[hunterIdx].manifold}
                </h3>
                <p className="text-xs text-zinc-300 font-sans">{HOLE_HUNTER_QUESTIONS[hunterIdx].description}</p>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-amber-300">
                  Mission: {HOLE_HUNTER_QUESTIONS[hunterIdx].targetFeature}
                </div>
              </div>

              {/* Slider */}
              <div
                className="p-4 rounded-xl border space-y-2"
                style={{
                  backgroundColor: 'var(--realtime-background)',
                  borderColor: 'var(--radix-border)',
                }}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Filtration Scale (ε):</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--realtime-accent)' }}>
                    {sliderEps.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.05"
                  value={sliderEps}
                  onChange={(e) => setSliderEps(parseFloat(e.target.value))}
                  disabled={hunterSubmitted}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>0.1 (Dust / Disconnected)</span>
                  <span>1.3 (Equilibrium)</span>
                  <span>2.5 (Dense Solid / Triangulated)</span>
                </div>
              </div>

              {/* Feedback & Actions */}
              {!hunterSubmitted ? (
                <button
                  onClick={handleCheckHunter}
                  className="w-full py-2.5 rounded-xl text-xs font-mono font-semibold transition text-white shadow-lg"
                  style={{ backgroundColor: 'var(--realtime-primary)' }}
                >
                  Confirm Filtration Scale ε
                </button>
              ) : (
                <div className="space-y-3 animate-in fade-in">
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-sans ${
                      hunterCorrect
                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                        : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    <div className="font-bold font-mono mb-1 flex items-center gap-1.5">
                      {hunterCorrect ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Target Homology Feature Captured!</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-rose-400" />
                          <span>Scale Out of Range</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px]">
                      Optimal scale window:{' '}
                      <strong className="font-mono">
                        [{HOLE_HUNTER_QUESTIONS[hunterIdx].correctEpsilonRange[0].toFixed(2)} –{' '}
                        {HOLE_HUNTER_QUESTIONS[hunterIdx].correctEpsilonRange[1].toFixed(2)}]
                      </strong>{' '}
                      (Target sweet spot ≈ {HOLE_HUNTER_QUESTIONS[hunterIdx].recommendedEpsilon.toFixed(2)}).
                    </p>
                    <p className="text-[11px] mt-1 italic opacity-85">{HOLE_HUNTER_QUESTIONS[hunterIdx].hint}</p>
                  </div>

                  <button
                    onClick={handleNextHunter}
                    className="w-full py-2.5 rounded-xl text-xs font-mono font-semibold transition text-white shadow-lg flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'var(--realtime-primary)' }}
                  >
                    {hunterIdx < HOLE_HUNTER_QUESTIONS.length - 1 ? (
                      <span>Next Level →</span>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Cycle Levels</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Cross-Link to Theory */}
        <div
          className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono"
          style={{
            backgroundColor: 'var(--realtime-secondary)',
            borderColor: 'var(--radix-border)',
          }}
        >
          <button
            onClick={() => {
              playSoundFeedback('click');
              onClose();
              if (onOpenTheory) onOpenTheory();
            }}
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Need theory refresh? Open Mathematical Documentation →</span>
          </button>

          <span className="text-[11px] text-zinc-400 hidden sm:inline">Dhurgham Alsaadi</span>
        </div>
      </motion.div>
    </div>
  );
};
