/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  Camera,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Sliders,
  Columns,
  Grid,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActiveSimplicialComplex,
  AppSettings,
  ColorBlindnessMode,
  ColorMapScheme,
  DatasetConfig,
  PersistencePair,
  PointData,
  TDAResult,
} from '../types/tda';
import { PointCloudViewer3D } from './PointCloudViewer3D';
import { PersistenceDiagram } from './PersistenceDiagram';
import { PersistenceBarcode } from './PersistenceBarcode';
import { BettiAndEulerCurves } from './BettiAndEulerCurves';
import { PersistenceLandscapes } from './PersistenceLandscapes';

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  points: PointData[];
  tdaResult: TDAResult | null;
  activeComplex: ActiveSimplicialComplex | null;
  datasetConfig: DatasetConfig;
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
  noiseThreshold: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onEpsilonChange: (val: number) => void;
  onHoverPair: (pair: PersistencePair | null) => void;
  onSelectPair: (pair: PersistencePair | null) => void;
  onOpenExplain?: (pair: PersistencePair) => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  onClose,
  points,
  tdaResult,
  activeComplex,
  datasetConfig,
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
  noiseThreshold,
  isPlaying,
  onTogglePlay,
  onEpsilonChange,
  onHoverPair,
  onSelectPair,
  onOpenExplain,
}) => {
  const [layoutMode, setLayoutMode] = useState<'split' | '3d_only' | 'diagram_only'>('split');
  const [diagramSubView, setDiagramSubView] = useState<'split' | 'quad' | 'diagram' | 'barcode' | 'betti'>('split');
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState<boolean>(false);

  const handleSetLayoutMode = (mode: 'split' | '3d_only' | 'diagram_only') => {
    setLayoutMode(mode);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 40);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxEps = tdaResult?.maxEpsilon || 2.5;

  return (
    <div
      id="presentation-mode-root"
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden animate-in fade-in duration-300 select-none"
    >
      {/* Top Floating Glass Presentation Bar */}
      <div className="absolute top-4 left-6 right-6 z-40 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-zinc-800 shadow-2xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>{datasetConfig.name}</span>
              <span className="text-[10px] text-zinc-400 font-mono font-normal">
                (N = {points.length})
              </span>
            </h1>
            <div className="text-[10px] text-cyan-400 font-mono">
              Presentation Mode • Dhurgham Alsaadi
            </div>
          </div>
        </div>

        {/* Center Layout Selector */}
        <div className="flex items-center bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800 shadow-2xl pointer-events-auto gap-1">
          <button
            onClick={() => handleSetLayoutMode('split')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
              layoutMode === 'split'
                ? 'bg-zinc-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Split 3D & Diagram
          </button>
          <button
            onClick={() => handleSetLayoutMode('3d_only')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
              layoutMode === '3d_only'
                ? 'bg-zinc-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3D Manifold Only
          </button>
          <button
            onClick={() => handleSetLayoutMode('diagram_only')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
              layoutMode === 'diagram_only'
                ? 'bg-zinc-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Persistence Only
          </button>
        </div>

        {/* Exit Presentation Mode */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="btn-exit-presentation-mode"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900/90 hover:bg-red-600 text-zinc-200 hover:text-white backdrop-blur-md rounded-xl border border-zinc-800 hover:border-red-500 shadow-2xl text-xs font-medium transition group"
          >
            <X className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
            <span>Exit (Esc)</span>
          </button>
        </div>
      </div>

      {/* Main Presentation Stage */}
      <div className="flex-1 p-6 pt-16 pb-24 overflow-y-auto h-full min-h-0">
        <div className="w-full h-full min-h-[520px] flex flex-col lg:flex-row gap-6">
          {/* 3D Manifold Stage: Stable & persistent (avoids WebGL recreation/glitches) */}
          <div
            className={`h-full min-h-[420px] transition-all duration-200 ${
              layoutMode === '3d_only'
                ? 'w-full flex-1 block'
                : layoutMode === 'split'
                ? 'w-full lg:w-7/12 flex-1 block'
                : 'hidden'
            }`}
          >
            <PointCloudViewer3D
              points={points}
              tdaResult={tdaResult}
              activeComplex={activeComplex}
              currentEpsilon={currentEpsilon}
              selectedPair={selectedPair}
              hoveredPair={hoveredPair}
              colorScheme={colorScheme}
              colorBlindness={colorBlindness}
              settings={settings}
              showBalls={showBalls}
              showEdges={showEdges}
              showTriangles={showTriangles}
              showGeneratorCycle={showGeneratorCycle}
              pointSize={pointSize * (layoutMode === '3d_only' ? 1.2 : 1.1)}
              ballOpacity={ballOpacity}
              onSelectPair={onSelectPair}
              onOpenExplain={() => selectedPair && onOpenExplain?.(selectedPair)}
            />
          </div>

          {/* Persistence Workspace Stage */}
          <div
            className={`h-full min-h-[420px] transition-all duration-200 ${
              layoutMode === 'diagram_only'
                ? 'w-full flex-1 flex flex-col'
                : layoutMode === 'split'
                ? 'w-full lg:w-5/12 flex-1 flex flex-col'
                : 'hidden'
            }`}
          >
            {layoutMode === 'split' ? (
              <div className="flex flex-col gap-4 h-full min-h-[420px]">
                <div className="flex-1 min-h-[260px]">
                  <PersistenceDiagram
                    tdaResult={tdaResult}
                    currentEpsilon={currentEpsilon}
                    selectedPair={selectedPair}
                    hoveredPair={hoveredPair}
                    noiseThreshold={noiseThreshold}
                    colorBlindness={colorBlindness}
                    magneticSnap={settings.magneticSnap}
                    onHoverPair={onHoverPair}
                    onSelectPair={onSelectPair}
                    onOpenExplain={onOpenExplain}
                  />
                </div>
                <div className="flex-1 min-h-[200px]">
                  <PersistenceBarcode
                    tdaResult={tdaResult}
                    currentEpsilon={currentEpsilon}
                    selectedPair={selectedPair}
                    hoveredPair={hoveredPair}
                    noiseThreshold={noiseThreshold}
                    colorBlindness={colorBlindness}
                    onHoverPair={onHoverPair}
                    onSelectPair={onSelectPair}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 h-full min-h-0">
                {/* Persistence Sub-view Controls */}
                <div className="flex flex-wrap items-center justify-between bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 text-xs font-mono shrink-0 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">Persistence View:</span>
                    <div className="flex flex-wrap items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 gap-1">
                      <button
                        onClick={() => setDiagramSubView('split')}
                        className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                          diagramSubView === 'split' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>Diagram & Barcode</span>
                      </button>
                      <button
                        onClick={() => setDiagramSubView('quad')}
                        className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                          diagramSubView === 'quad' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>All 4 TDA Views (Full Matrix)</span>
                      </button>
                      <button
                        onClick={() => setDiagramSubView('diagram')}
                        className={`px-2.5 py-1 rounded-md transition ${
                          diagramSubView === 'diagram' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>Diagram Max</span>
                      </button>
                      <button
                        onClick={() => setDiagramSubView('barcode')}
                        className={`px-2.5 py-1 rounded-md transition ${
                          diagramSubView === 'barcode' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>Barcode Max</span>
                      </button>
                      <button
                        onClick={() => setDiagramSubView('betti')}
                        className={`px-2.5 py-1 rounded-md transition ${
                          diagramSubView === 'betti' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>Betti & Landscapes</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                    <span>Features: <span className="text-cyan-300 font-bold">{tdaResult?.pairs.length || 0}</span></span>
                    <span>Max ε: <span className="text-amber-300 font-bold">{maxEps.toFixed(2)}</span></span>
                  </div>
                </div>

                {/* Sub-view Content Stage */}
                <div className="flex-1 min-h-0">
                  {diagramSubView === 'split' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-[460px]">
                      <div className="h-full min-h-[420px]">
                        <PersistenceDiagram
                          tdaResult={tdaResult}
                          currentEpsilon={currentEpsilon}
                          selectedPair={selectedPair}
                          hoveredPair={hoveredPair}
                          noiseThreshold={noiseThreshold}
                          colorBlindness={colorBlindness}
                          magneticSnap={settings.magneticSnap}
                          onHoverPair={onHoverPair}
                          onSelectPair={onSelectPair}
                          onOpenExplain={onOpenExplain}
                        />
                      </div>
                      <div className="h-full min-h-[420px]">
                        <PersistenceBarcode
                          tdaResult={tdaResult}
                          currentEpsilon={currentEpsilon}
                          selectedPair={selectedPair}
                          hoveredPair={hoveredPair}
                          noiseThreshold={noiseThreshold}
                          colorBlindness={colorBlindness}
                          onHoverPair={onHoverPair}
                          onSelectPair={onSelectPair}
                        />
                      </div>
                    </div>
                  )}

                  {diagramSubView === 'quad' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[580px]">
                      <div className="min-h-[280px]">
                        <PersistenceDiagram
                          tdaResult={tdaResult}
                          currentEpsilon={currentEpsilon}
                          selectedPair={selectedPair}
                          hoveredPair={hoveredPair}
                          noiseThreshold={noiseThreshold}
                          colorBlindness={colorBlindness}
                          magneticSnap={settings.magneticSnap}
                          onHoverPair={onHoverPair}
                          onSelectPair={onSelectPair}
                          onOpenExplain={onOpenExplain}
                        />
                      </div>
                      <div className="min-h-[280px]">
                        <PersistenceBarcode
                          tdaResult={tdaResult}
                          currentEpsilon={currentEpsilon}
                          selectedPair={selectedPair}
                          hoveredPair={hoveredPair}
                          noiseThreshold={noiseThreshold}
                          colorBlindness={colorBlindness}
                          onHoverPair={onHoverPair}
                          onSelectPair={onSelectPair}
                        />
                      </div>
                      <div className="min-h-[240px]">
                        <BettiAndEulerCurves
                          tdaResult={tdaResult}
                          currentEpsilon={currentEpsilon}
                          onSelectEpsilon={onEpsilonChange}
                        />
                      </div>
                      <div className="min-h-[240px]">
                        <PersistenceLandscapes
                          tdaResult={tdaResult}
                          currentEpsilon={currentEpsilon}
                        />
                      </div>
                    </div>
                  )}

                  {diagramSubView === 'diagram' && (
                    <div className="w-full h-full min-h-[460px]">
                      <PersistenceDiagram
                        tdaResult={tdaResult}
                        currentEpsilon={currentEpsilon}
                        selectedPair={selectedPair}
                        hoveredPair={hoveredPair}
                        noiseThreshold={noiseThreshold}
                        colorBlindness={colorBlindness}
                        magneticSnap={settings.magneticSnap}
                        onHoverPair={onHoverPair}
                        onSelectPair={onSelectPair}
                        onOpenExplain={onOpenExplain}
                      />
                    </div>
                  )}

                  {diagramSubView === 'barcode' && (
                    <div className="w-full h-full min-h-[460px]">
                      <PersistenceBarcode
                        tdaResult={tdaResult}
                        currentEpsilon={currentEpsilon}
                        selectedPair={selectedPair}
                        hoveredPair={hoveredPair}
                        noiseThreshold={noiseThreshold}
                        colorBlindness={colorBlindness}
                        onHoverPair={onHoverPair}
                        onSelectPair={onSelectPair}
                      />
                    </div>
                  )}

                  {diagramSubView === 'betti' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[460px]">
                      <BettiAndEulerCurves
                        tdaResult={tdaResult}
                        currentEpsilon={currentEpsilon}
                        onSelectEpsilon={onEpsilonChange}
                      />
                      <PersistenceLandscapes
                        tdaResult={tdaResult}
                        currentEpsilon={currentEpsilon}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Floating Minimalist Filtration Player */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl transition-all duration-200 ${
          isPlayerCollapsed ? 'px-4 py-2' : 'px-6 py-3 max-w-2xl w-[90%]'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onTogglePlay}
            className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg transition shrink-0"
            title={isPlaying ? 'Pause filtration' : 'Play filtration animation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {!isPlayerCollapsed && (
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Filtration Scale (ε)</span>
                <span className="text-cyan-300 font-bold">{currentEpsilon.toFixed(3)} / {maxEps.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={maxEps}
                step="0.005"
                value={currentEpsilon}
                onChange={(e) => onEpsilonChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {!isPlayerCollapsed && activeComplex && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-zinc-300 border-l border-zinc-800 pl-4 shrink-0">
              <div>
                <span className="text-zinc-500">β₀:</span>{' '}
                <span className="text-amber-400 font-bold">{activeComplex.betti0}</span>
              </div>
              <div>
                <span className="text-zinc-500">β₁:</span>{' '}
                <span className="text-cyan-400 font-bold">{activeComplex.betti1}</span>
              </div>
              <div>
                <span className="text-zinc-500">β₂:</span>{' '}
                <span className="text-emerald-400 font-bold">{activeComplex.betti2}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsPlayerCollapsed(!isPlayerCollapsed)}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition shrink-0"
            title={isPlayerCollapsed ? 'Expand filtration player' : 'Collapse filtration player'}
          >
            {isPlayerCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
