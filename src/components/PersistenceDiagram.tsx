/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ColorBlindnessMode, PersistencePair, TDAResult } from '../types/tda';
import { Sparkles, HelpCircle, Magnet, ShieldCheck, Zap } from 'lucide-react';
import { HOMOLOGY_COLORS, getDimensionColor } from '../utils/colors';
import { playPairSonification, playSoundFeedback } from '../utils/audioSonification';

interface PersistenceDiagramProps {
  tdaResult: TDAResult | null;
  currentEpsilon: number;
  selectedPair: PersistencePair | null;
  hoveredPair: PersistencePair | null;
  noiseThreshold: number;
  colorBlindness: ColorBlindnessMode;
  magneticSnap?: boolean;
  showConfidenceBand?: boolean;
  isLightTheme?: boolean;
  onHoverPair: (pair: PersistencePair | null) => void;
  onSelectPair: (pair: PersistencePair | null) => void;
  onThresholdChange?: (val: number) => void;
  onOpenExplain?: (pair: PersistencePair) => void;
}

export const PersistenceDiagram: React.FC<PersistenceDiagramProps> = ({
  tdaResult,
  currentEpsilon,
  selectedPair,
  hoveredPair,
  noiseThreshold,
  colorBlindness,
  magneticSnap = true,
  showConfidenceBand = true,
  isLightTheme = false,
  onHoverPair,
  onSelectPair,
  onOpenExplain,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [visibleDims, setVisibleDims] = useState<{ 0: boolean; 1: boolean; 2: boolean }>({
    0: true,
    1: true,
    2: true,
  });

  const [confidenceBandEnabled, setConfidenceBandEnabled] = useState<boolean>(showConfidenceBand);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const [tooltipData, setTooltipData] = useState<{
    pair: PersistencePair;
    x: number;
    y: number;
    isSnapped?: boolean;
    isSignificant?: boolean;
  } | null>(null);

  // Resize observer to ensure full responsiveness without height feedback loops
  useEffect(() => {
    if (!chartWrapperRef.current) return;
    let animId: number;

    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 50 && height > 50) {
            setDimensions((prev) => {
              const newW = Math.round(width);
              const newH = Math.round(height);
              // Only update if difference is at least 6px to avoid recursive re-render loop
              if (Math.abs(prev.width - newW) < 6 && Math.abs(prev.height - newH) < 6) {
                return prev;
              }
              return { width: newW, height: newH };
            });
          }
        }
      });
    });

    observer.observe(chartWrapperRef.current);
    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !chartWrapperRef.current || !tdaResult) return;

    const width = dimensions.width || chartWrapperRef.current.clientWidth || 450;
    const height = dimensions.height || chartWrapperRef.current.clientHeight || 320;
    const margin = { top: 25, right: 25, bottom: 40, left: 45 };

    const innerWidth = Math.max(10, width - margin.left - margin.right);
    const innerHeight = Math.max(10, height - margin.top - margin.bottom);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const maxEps = tdaResult.maxEpsilon * 1.05 || 1.0;

    // Scales
    const scaleX = d3.scaleLinear().domain([0, maxEps]).range([0, innerWidth]);
    const scaleY = d3.scaleLinear().domain([0, maxEps]).range([innerHeight, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Clip path
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'diagram-clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    const chartArea = g.append('g').attr('clip-path', 'url(#diagram-clip)');

    const diagonalColor = isLightTheme ? '#cbd5e1' : '#3f3f46';
    const diagonalTextColor = isLightTheme ? '#64748b' : '#71717a';

    // Diagonal line y = x
    chartArea
      .append('line')
      .attr('x1', scaleX(0))
      .attr('y1', scaleY(0))
      .attr('x2', scaleX(maxEps * 2))
      .attr('y2', scaleY(maxEps * 2))
      .attr('stroke', diagonalColor)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    // Diagonal label
    chartArea
      .append('text')
      .attr('x', scaleX(maxEps * 0.65))
      .attr('y', scaleY(maxEps * 0.65) - 6)
      .attr('fill', diagonalTextColor)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text('y = x (Diagonal)');

    // Bootstrapped 95% Confidence Band (Fasy et al. 2014)
    const bootstrapThreshold = tdaResult.bootstrapBand || 0.08;
    if (confidenceBandEnabled && bootstrapThreshold > 0) {
      const bandPoints = Array.from({ length: 30 }, (_, i) => ({
        x: (i * maxEps) / 29,
      }));

      const bandArea = d3
        .area<{ x: number }>()
        .x((d) => scaleX(d.x))
        .y0((d) => scaleY(d.x))
        .y1((d) => scaleY(d.x + bootstrapThreshold));

      chartArea
        .append('path')
        .datum(bandPoints)
        .attr('d', bandArea as any)
        .attr('fill', '#38bdf8')
        .attr('fill-opacity', 0.12)
        .attr('stroke', '#38bdf8')
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      chartArea
        .append('text')
        .attr('x', scaleX(maxEps * 0.2))
        .attr('y', scaleY(maxEps * 0.2 + bootstrapThreshold) - 4)
        .attr('fill', '#38bdf8')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(`95% Conf Band (2c = ${bootstrapThreshold})`);
    }

    // Active Filtration Cursor Lines
    if (currentEpsilon > 0) {
      chartArea
        .append('line')
        .attr('x1', scaleX(currentEpsilon))
        .attr('y1', 0)
        .attr('x2', scaleX(currentEpsilon))
        .attr('y2', innerHeight)
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '3,3');

      chartArea
        .append('line')
        .attr('x1', 0)
        .attr('y1', scaleY(currentEpsilon))
        .attr('x2', innerWidth)
        .attr('y2', scaleY(currentEpsilon))
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '3,3');

      chartArea
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', Math.max(0, scaleX(currentEpsilon)))
        .attr('height', Math.max(0, scaleY(currentEpsilon)))
        .attr('fill', '#0284c7')
        .attr('fill-opacity', 0.04);
    }

    const gridColor = isLightTheme ? '#e2e8f0' : '#27272a';
    const axisTextColor = isLightTheme ? '#475569' : '#71717a';
    const axisDomainColor = isLightTheme ? '#94a3b8' : '#3f3f46';
    const axisTitleColor = isLightTheme ? '#1e293b' : '#a1a1aa';

    // X Axis
    const xAxis = d3
      .axisBottom(scaleX)
      .ticks(6)
      .tickSize(-innerHeight)
      .tickFormat((d) => Number(d).toFixed(2));

    const gx = g
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis);

    gx.selectAll('.tick line').attr('stroke', gridColor).attr('stroke-opacity', 0.8);
    gx.selectAll('.tick text').attr('fill', axisTextColor).attr('font-size', '10px').attr('font-family', 'monospace');
    gx.select('.domain').attr('stroke', axisDomainColor);

    // Y Axis
    const yAxis = d3
      .axisLeft(scaleY)
      .ticks(6)
      .tickSize(-innerWidth)
      .tickFormat((d) => Number(d).toFixed(2));

    const gy = g.append('g').call(yAxis);
    gy.selectAll('.tick line').attr('stroke', gridColor).attr('stroke-opacity', 0.8);
    gy.selectAll('.tick text').attr('fill', axisTextColor).attr('font-size', '10px').attr('font-family', 'monospace');
    gy.select('.domain').attr('stroke', axisDomainColor);

    // Axis Titles
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', axisTitleColor)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text('Birth Scale (ε_birth)');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('fill', axisTitleColor)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text('Death Scale (ε_death)');

    // Filter points by visibility and noise
    const pairsToDraw = tdaResult.pairs.filter((p) => {
      if (!visibleDims[p.dimension]) return false;
      if (!p.isInfinite && p.lifetime < noiseThreshold) return false;
      return true;
    });

    // Draw Points
    const pointsGroup = chartArea.append('g');

    // Magnetic cursor ring layer
    const magneticRing = chartArea
      .append('circle')
      .attr('r', 12)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    pairsToDraw.forEach((pair) => {
      const isSelected = selectedPair?.id === pair.id;
      const isHovered = hoveredPair?.id === pair.id;
      const isSignificant = pair.isInfinite || pair.lifetime > bootstrapThreshold;

      const birthX = scaleX(pair.birth);
      const deathY = scaleY(pair.isInfinite ? maxEps * 0.98 : pair.death);

      const color = getDimensionColor(pair.dimension, colorBlindness);

      const pointG = pointsGroup
        .append('g')
        .attr('class', 'diagram-point cursor-pointer')
        .on('mouseenter', () => {
          setTooltipData({
            pair,
            x: birthX + margin.left,
            y: deathY + margin.top,
            isSnapped: true,
            isSignificant,
          });
          onHoverPair(pair);
          playPairSonification(pair);

          if (magneticSnap) {
            magneticRing
              .attr('cx', birthX)
              .attr('cy', deathY)
              .attr('opacity', 0.9);
          }
        })
        .on('mouseleave', () => {
          setTooltipData(null);
          onHoverPair(null);
          magneticRing.attr('opacity', 0);
        })
        .on('click', () => {
          playSoundFeedback('click');
          onSelectPair(selectedPair?.id === pair.id ? null : pair);
        });

      if (pair.isInfinite) {
        pointG
          .append('polygon')
          .attr(
            'points',
            `${birthX},${deathY - 6} ${birthX - 5},${deathY + 4} ${birthX + 5},${deathY + 4}`
          )
          .attr('fill', color)
          .attr('stroke', isSelected || isHovered ? '#ffffff' : '#18181b')
          .attr('stroke-width', isSelected || isHovered ? 2.5 : 1);

        pointG
          .append('text')
          .attr('x', birthX + 7)
          .attr('y', deathY + 2)
          .attr('fill', color)
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text('∞');
      } else {
        const r = isSelected ? 7 : isHovered ? 6 : Math.min(5.5, Math.max(3.5, pair.lifetime * 8));

        pointG
          .append('circle')
          .attr('cx', birthX)
          .attr('cy', deathY)
          .attr('r', r)
          .attr('fill', color)
          .attr('fill-opacity', isHovered || isSelected ? 1 : isSignificant ? 0.9 : 0.45)
          .attr('stroke', isSelected || isHovered ? '#ffffff' : isSignificant ? '#e4e4e7' : '#27272a')
          .attr('stroke-width', isSelected ? 2.5 : isHovered ? 2 : 1);
      }
    });
  }, [
    tdaResult,
    currentEpsilon,
    selectedPair,
    hoveredPair,
    visibleDims,
    noiseThreshold,
    colorBlindness,
    magneticSnap,
    confidenceBandEnabled,
    onHoverPair,
    onSelectPair,
    dimensions,
  ]);

  const toggleDim = (d: 0 | 1 | 2) => {
    playSoundFeedback('toggle');
    setVisibleDims((prev) => ({ ...prev, [d]: !prev[d] }));
  };

  const colors = HOMOLOGY_COLORS[colorBlindness];

  return (
    <div
      ref={containerRef}
      id="persistence-diagram-container"
      className={`relative w-full h-full max-h-full overflow-hidden rounded-xl border p-3 flex flex-col shadow-lg transition-colors ${
        isLightTheme ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
      }`}
    >
      {/* Header Bar */}
      <div className={`flex flex-wrap items-center justify-between pb-2 border-b ${
        isLightTheme ? 'border-slate-200' : 'border-zinc-800/80'
      } mb-1 z-10 gap-2`}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isLightTheme ? 'text-slate-800' : 'text-zinc-200'
          }`}>
            Persistence Diagram (Birth vs Death)
          </h3>
          {magneticSnap && (
            <span className={`text-[10px] font-mono flex items-center gap-1 ${
              isLightTheme ? 'text-slate-500' : 'text-zinc-500'
            }`}>
              <Magnet className="w-2.5 h-2.5 text-cyan-400" />
              <span>Snap</span>
            </span>
          )}
        </div>

        {/* Dimension Filter & Confidence Band Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            id="toggle-diag-h0"
            onClick={() => toggleDim(0)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition flex items-center gap-1 ${
              visibleDims[0]
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold'
                : isLightTheme
                ? 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'
                : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[0] }} />
            H₀ (Comp)
          </button>
          <button
            id="toggle-diag-h1"
            onClick={() => toggleDim(1)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition flex items-center gap-1 ${
              visibleDims[1]
                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 font-semibold'
                : isLightTheme
                ? 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'
                : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[1] }} />
            H₁ (Loop)
          </button>
          <button
            id="toggle-diag-h2"
            onClick={() => toggleDim(2)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition flex items-center gap-1 ${
              visibleDims[2]
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 font-semibold'
                : isLightTheme
                ? 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'
                : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[2] }} />
            H₂ (Void)
          </button>

          <button
            id="toggle-bootstrap-band"
            onClick={() => {
              playSoundFeedback('toggle');
              setConfidenceBandEnabled(!confidenceBandEnabled);
            }}
            title="Toggle 95% Bootstrap Confidence Band (Fasy et al.)"
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition flex items-center gap-1 ${
              confidenceBandEnabled
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/50 font-semibold'
                : isLightTheme
                ? 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'
                : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-sky-400" />
            <span>95% Band</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas & Tooltip Container */}
      <div ref={chartWrapperRef} className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden">
        <svg
          ref={svgRef}
          id="persistence-diagram-svg"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          className="block select-none"
        />

        {/* Floating Snapped Magnetic Tooltip */}
        {tooltipData && (
          <div
            className={`absolute z-30 backdrop-blur-md rounded-xl p-3 text-xs font-mono space-y-1.5 transform -translate-x-1/2 -translate-y-full mb-3 pointer-events-auto cursor-default animate-in fade-in zoom-in-95 duration-150 ${
              isLightTheme
                ? 'bg-white/95 border border-sky-400 text-slate-900 shadow-xl'
                : 'bg-zinc-900/95 border border-cyan-500/50 text-zinc-100 shadow-2xl'
            }`}
            style={{ left: tooltipData.x, top: tooltipData.y }}
          >
            <div className={`flex items-center justify-between gap-3 font-semibold pb-1 border-b ${
              isLightTheme ? 'border-slate-200' : 'border-zinc-800'
            }`}>
              <span style={{ color: getDimensionColor(tooltipData.pair.dimension, colorBlindness) }}>
                H_{tooltipData.pair.dimension} Feature ({tooltipData.pair.id})
              </span>
              {tooltipData.pair.isInfinite ? (
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-800 font-bold">
                  Essential (∞)
                </span>
              ) : tooltipData.isSignificant ? (
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Significant</span>
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                  isLightTheme ? 'bg-slate-100 text-slate-600' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  Noise
                </span>
              )}
            </div>
            <div className={`flex justify-between gap-4 ${isLightTheme ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Birth (b):</span>
              <span className={`font-bold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>{tooltipData.pair.birth.toFixed(4)}</span>
            </div>
            <div className={`flex justify-between gap-4 ${isLightTheme ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Death (d):</span>
              <span className={`font-bold ${isLightTheme ? 'text-slate-950' : 'text-white'}`}>
                {tooltipData.pair.isInfinite ? '∞' : tooltipData.pair.death.toFixed(4)}
              </span>
            </div>
            <div className={`flex justify-between gap-4 ${isLightTheme ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-400'}>Lifetime:</span>
              <span className="text-cyan-500 font-bold">{tooltipData.pair.lifetime.toFixed(4)}</span>
            </div>

            <div className={`pt-1.5 border-t ${isLightTheme ? 'border-slate-200' : 'border-zinc-800/80'} flex items-center justify-between gap-2`}>
              <span className={`text-[10px] ${isLightTheme ? 'text-slate-500' : 'text-zinc-500'}`}>Click 3D preview</span>
              {onOpenExplain && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenExplain(tooltipData.pair);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                    isLightTheme
                      ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300'
                      : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-700/60'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Explain</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
