/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Layers,
  Circle,
  Triangle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ActiveSimplicialComplex, TDAResult } from '../types/tda';

interface FiltrationControllerProps {
  tdaResult: TDAResult | null;
  currentEpsilon: number;
  maxEpsilon: number;
  isPlaying: boolean;
  playSpeed: number;
  activeComplex: ActiveSimplicialComplex | null;
  showBalls: boolean;
  showEdges: boolean;
  showTriangles: boolean;
  showGeneratorCycle: boolean;
  onEpsilonChange: (eps: number) => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleBalls: () => void;
  onToggleEdges: () => void;
  onToggleTriangles: () => void;
  onToggleGeneratorCycle: () => void;
}

export const FiltrationController: React.FC<FiltrationControllerProps> = ({
  tdaResult,
  currentEpsilon,
  maxEpsilon,
  isPlaying,
  playSpeed,
  activeComplex,
  showBalls,
  showEdges,
  showTriangles,
  showGeneratorCycle,
  onEpsilonChange,
  onTogglePlay,
  onChangeSpeed,
  onToggleBalls,
  onToggleEdges,
  onToggleTriangles,
  onToggleGeneratorCycle,
}) => {
  const step = maxEpsilon / 100 || 0.01;

  const handleStepBack = () => {
    onEpsilonChange(Math.max(0, currentEpsilon - step));
  };

  const handleStepForward = () => {
    onEpsilonChange(Math.min(maxEpsilon, currentEpsilon + step));
  };

  const handleReset = () => {
    onEpsilonChange(0);
  };

  const progressPercent = maxEpsilon > 0 ? (currentEpsilon / maxEpsilon) * 100 : 0;

  return (
    <div
      id="filtration-controller-panel"
      className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col gap-3.5"
    >
      {/* Top Row: Filtration Slider & Playback Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Playback Button Group */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-step-back"
            onClick={handleStepBack}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="Step Backward"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-play"
            onClick={onTogglePlay}
            className={`relative flex items-center justify-center w-11 h-11 rounded-xl shadow-lg transition-all duration-200 font-bold active:scale-95 ${
              isPlaying
                ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/40 animate-vr-playing ring-2 ring-rose-400/50'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/30 animate-vr-ready ring-2 ring-emerald-400/40'
            }`}
            title={isPlaying ? 'Pause Filtration' : 'Play Vietoris-Rips Filtration'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            )}
          </button>

          <button
            id="btn-step-forward"
            onClick={handleStepForward}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            id="btn-reset-filt"
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition ml-1"
            title="Reset Filtration to 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5 ml-2">
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                id={`speed-btn-${spd}x`}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-1 text-[11px] font-mono font-medium rounded transition ${
                  playSpeed === spd
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Main Filtration Slider with Scale */}
        <div className="flex-1 w-full flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="text-cyan-400 font-semibold">Vietoris-Rips Scale Parameter:</span>
              <span className="text-amber-300 font-bold text-sm">
                ε = {currentEpsilon.toFixed(3)}
              </span>
            </span>
            <span className="text-slate-400">
              Max Scale: <span className="text-slate-200">{maxEpsilon.toFixed(3)}</span> (
              {progressPercent.toFixed(0)}%)
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              id="filtration-epsilon-slider"
              type="range"
              min="0"
              max={maxEpsilon || 1}
              step={(maxEpsilon || 1) / 300}
              value={currentEpsilon}
              onChange={(e) => onEpsilonChange(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Topological Invariants and Layer Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
        {/* Active Betti Counters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div
            id="metric-b0"
            className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 font-semibold shadow-xs"
            title="Betti-0: Number of connected components at scale ε"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
            <span className="font-heading">β₀ (Components):</span>
            <span className="font-display font-black text-sm text-white">
              {activeComplex?.betti0 ?? 0}
            </span>
          </div>

          <div
            id="metric-b1"
            className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 font-semibold shadow-xs"
            title="Betti-1: Number of independent 1D loops / holes at scale ε"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm" />
            <span className="font-heading">β₁ (Loops):</span>
            <span className="font-display font-black text-sm text-white">
              {activeComplex?.betti1 ?? 0}
            </span>
          </div>

          <div
            id="metric-b2"
            className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 font-semibold shadow-xs"
            title="Betti-2: Number of enclosed 2D voids / cavities at scale ε"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
            <span className="font-heading">β₂ (Voids):</span>
            <span className="font-display font-black text-sm text-white">
              {activeComplex?.betti2 ?? 0}
            </span>
          </div>

          <div
            id="metric-euler"
            className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-purple-500/40 text-purple-300 font-semibold shadow-xs"
            title="Euler Characteristic: χ(ε) = β₀ - β₁ + β₂ = V - E + F"
          >
            <span className="font-heading">χ(ε):</span>
            <span className="font-display font-black text-sm text-white">
              {activeComplex?.euler ?? 0}
            </span>
          </div>
        </div>

        {/* 3D Visual Mesh Toggles */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-3d-balls"
            onClick={onToggleBalls}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg border transition-all active:scale-95 ${
              showBalls
                ? 'bg-sky-500 hover:bg-sky-400 text-white border-sky-300 shadow-[0_0_14px_rgba(14,165,233,0.6)]'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border-slate-800'
            }`}
            title="Toggle growing ε/2 ball coverage around vertices"
          >
            <Circle className={`w-3.5 h-3.5 ${showBalls ? 'fill-sky-100 text-white' : ''}`} />
            <span>ε/2 Balls</span>
            {showBalls && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </button>

          <button
            id="toggle-3d-edges"
            onClick={onToggleEdges}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg border transition-all active:scale-95 ${
              showEdges
                ? 'bg-teal-500 hover:bg-teal-400 text-white border-teal-300 shadow-[0_0_14px_rgba(20,184,166,0.6)]'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border-slate-800'
            }`}
            title="Toggle 1-skeleton edges (d ≤ ε)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1-Edges</span>
            {showEdges && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </button>

          <button
            id="toggle-3d-triangles"
            onClick={onToggleTriangles}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg border transition-all active:scale-95 ${
              showTriangles
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-300 shadow-[0_0_14px_rgba(99,102,241,0.6)]'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border-slate-800'
            }`}
            title="Toggle 2-skeleton triangle faces"
          >
            <Triangle className={`w-3.5 h-3.5 ${showTriangles ? 'fill-indigo-100 text-white' : ''}`} />
            <span>2-Triangles</span>
            {showTriangles && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </button>

          <button
            id="toggle-3d-cycles"
            onClick={onToggleGeneratorCycle}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg border transition-all active:scale-95 ${
              showGeneratorCycle
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black border-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.65)]'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border-slate-800'
            }`}
            title="Highlight Representative Generator Cycles in 3D"
          >
            <Sparkles className={`w-3.5 h-3.5 ${showGeneratorCycle ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
            <span>Cycles</span>
            {showGeneratorCycle && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
          </button>
        </div>
      </div>
    </div>
  );
};
