/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { X, GitCompare, ArrowRight, ShieldCheck, RefreshCw, Sliders, Layers, Info } from 'lucide-react';
import { DatasetConfig, MatchingEdge, PersistencePair, TDAResult } from '../types/tda';
import { generatePoints } from '../utils/pointGenerators';
import { computeDiagramDistances, computeVietorisRipsHomology } from '../utils/tdaEngine';

interface TopologicalComparisonModalProps {
  isOpen: boolean;
  baseConfig: DatasetConfig;
  baseTdaResult: TDAResult | null;
  onClose: () => void;
}

export const TopologicalComparisonModal: React.FC<TopologicalComparisonModalProps> = ({
  isOpen,
  baseConfig,
  baseTdaResult,
  onClose,
}) => {
  const [compShape, setCompShape] = useState<string>('circle');
  const [compNoise, setCompNoise] = useState<number>(0.12);
  const [compResult, setCompResult] = useState<TDAResult | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [selectedDim, setSelectedDim] = useState<0 | 1>(1);

  const [distances, setDistances] = useState<{
    bottleneckH0: number;
    bottleneckH1: number;
    w2H0: number;
    w2H1: number;
    edgesH0: MatchingEdge[];
    edgesH1: MatchingEdge[];
  } | null>(null);

  const [hoveredEdge, setHoveredEdge] = useState<MatchingEdge | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !baseTdaResult) return;
    runComparison();
  }, [isOpen, compShape, compNoise]);

  const runComparison = () => {
    setIsComputing(true);
    setTimeout(() => {
      const configB: DatasetConfig = {
        ...baseConfig,
        type: compShape as any,
        name: `Target: ${compShape}`,
        noise: compNoise,
      };

      const ptsB = generatePoints(configB);
      const resB = computeVietorisRipsHomology(ptsB, configB);
      setCompResult(resB);

      if (baseTdaResult) {
        const d0 = computeDiagramDistances(baseTdaResult.pairs, resB.pairs, 0);
        const d1 = computeDiagramDistances(baseTdaResult.pairs, resB.pairs, 1);
        setDistances({
          bottleneckH0: d0.bottleneck,
          bottleneckH1: d1.bottleneck,
          w2H0: d0.wasserstein2,
          w2H1: d1.wasserstein2,
          edgesH0: d0.matchingEdges,
          edgesH1: d1.matchingEdges,
        });
      }
      setIsComputing(false);
    }, 40);
  };

  // Render D3 Bipartite Matching Persistence Diagram
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !baseTdaResult || !compResult || !distances) return;

    const width = containerRef.current.clientWidth || 600;
    const height = 360;
    const margin = { top: 25, right: 30, bottom: 40, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const maxEps = Math.max(baseTdaResult.maxEpsilon, compResult.maxEpsilon) * 1.05;

    const scaleX = d3.scaleLinear().domain([0, maxEps]).range([0, innerW]);
    const scaleY = d3.scaleLinear().domain([0, maxEps]).range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Diagonal y = x
    g.append('line')
      .attr('x1', scaleX(0))
      .attr('y1', scaleY(0))
      .attr('x2', scaleX(maxEps))
      .attr('y2', scaleY(maxEps))
      .attr('stroke', '#3f3f46')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    // Axes
    const xAxis = d3.axisBottom(scaleX).ticks(6).tickFormat((d) => Number(d).toFixed(2));
    const yAxis = d3.axisLeft(scaleY).ticks(6).tickFormat((d) => Number(d).toFixed(2));

    const gx = g.append('g').attr('transform', `translate(0, ${innerH})`).call(xAxis);
    gx.selectAll('.tick line').attr('stroke', '#27272a');
    gx.selectAll('.tick text').attr('fill', '#a1a1aa').attr('font-size', '10px');
    gx.select('.domain').attr('stroke', '#3f3f46');

    const gy = g.append('g').call(yAxis);
    gy.selectAll('.tick line').attr('stroke', '#27272a');
    gy.selectAll('.tick text').attr('fill', '#a1a1aa').attr('font-size', '10px');
    gy.select('.domain').attr('stroke', '#3f3f46');

    // Axis Labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#71717a')
      .attr('font-size', '11px')
      .attr('font-mono', 'true')
      .text('Birth Coordinate (b)');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#71717a')
      .attr('font-size', '11px')
      .attr('font-mono', 'true')
      .text('Death Coordinate (d)');

    const currentEdges = selectedDim === 1 ? distances.edgesH1 : distances.edgesH0;

    // 1. Draw Bipartite Matching Edges
    const edgesGroup = g.append('g').attr('class', 'matching-edges');
    currentEdges.forEach((edge) => {
      const isHovered = hoveredEdge?.sourceId === edge.sourceId;
      const x1 = scaleX(edge.sourceCoords[0]);
      const y1 = scaleY(edge.sourceCoords[1]);
      const x2 = scaleX(edge.targetCoords[0]);
      const y2 = scaleY(edge.targetCoords[1]);

      edgesGroup.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', edge.isToDiagonal ? '#a1a1aa' : isHovered ? '#38bdf8' : '#6366f1')
        .attr('stroke-width', isHovered ? 2.5 : edge.isToDiagonal ? 1 : 1.5)
        .attr('stroke-dasharray', edge.isToDiagonal ? '3,3' : 'none')
        .attr('stroke-opacity', isHovered ? 1 : 0.6)
        .attr('class', 'cursor-pointer')
        .on('mouseenter', () => setHoveredEdge(edge))
        .on('mouseleave', () => setHoveredEdge(null));
    });

    // 2. Draw Diagram A Points (Cyan Circles)
    const pairsA = baseTdaResult.pairs.filter((p) => p.dimension === selectedDim && !p.isInfinite);
    pairsA.forEach((p) => {
      g.append('circle')
        .attr('cx', scaleX(p.birth))
        .attr('cy', scaleY(p.death))
        .attr('r', 5)
        .attr('fill', '#06b6d4')
        .attr('stroke', '#09090b')
        .attr('stroke-width', 1.5);
    });

    // 3. Draw Diagram B Points (Amber Squares)
    const pairsB = compResult.pairs.filter((p) => p.dimension === selectedDim && !p.isInfinite);
    pairsB.forEach((p) => {
      const sz = 8;
      g.append('rect')
        .attr('x', scaleX(p.birth) - sz / 2)
        .attr('y', scaleY(p.death) - sz / 2)
        .attr('width', sz)
        .attr('height', sz)
        .attr('fill', '#f59e0b')
        .attr('stroke', '#09090b')
        .attr('stroke-width', 1.5);
    });

  }, [baseTdaResult, compResult, distances, selectedDim, hoveredEdge]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#121215] border border-[#27272a] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 tracking-wide font-mono uppercase">
                Topological Stability & Metric Distance Matcher
              </h2>
              <p className="text-[11px] text-zinc-400">
                Exact Bottleneck Distance ($d_B$) and 2-Wasserstein Distance ($W_2$) bipartite matching.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-zinc-300">
          {/* Controls Bar */}
          <div className="bg-[#09090b] p-4 rounded-xl border border-[#27272a] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">Target Manifold:</label>
                <select
                  value={compShape}
                  onChange={(e) => setCompShape(e.target.value)}
                  className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-zinc-100 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="circle">Circle S¹</option>
                  <option value="figure_eight">Figure Eight S¹ ∨ S¹</option>
                  <option value="torus">Torus T²</option>
                  <option value="sphere">2-Sphere S²</option>
                  <option value="swiss_roll">Swiss Roll</option>
                  <option value="trefoil_knot">Trefoil Knot</option>
                  <option value="gaussian_mixture">Gaussian Mixture (3 Clusters)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">
                  Target Noise Level (σ): <strong className="text-amber-300 font-mono">{compNoise.toFixed(2)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.02"
                  value={compNoise}
                  onChange={(e) => setCompNoise(parseFloat(e.target.value))}
                  className="w-32 h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">Homology Dimension:</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedDim(0)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                      selectedDim === 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    H₀ (Components)
                  </button>
                  <button
                    onClick={() => setSelectedDim(1)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                      selectedDim === 1
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    H₁ (Loops)
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={runComparison}
              disabled={isComputing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-mono font-medium border border-zinc-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? 'animate-spin' : ''}`} />
              <span>{isComputing ? 'Computing...' : 'Recalculate Stability'}</span>
            </button>
          </div>

          {/* Metric Distance Invariant Cards */}
          {distances && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
              <div className="bg-[#09090b] p-4 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/80 pb-1.5">
                  <span className="font-bold text-cyan-300 uppercase">Bottleneck Distance d_B(D_A, D_B)</span>
                  <span className="text-[10px] text-zinc-500">L_∞ Optimal Transport</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-zinc-400">H₁ Loops Bottleneck:</span>
                  <span className="text-base font-bold text-zinc-100">{distances.bottleneckH1}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-zinc-400">H₀ Clusters Bottleneck:</span>
                  <span className="text-sm font-semibold text-amber-300">{distances.bottleneckH0}</span>
                </div>
              </div>

              <div className="bg-[#09090b] p-4 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/80 pb-1.5">
                  <span className="font-bold text-indigo-300 uppercase">2-Wasserstein Distance W₂(D_A, D_B)</span>
                  <span className="text-[10px] text-zinc-500">L₂ Earth Mover Norm</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-zinc-400">H₁ Loops Wasserstein:</span>
                  <span className="text-base font-bold text-indigo-200">{distances.w2H1}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-zinc-400">H₀ Clusters Wasserstein:</span>
                  <span className="text-sm font-semibold text-amber-300">{distances.w2H0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bipartite Graph Persistence Diagram */}
          <div
            ref={containerRef}
            className="bg-[#09090b] p-4 rounded-xl border border-[#27272a] space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  Dataset A: {baseConfig.name}
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 bg-amber-400 inline-block" />
                  Dataset B: {compShape}
                </span>
                <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <span className="w-4 h-0.5 bg-indigo-500 inline-block" />
                  Matching Bijection
                </span>
              </div>
              {hoveredEdge && (
                <div className="text-[11px] text-cyan-300">
                  Edge Distance: ||p_A - p_B||_∞ = {hoveredEdge.distance.toFixed(4)}
                </div>
              )}
            </div>

            <svg ref={svgRef} className="w-full h-80 block" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#27272a] bg-[#09090b] flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>Cohen-Steiner-Edelsbrunner-Harer Stability Matching Invariant</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
