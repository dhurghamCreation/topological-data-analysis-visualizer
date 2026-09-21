/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ColorBlindnessMode, PersistencePair, TDAResult } from '../types/tda';
import { ArrowUpDown } from 'lucide-react';
import { HOMOLOGY_COLORS, getDimensionColor } from '../utils/colors';

interface PersistenceBarcodeProps {
  tdaResult: TDAResult | null;
  currentEpsilon: number;
  selectedPair: PersistencePair | null;
  hoveredPair: PersistencePair | null;
  noiseThreshold: number;
  colorBlindness: ColorBlindnessMode;
  isLightTheme?: boolean;
  onHoverPair: (pair: PersistencePair | null) => void;
  onSelectPair: (pair: PersistencePair | null) => void;
}

export const PersistenceBarcode: React.FC<PersistenceBarcodeProps> = ({
  tdaResult,
  currentEpsilon,
  selectedPair,
  hoveredPair,
  noiseThreshold,
  colorBlindness,
  isLightTheme = false,
  onHoverPair,
  onSelectPair,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [sortBy, setSortBy] = useState<'birth' | 'lifetime'>('birth');
  const [activeDim, setActiveDim] = useState<'all' | 0 | 1 | 2>('all');
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const colors = HOMOLOGY_COLORS[colorBlindness];

  // ResizeObserver ensures SVG scales smoothly without height feedback loops
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
    const margin = { top: 20, right: 30, bottom: 35, left: 55 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const maxEps = tdaResult.maxEpsilon * 1.05 || 1.0;

    // Filter pairs
    let filteredPairs = tdaResult.pairs.filter((p) => {
      if (activeDim !== 'all' && p.dimension !== activeDim) return false;
      if (!p.isInfinite && p.lifetime < noiseThreshold) return false;
      return true;
    });

    if (filteredPairs.length > 60) {
      filteredPairs = filteredPairs.slice(0, 60);
    }

    filteredPairs.sort((a, b) => {
      if (a.dimension !== b.dimension) return a.dimension - b.dimension;
      if (sortBy === 'lifetime') return b.lifetime - a.lifetime;
      return a.birth - b.birth;
    });

    const numBars = filteredPairs.length;
    const barHeight = Math.max(3, Math.min(12, (innerHeight - numBars * 2) / (numBars || 1)));

    const scaleX = d3.scaleLinear().domain([0, maxEps]).range([0, innerWidth]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

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

    // Axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', axisTitleColor)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text('Filtration Parameter (ε)');

    // Vertical sweep line
    if (currentEpsilon > 0) {
      g.append('line')
        .attr('x1', scaleX(currentEpsilon))
        .attr('y1', 0)
        .attr('x2', scaleX(currentEpsilon))
        .attr('y2', innerHeight)
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.6)
        .attr('stroke-dasharray', '4,2');

      g.append('polygon')
        .attr(
          'points',
          `${scaleX(currentEpsilon)},0 ${scaleX(currentEpsilon) - 4},-6 ${
            scaleX(currentEpsilon) + 4
          },-6`
        )
        .attr('fill', '#38bdf8');
    }

    // Draw Barcode Intervals
    const barsGroup = g.append('g');

    filteredPairs.forEach((pair, idx) => {
      const isSelected = selectedPair?.id === pair.id;
      const isHovered = hoveredPair?.id === pair.id;
      const isAlive =
        pair.birth <= currentEpsilon && (pair.isInfinite || pair.death > currentEpsilon);

      const y = idx * (barHeight + 2);
      const x1 = scaleX(pair.birth);
      const x2 = scaleX(pair.isInfinite ? maxEps * 0.98 : pair.death);
      const barWidth = Math.max(2, x2 - x1);

      const baseColor = getDimensionColor(pair.dimension, colorBlindness);

      const barG = barsGroup
        .append('g')
        .attr('class', 'barcode-bar cursor-pointer')
        .on('mouseenter', () => onHoverPair(pair))
        .on('mouseleave', () => onHoverPair(null))
        .on('click', () => onSelectPair(selectedPair?.id === pair.id ? null : pair));

      barG
        .append('rect')
        .attr('x', x1)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('rx', barHeight / 2)
        .attr('fill', baseColor)
        .attr('fill-opacity', isAlive ? 1.0 : 0.35)
        .attr('stroke', isSelected || isHovered ? '#ffffff' : isAlive ? baseColor : 'none')
        .attr('stroke-width', isSelected ? 2 : isHovered ? 1.5 : 0)
        .attr(
          'filter',
          isSelected || isHovered ? 'drop-shadow(0 0 6px rgba(56,189,248,0.7))' : 'none'
        );

      if (idx === 0 || filteredPairs[idx - 1]?.dimension !== pair.dimension) {
        g.append('text')
          .attr('x', -8)
          .attr('y', y + barHeight)
          .attr('text-anchor', 'end')
          .attr('fill', baseColor)
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(`H${pair.dimension}`);
      }

      if (pair.isInfinite) {
        barG
          .append('polygon')
          .attr(
            'points',
            `${x2},${y} ${x2 + 5},${y + barHeight / 2} ${x2},${y + barHeight}`
          )
          .attr('fill', baseColor);
      }
    });
  }, [
    tdaResult,
    currentEpsilon,
    selectedPair,
    hoveredPair,
    sortBy,
    activeDim,
    noiseThreshold,
    colorBlindness,
    dimensions,
  ]);

  return (
    <div
      ref={containerRef}
      id="persistence-barcode-container"
      className={`relative w-full h-full max-h-full overflow-hidden rounded-xl border p-3 flex flex-col shadow-lg transition-colors ${
        isLightTheme ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
      }`}
    >
      {/* Header Bar */}
      <div className={`flex items-center justify-between pb-2 border-b ${
        isLightTheme ? 'border-slate-200' : 'border-zinc-800/80'
      } mb-1 z-10`}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${
            isLightTheme ? 'text-slate-800' : 'text-zinc-200'
          }`}>
            Persistence Barcode (Intervals)
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center rounded-lg border p-0.5 text-[11px] font-mono ${
            isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <button
              id="filter-barcode-all"
              onClick={() => setActiveDim('all')}
              className={`px-1.5 py-0.5 rounded transition ${
                activeDim === 'all'
                  ? isLightTheme
                    ? 'bg-white text-cyan-700 font-bold shadow-xs'
                    : 'bg-zinc-800 text-cyan-300 font-semibold'
                  : isLightTheme
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400'
              }`}
            >
              All
            </button>
            <button
              id="filter-barcode-h0"
              onClick={() => setActiveDim(0)}
              className={`px-1.5 py-0.5 rounded transition ${
                activeDim === 0
                  ? isLightTheme
                    ? 'bg-white text-amber-700 font-bold shadow-xs'
                    : 'bg-zinc-800 text-amber-300 font-semibold'
                  : isLightTheme
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400'
              }`}
            >
              H₀
            </button>
            <button
              id="filter-barcode-h1"
              onClick={() => setActiveDim(1)}
              className={`px-1.5 py-0.5 rounded transition ${
                activeDim === 1
                  ? isLightTheme
                    ? 'bg-white text-cyan-700 font-bold shadow-xs'
                    : 'bg-zinc-800 text-cyan-300 font-semibold'
                  : isLightTheme
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400'
              }`}
            >
              H₁
            </button>
            <button
              id="filter-barcode-h2"
              onClick={() => setActiveDim(2)}
              className={`px-1.5 py-0.5 rounded transition ${
                activeDim === 2
                  ? isLightTheme
                    ? 'bg-white text-emerald-700 font-bold shadow-xs'
                    : 'bg-zinc-800 text-emerald-300 font-semibold'
                  : isLightTheme
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400'
              }`}
            >
              H₂
            </button>
          </div>

          <button
            id="toggle-barcode-sort"
            onClick={() => setSortBy(sortBy === 'birth' ? 'lifetime' : 'birth')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded-lg border transition ${
              isLightTheme
                ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                : 'text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
            }`}
            title="Sort Barcode by Birth or Lifetime"
          >
            <ArrowUpDown className="w-3 h-3 text-cyan-400" />
            <span>{sortBy === 'birth' ? 'By Birth' : 'By Life'}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Wrapper */}
      <div ref={chartWrapperRef} className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden">
        <svg
          ref={svgRef}
          id="persistence-barcode-svg"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          className="block select-none"
        />
      </div>
    </div>
  );
};
