/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  ColorMapScheme,
  DatasetConfig,
  DatasetType,
  DistanceMetric,
  FiltrationModel,
  SubsamplingMethod,
} from '../types/tda';
import {
  Upload,
  RefreshCw,
  Sliders,
  Palette,
  Compass,
  Database,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { playSoundFeedback } from '../utils/audioSonification';

interface DatasetControlPanelProps {
  config: DatasetConfig;
  colorScheme: ColorMapScheme;
  pointSize: number;
  ballOpacity: number;
  isComputing: boolean;
  onConfigChange: (newConfig: Partial<DatasetConfig>) => void;
  onColorSchemeChange: (scheme: ColorMapScheme) => void;
  onPointSizeChange: (size: number) => void;
  onBallOpacityChange: (opacity: number) => void;
  onRegenerate: () => void;
  onFileUpload: (file: File) => void;
  onOpenInspector?: () => void;
}

const PRESETS: { type: DatasetType; label: string; desc: string; expected: string }[] = [
  {
    type: 'torus',
    label: 'Torus (T²)',
    desc: 'Product manifold S¹ × S¹',
    expected: 'β₀=1, β₁=2, β₂=1',
  },
  {
    type: 'sphere',
    label: '2-Sphere (S²)',
    desc: 'Hollow spherical shell cavity',
    expected: 'β₀=1, β₁=0, β₂=1',
  },
  {
    type: 'circle',
    label: 'Circle (S¹)',
    desc: '1-dimensional closed loop',
    expected: 'β₀=1, β₁=1, β₂=0',
  },
  {
    type: 'figure_eight',
    label: 'Figure Eight',
    desc: 'Wedge sum S¹ ∨ S¹',
    expected: 'β₀=1, β₁=2, β₂=0',
  },
  {
    type: 'double_torus',
    label: 'Double Torus (Genus 2)',
    desc: 'Connected sum with 4 cycles',
    expected: 'β₀=1, β₁=4, β₂=1',
  },
  {
    type: 'trefoil_knot',
    label: 'Trefoil Knot',
    desc: 'Non-trivial knotted embedding',
    expected: 'β₀=1, β₁=1, β₂=0',
  },
  {
    type: 'klein_bottle',
    label: 'Klein Bottle',
    desc: 'Non-orientable immersion',
    expected: 'β₀=1, β₁=2, β₂=1 (Z₂)',
  },
  {
    type: 'gaussian_mixture',
    label: 'Gaussian Clusters',
    desc: '3 multi-modal partitions',
    expected: 'β₀=3, β₁=0, β₂=0',
  },
  {
    type: 'cubical_grid',
    label: 'Cubical Grid / Saddle',
    desc: '2D/3D scalar field topology',
    expected: 'β₀=2, β₁=1, β₂=0',
  },
  {
    type: 'lorenz_attractor',
    label: 'Lorenz Attractor',
    desc: 'Chaotic strange attractor',
    expected: 'Fractal butterfly loops',
  },
];

export const DatasetControlPanel: React.FC<DatasetControlPanelProps> = ({
  config,
  colorScheme,
  pointSize,
  ballOpacity,
  isComputing,
  onConfigChange,
  onColorSchemeChange,
  onPointSizeChange,
  onBallOpacityChange,
  onRegenerate,
  onFileUpload,
  onOpenInspector,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playSoundFeedback('click');
      onFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      playSoundFeedback('click');
      onFileUpload(file);
    }
  };

  return (
    <div
      id="dataset-control-panel"
      className="bg-[#121215] rounded-xl border border-[#27272a] p-4 shadow-xl flex flex-col gap-3.5 text-xs font-sans"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-zinc-100 tracking-wider uppercase font-mono">
            Manifold & Filtration Engine
          </h2>
        </div>
        <button
          id="btn-regenerate-data"
          onClick={() => {
            playSoundFeedback('click');
            onRegenerate();
          }}
          disabled={isComputing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-xs font-medium rounded-lg border border-zinc-700 transition disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? 'animate-spin' : ''}`} />
          <span>{isComputing ? 'Computing...' : 'Re-sample'}</span>
        </button>
      </div>

      {/* Filtration Complex Model Selector */}
      <div className="space-y-1.5">
        <label className="tda-section-label text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1 font-bold">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Filtration Complex Formalism</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5 font-mono">
          <button
            id="model-btn-vietoris"
            onClick={() => {
              playSoundFeedback('toggle');
              onConfigChange({ filtrationModel: 'vietoris_rips' });
            }}
            className={`p-2 rounded-lg text-left border transition ${
              config.filtrationModel === 'vietoris_rips' || !config.filtrationModel
                ? 'tda-preset-selected shadow-sm font-bold'
                : 'tda-preset-unselected'
            }`}
          >
            <div className="text-[11px] font-bold tda-card-title">Vietoris-Rips</div>
            <div className="text-[9px] mt-0.5 tda-card-desc opacity-90">VR(X, ε) Pairwise Cliques</div>
          </button>

          <button
            id="model-btn-alpha"
            onClick={() => {
              playSoundFeedback('toggle');
              onConfigChange({ filtrationModel: 'alpha_complex' });
            }}
            className={`p-2 rounded-lg text-left border transition ${
              config.filtrationModel === 'alpha_complex'
                ? 'tda-preset-selected shadow-sm font-bold'
                : 'tda-preset-unselected'
            }`}
          >
            <div className="text-[11px] font-bold tda-card-title">Alpha Complex</div>
            <div className="text-[9px] mt-0.5 tda-card-desc opacity-90">Alpha(X, α) Delaunay Sub</div>
          </button>
        </div>
      </div>

      {/* Dataset Presets Grid */}
      <div className="space-y-1.5">
        <label className="tda-section-label text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
          Target Manifold Topology
        </label>
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {PRESETS.map((preset) => {
            const isSelected = config.type === preset.type;
            return (
              <button
                key={preset.type}
                id={`preset-btn-${preset.type}`}
                onClick={() => {
                  playSoundFeedback('click');
                  onConfigChange({ type: preset.type, name: preset.label });
                }}
                className={`p-2 rounded-lg text-left border transition flex flex-col justify-between ${
                  isSelected
                    ? 'tda-preset-selected shadow-sm'
                    : 'tda-preset-unselected'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between font-mono tda-card-title">
                  <span>{preset.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 tda-selected-dot" />}
                </div>
                <div className="text-[10px] line-clamp-1 mt-0.5 tda-card-desc">
                  {preset.desc}
                </div>
                <div className="text-[9px] font-mono mt-1 tda-card-formula">
                  {preset.expected}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* File Upload Area & Inspector Trigger */}
      <div className="flex flex-col gap-1.5">
        <div
          id="file-upload-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-700 hover:border-cyan-400 bg-[#09090b] hover:bg-zinc-900/60 rounded-lg p-2 text-center cursor-pointer transition flex items-center justify-center gap-2 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.json,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400 transition" />
          <div className="text-left">
            <div className="text-[11px] font-medium text-zinc-300 group-hover:text-cyan-200 font-mono">
              Quick CSV / JSON Upload
            </div>
            <div className="text-[9px] text-zinc-400">
              Drag & drop numerical dataset
            </div>
          </div>
        </div>

        {onOpenInspector && (
          <button
            id="btn-open-inspector"
            onClick={() => {
              playSoundFeedback('click');
              onOpenInspector();
            }}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 rounded-lg border border-zinc-800 hover:border-cyan-500/40 text-[11px] font-mono flex items-center justify-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Advanced Matrix Inspector</span>
          </button>
        )}
      </div>

      {/* Parameter Sliders */}
      <div className="space-y-2.5 pt-2 border-t border-[#27272a]">
        {/* Point Count N */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Sample Cardinality (|X|):</span>
            <span className="text-zinc-100 font-bold">{config.numPoints}</span>
          </div>
          <input
            id="slider-num-points"
            type="range"
            min="60"
            max="1000"
            step="20"
            value={config.numPoints}
            onChange={(e) => onConfigChange({ numPoints: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Noise Level */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Perturbation Noise (σ):</span>
            <span className="text-amber-300 font-bold">{config.noise.toFixed(2)}</span>
          </div>
          <input
            id="slider-noise-level"
            type="range"
            min="0"
            max="0.5"
            step="0.02"
            value={config.noise}
            onChange={(e) => onConfigChange({ noise: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Distance Metric */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Metric Space d(x, y):</span>
            <span className="text-cyan-300 font-mono uppercase">{config.metric}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
            {(['euclidean', 'manhattan', 'cosine'] as DistanceMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  playSoundFeedback('toggle');
                  onConfigChange({ metric: m });
                }}
                className={`py-1 rounded border transition ${
                  config.metric === m
                    ? 'bg-zinc-800 border-zinc-600 text-cyan-300 font-bold'
                    : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m === 'euclidean' ? 'L₂ Metric' : m === 'manhattan' ? 'L₁ Metric' : 'Cosine'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
