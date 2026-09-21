/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Database,
  Layers,
  Sparkles,
  GitCompare,
  Download,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Sliders,
  X,
  Compass,
  Zap,
  FileSpreadsheet,
  Share2,
  HelpCircle,
  Scale,
  Shield,
  FileText,
} from 'lucide-react';
import { DatasetConfig, DatasetType, DistanceMetric, FiltrationModel } from '../types/tda';
import { playSoundFeedback } from '../utils/audioSonification';

interface CommandItem {
  id: string;
  category: 'Datasets' | 'Filtration Model' | 'Distance Metric' | 'Controls' | 'Modals' | 'Tools';
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  config: DatasetConfig;
  isPlaying: boolean;
  onConfigChange: (newConfig: Partial<DatasetConfig>) => void;
  onTogglePlay: () => void;
  onResetEpsilon: () => void;
  onToggleBalls: () => void;
  onToggleEdges: () => void;
  onToggleTriangles: () => void;
  onToggleGeneratorCycle: () => void;
  onOpenComparison: () => void;
  onOpenTheory: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onOpenPresentation: () => void;
  onOpenExplain: () => void;
  onOpenInspector?: () => void;
  onOpenTutorial?: () => void;
  onShareSession?: () => void;
  onOpenLegal: (type: 'terms' | 'privacy' | 'citation') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  config,
  isPlaying,
  onConfigChange,
  onTogglePlay,
  onResetEpsilon,
  onToggleBalls,
  onToggleEdges,
  onToggleTriangles,
  onToggleGeneratorCycle,
  onOpenComparison,
  onOpenTheory,
  onOpenExport,
  onOpenSettings,
  onOpenPresentation,
  onOpenExplain,
  onOpenInspector,
  onOpenTutorial,
  onShareSession,
  onOpenLegal,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Tools & Quick Share
    ...(onShareSession
      ? [
          {
            id: 'tool-share',
            category: 'Tools' as const,
            label: 'Copy Mathematical Session Link (URL Hash)',
            sublabel: 'Encodes point count, noise, metric, and epsilon into a compressed share link',
            icon: <Share2 className="w-4 h-4 text-cyan-400" />,
            shortcut: 'Share',
            action: onShareSession,
          },
        ]
      : []),
    ...(onOpenInspector
      ? [
          {
            id: 'tool-inspector',
            category: 'Tools' as const,
            label: 'Open Dataset Matrix Inspector & Preprocessor',
            sublabel: 'Multi-column CSV/JSON preview, normalization, and coordinate projection',
            icon: <FileSpreadsheet className="w-4 h-4 text-cyan-400" />,
            action: onOpenInspector,
          },
        ]
      : []),
    ...(onOpenTutorial
      ? [
          {
            id: 'tool-tutorial',
            category: 'Tools' as const,
            label: 'Launch In-App Interactive Tutorial Guide',
            sublabel: '5-step walkthrough of simplicial complexes, barcodes, and landscapes',
            icon: <HelpCircle className="w-4 h-4 text-purple-400" />,
            action: onOpenTutorial,
          },
        ]
      : []),

    // Datasets
    {
      id: 'ds-torus',
      category: 'Datasets',
      label: 'Torus (T²)',
      sublabel: 'Product manifold S¹ × S¹ (β₀=1, β₁=2, β₂=1)',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'torus', name: 'Torus (T²)' }),
    },
    {
      id: 'ds-sphere',
      category: 'Datasets',
      label: '2-Sphere (S²)',
      sublabel: 'Hollow spherical cavity (β₀=1, β₁=0, β₂=1)',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'sphere', name: '2-Sphere (S²)' }),
    },
    {
      id: 'ds-circle',
      category: 'Datasets',
      label: 'Circle (S¹)',
      sublabel: '1D closed loop (β₀=1, β₁=1, β₂=0)',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'circle', name: 'Circle (S¹)' }),
    },
    {
      id: 'ds-figure-eight',
      category: 'Datasets',
      label: 'Figure Eight (S¹ ∨ S¹)',
      sublabel: 'Two tangent loops (β₀=1, β₁=2, β₂=0)',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'figure_eight', name: 'Figure Eight' }),
    },
    {
      id: 'ds-double-torus',
      category: 'Datasets',
      label: 'Double Torus (Genus 2)',
      sublabel: 'Connected sum with 4 independent cycles (β₁=4)',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'double_torus', name: 'Double Torus (Genus 2)' }),
    },
    {
      id: 'ds-trefoil',
      category: 'Datasets',
      label: 'Trefoil Knot',
      sublabel: 'Non-trivial knotted embedding of S¹ in ℝ³',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'trefoil_knot', name: 'Trefoil Knot' }),
    },
    {
      id: 'ds-klein',
      category: 'Datasets',
      label: 'Klein Bottle',
      sublabel: 'Non-orientable figure-8 3D immersion',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'klein_bottle', name: 'Klein Bottle' }),
    },
    {
      id: 'ds-lorenz',
      category: 'Datasets',
      label: 'Lorenz Strange Attractor',
      sublabel: 'Chaotic differential dynamical manifold',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'lorenz_attractor', name: 'Lorenz Attractor' }),
    },
    {
      id: 'ds-gmm',
      category: 'Datasets',
      label: 'Gaussian Mixture Clusters',
      sublabel: '3 well-separated multi-modal clusters (β₀=3)',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'gaussian_mixture', name: 'Gaussian Mixture' }),
    },
    {
      id: 'ds-cubical',
      category: 'Datasets',
      label: 'Cubical Grid / Dual-Peak Elevation',
      sublabel: '2D/3D topological scalar landscape',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => onConfigChange({ type: 'cubical_grid', name: 'Cubical Grid' }),
    },

    // Filtration Models
    {
      id: 'model-vr',
      category: 'Filtration Model',
      label: 'Vietoris-Rips Complex VR(X, ε)',
      sublabel: 'Pairwise clique filtration (d(u,v) ≤ ε)',
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      action: () => onConfigChange({ filtrationModel: 'vietoris_rips' }),
    },
    {
      id: 'model-alpha',
      category: 'Filtration Model',
      label: 'Alpha Complex Alpha(X, α)',
      sublabel: 'Delaunay triangulation subcomplex with circumradii',
      icon: <Layers className="w-4 h-4 text-emerald-400" />,
      action: () => onConfigChange({ filtrationModel: 'alpha_complex' }),
    },

    // Distance Metrics
    {
      id: 'metric-l2',
      category: 'Distance Metric',
      label: 'Euclidean Metric (L₂)',
      icon: <Compass className="w-4 h-4 text-amber-400" />,
      action: () => onConfigChange({ metric: 'euclidean' }),
    },
    {
      id: 'metric-l1',
      category: 'Distance Metric',
      label: 'Manhattan Metric (L₁)',
      icon: <Compass className="w-4 h-4 text-amber-400" />,
      action: () => onConfigChange({ metric: 'manhattan' }),
    },
    {
      id: 'metric-cos',
      category: 'Distance Metric',
      label: 'Cosine Distance Metric',
      icon: <Compass className="w-4 h-4 text-amber-400" />,
      action: () => onConfigChange({ metric: 'cosine' }),
    },

    // Controls
    {
      id: 'ctrl-play',
      category: 'Controls',
      label: isPlaying ? 'Pause Filtration Time Machine' : 'Play Filtration Time Machine',
      icon: isPlaying ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-cyan-400" />,
      shortcut: 'Space',
      action: onTogglePlay,
    },
    {
      id: 'ctrl-reset',
      category: 'Controls',
      label: 'Reset Filtration Scale to ε = 0',
      icon: <RotateCcw className="w-4 h-4 text-zinc-400" />,
      action: onResetEpsilon,
    },
    {
      id: 'ctrl-generator',
      category: 'Controls',
      label: 'Toggle Homological Generator Cycle Glow in 3D',
      icon: <Eye className="w-4 h-4 text-cyan-400" />,
      action: onToggleGeneratorCycle,
    },
    {
      id: 'ctrl-balls',
      category: 'Controls',
      label: 'Toggle Vertex Ball Radii (ε/2)',
      icon: <Eye className="w-4 h-4 text-zinc-400" />,
      action: onToggleBalls,
    },
    {
      id: 'ctrl-edges',
      category: 'Controls',
      label: 'Toggle 1-Skeleton Simplicial Edges',
      icon: <Eye className="w-4 h-4 text-zinc-400" />,
      action: onToggleEdges,
    },
    {
      id: 'ctrl-triangles',
      category: 'Controls',
      label: 'Toggle 2-Skeleton Simplicial Triangles',
      icon: <Eye className="w-4 h-4 text-zinc-400" />,
      action: onToggleTriangles,
    },

    // Modals & Studios
    {
      id: 'studio-presentation',
      category: 'Modals',
      label: 'Distraction-Free Snapshot & Presentation Mode',
      sublabel: 'Fullscreen canvas with hidden UI for recordings & figures',
      icon: <Eye className="w-4 h-4 text-purple-400" />,
      shortcut: 'Cmd + P',
      action: onOpenPresentation,
    },
    {
      id: 'studio-settings',
      category: 'Modals',
      label: 'Preferences, Engine & Accessibility Settings',
      sublabel: 'WebGL/Canvas 2D, Color-blindness palettes, Float32/Float64',
      icon: <Sliders className="w-4 h-4 text-cyan-400" />,
      shortcut: 'Cmd + ,',
      action: onOpenSettings,
    },
    {
      id: 'studio-explain',
      category: 'Modals',
      label: 'Explain Selected Topological Feature',
      sublabel: 'Deep dive into algebraic significance, stability, and generator cycles',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      action: onOpenExplain,
    },
    {
      id: 'modal-compare',
      category: 'Modals',
      label: 'Topological Distance & Bottleneck Matching Studio',
      sublabel: 'Calculate d_B and W₂ distances with bipartite graph',
      icon: <GitCompare className="w-4 h-4 text-cyan-400" />,
      shortcut: 'Cmd + B',
      action: onOpenComparison,
    },
    {
      id: 'modal-theory',
      category: 'Modals',
      label: 'Algebraic Topology Foundations & Proofs Guide',
      sublabel: 'Simplicial complexes, boundary reduction, stability theorems',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      shortcut: 'Cmd + T',
      action: onOpenTheory,
    },
    {
      id: 'modal-export',
      category: 'Modals',
      label: 'Academic LaTeX & Vector Graphic Export Studio',
      sublabel: 'Generate LaTeX tables, SVG vectors, and Python scripts',
      icon: <Download className="w-4 h-4 text-emerald-400" />,
      shortcut: 'Cmd + E',
      action: onOpenExport,
    },
    {
      id: 'modal-cite',
      category: 'Modals',
      label: 'Academic Citation & Creator Info (Dhurgham Alsaadi)',
      sublabel: 'Copy BibTeX attribution and open software license',
      icon: <FileText className="w-4 h-4 text-cyan-400" />,
      action: () => onOpenLegal('citation'),
    },
    {
      id: 'modal-privacy',
      category: 'Modals',
      label: 'Privacy Statement & Zero-Telemetry Guarantee',
      sublabel: '100% in-browser client-side computation policy',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      action: () => onOpenLegal('privacy'),
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    const text = `${cmd.label} ${cmd.sublabel || ''} ${cmd.category}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        playSoundFeedback('click');
        selected.action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="command-palette-modal"
        className="w-full max-w-xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-200 flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800/90 gap-3 bg-zinc-900/40">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search manifolds, metrics, actions..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-500 font-mono"
          />
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">
              No matching mathematical commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    playSoundFeedback('click');
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    isSelected ? 'bg-zinc-800 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                      {cmd.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold font-mono flex items-center gap-2">
                        <span>{cmd.label}</span>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-sans px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.sublabel && (
                        <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 font-sans">
                          {cmd.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded shadow-sm">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-900/30 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-zinc-400">Architect: Dhurgham Alsaadi</span>
        </div>
      </div>
    </div>
  );
};
