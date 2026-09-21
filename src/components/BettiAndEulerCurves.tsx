/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BettiPoint, PhaseTransitionPoint, TDAResult } from '../types/tda';
import { Activity, Sparkles, Zap, Info } from 'lucide-react';
import { playSoundFeedback } from '../utils/audioSonification';

interface BettiAndEulerCurvesProps {
  tdaResult: TDAResult | null;
  currentEpsilon: number;
  isLightTheme?: boolean;
  onSelectEpsilon?: (eps: number) => void;
}

export const BettiAndEulerCurves: React.FC<BettiAndEulerCurvesProps> = ({
  tdaResult,
  currentEpsilon,
  isLightTheme = false,
  onSelectEpsilon,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [showEuler, setShowEuler] = useState<boolean>(true);
  const [showTransitions, setShowTransitions] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<BettiPoint | null>(null);
  const [hoveredTransition, setHoveredTransition] = useState<PhaseTransitionPoint | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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
    const height = dimensions.height || chartWrapperRef.current.clientHeight || 210;
    const margin = { top: 18, right: 30, bottom: 35, left: 45 };

    const innerWidth = Math.max(10, width - margin.left - margin.right);
    const innerHeight = Math.max(10, height - margin.top - margin.bottom);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const data = tdaResult.bettiCurves;
    if (data.length === 0) return;

    const maxEps = tdaResult.maxEpsilon || 1.0;
    const maxBetti = Math.max(
      ...data.map((d) => Math.max(d.b0, d.b1, d.b2, Math.abs(d.euler))),
      4
    );

    const minEuler = showEuler ? Math.min(...data.map((d) => d.euler), 0) : 0;

    const scaleX = d3.scaleLinear().domain([0, maxEps]).range([0, innerWidth]);
    const scaleY = d3
      .scaleLinear()
      .domain([minEuler < 0 ? minEuler - 1 : 0, maxBetti + 1])
      .range([innerHeight, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const gridColor = isLightTheme ? '#e2e8f0' : '#1e293b';
    const axisTextColor = isLightTheme ? '#475569' : '#94a3b8';
    const axisDomainColor = isLightTheme ? '#94a3b8' : '#334155';
    const zeroLineColor = isLightTheme ? '#cbd5e1' : '#27272a';

    // Zero line if negative Euler exists
    if (minEuler < 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('y1', scaleY(0))
        .attr('x2', innerWidth)
        .attr('y2', scaleY(0))
        .attr('stroke', zeroLineColor)
        .attr('stroke-dasharray', '2,2');
    }

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

    gx.selectAll('.tick line').attr('stroke', gridColor).attr('stroke-opacity', 0.6);
    gx.selectAll('.tick text').attr('fill', axisTextColor).attr('font-size', '10px');
    gx.select('.domain').attr('stroke', axisDomainColor);

    // Y Axis
    const yAxis = d3.axisLeft(scaleY).ticks(4).tickSize(-innerWidth);
    const gy = g.append('g').call(yAxis);
    gy.selectAll('.tick line').attr('stroke', gridColor).attr('stroke-opacity', 0.6);
    gy.selectAll('.tick text').attr('fill', axisTextColor).attr('font-size', '10px');
    gy.select('.domain').attr('stroke', axisDomainColor);

    // Lines generator
    const lineB0 = d3
      .line<BettiPoint>()
      .x((d) => scaleX(d.epsilon))
      .y((d) => scaleY(d.b0))
      .curve(d3.curveStepAfter);

    const lineB1 = d3
      .line<BettiPoint>()
      .x((d) => scaleX(d.epsilon))
      .y((d) => scaleY(d.b1))
      .curve(d3.curveStepAfter);

    const lineB2 = d3
      .line<BettiPoint>()
      .x((d) => scaleX(d.epsilon))
      .y((d) => scaleY(d.b2))
      .curve(d3.curveStepAfter);

    const lineEuler = d3
      .line<BettiPoint>()
      .x((d) => scaleX(d.epsilon))
      .y((d) => scaleY(d.euler))
      .curve(d3.curveMonotoneX);

    // Draw B0 curve
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('d', lineB0);

    // Draw B1 curve
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2.2)
      .attr('d', lineB1);

    // Draw B2 curve
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('d', lineB2);

    // Draw Euler curve
    if (showEuler) {
      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#c084fc')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,2')
        .attr('d', lineEuler);
    }

    // Draw Phase Transition Markers
    if (showTransitions && tdaResult.phaseTransitions) {
      tdaResult.phaseTransitions.forEach((pt) => {
        const cx = scaleX(pt.epsilon);
        const cy = scaleY(pt.deltaEuler);

        const marker = g
          .append('g')
          .attr('transform', `translate(${cx}, ${cy})`)
          .attr('cursor', 'pointer')
          .on('mouseenter', () => setHoveredTransition(pt))
          .on('mouseleave', () => setHoveredTransition(null))
          .on('click', (e) => {
            e.stopPropagation();
            playSoundFeedback('phase_transition');
            if (onSelectEpsilon) onSelectEpsilon(pt.epsilon);
          });

        marker
          .append('circle')
          .attr('r', 5)
          .attr('fill', '#ec4899')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);
      });
    }

    // Vertical sweep line
    if (currentEpsilon > 0) {
      g.append('line')
        .attr('x1', scaleX(currentEpsilon))
        .attr('y1', 0)
        .attr('x2', scaleX(currentEpsilon))
        .attr('y2', innerHeight)
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3');
    }

    // Interactive Overlay for Mouse Tracking
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const eps = scaleX.invert(mx);
        const closest = data.reduce((prev, curr) =>
          Math.abs(curr.epsilon - eps) < Math.abs(prev.epsilon - eps) ? curr : prev
        );
        setHoveredPoint(closest);
      })
      .on('mouseleave', () => setHoveredPoint(null))
      .on('click', (event) => {
        if (!onSelectEpsilon) return;
        const [mx] = d3.pointer(event);
        const eps = Math.max(0, Math.min(maxEps, scaleX.invert(mx)));
        playSoundFeedback('step');
        onSelectEpsilon(eps);
      });
  }, [tdaResult, currentEpsilon, showEuler, showTransitions, onSelectEpsilon, dimensions]);

  const entropy = tdaResult?.vectorization;

  return (
    <div
      ref={containerRef}
      id="betti-euler-container"
      className={`relative w-full h-full max-h-full overflow-hidden rounded-xl border p-3 flex flex-col shadow-lg transition-colors ${
        isLightTheme ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09090b] border-zinc-800 text-zinc-100'
      }`}
    >
      {/* Header Bar */}
      <div className={`flex flex-wrap items-center justify-between pb-1.5 border-b ${
        isLightTheme ? 'border-slate-200' : 'border-zinc-800/80'
      } mb-1 z-10 gap-2`}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isLightTheme ? 'text-slate-800' : 'text-zinc-200'
          }`}>
            Betti Numbers & Euler Characteristic Curve
          </h3>
        </div>

        {/* Legend / Toggles */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-amber-500 font-semibold">
            <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> β₀(ε)
          </span>
          <span className="flex items-center gap-1 text-cyan-500 font-semibold">
            <span className="w-2.5 h-0.5 bg-cyan-500 inline-block" /> β₁(ε)
          </span>
          <span className="flex items-center gap-1 text-emerald-500 font-semibold">
            <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> β₂(ε)
          </span>
          <button
            id="toggle-euler-curve"
            onClick={() => {
              playSoundFeedback('toggle');
              setShowEuler(!showEuler);
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition border ${
              showEuler
                ? isLightTheme
                  ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold'
                  : 'bg-purple-950/80 text-purple-300 border-purple-800'
                : isLightTheme
                ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
          >
            <span className="w-2.5 h-0.5 bg-purple-500 border-dashed inline-block" /> χ(ε)
          </button>

          <button
            id="toggle-phase-transitions"
            onClick={() => {
              playSoundFeedback('toggle');
              setShowTransitions(!showTransitions);
            }}
            title="Toggle Phase Transitions"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition border ${
              showTransitions
                ? isLightTheme
                  ? 'bg-pink-100 text-pink-700 border-pink-300 font-semibold'
                  : 'bg-pink-950/80 text-pink-300 border-pink-800'
                : isLightTheme
                ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
          >
            <Zap className="w-3 h-3 text-pink-500" />
            <span>Phases</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Wrapper */}
      <div ref={chartWrapperRef} className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden">
        <svg
          ref={svgRef}
          id="betti-euler-svg"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          className="block select-none"
        />

        {/* Hover Information Banner */}
        {hoveredPoint && (
          <div className={`absolute top-2 left-12 z-20 backdrop-blur-md border px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-3 shadow-xl pointer-events-none ${
            isLightTheme
              ? 'bg-white/95 border-sky-400 text-slate-800 shadow-sky-900/10'
              : 'bg-zinc-950/95 border-cyan-500/40 text-zinc-300'
          }`}>
            <span>ε: <strong className={isLightTheme ? 'text-slate-900' : 'text-white'}>{hoveredPoint.epsilon.toFixed(3)}</strong></span>
            <span>β₀: <strong className="text-amber-500">{hoveredPoint.b0}</strong></span>
            <span>β₁: <strong className="text-cyan-500">{hoveredPoint.b1}</strong></span>
            <span>β₂: <strong className="text-emerald-500">{hoveredPoint.b2}</strong></span>
            <span>χ: <strong className="text-purple-500">{hoveredPoint.euler}</strong></span>
          </div>
        )}

        {/* Phase Transition Tooltip */}
        {hoveredTransition && (
          <div className={`absolute bottom-2 left-12 z-20 backdrop-blur-md border px-3 py-1.5 rounded-lg text-xs font-mono shadow-xl flex items-center gap-2 animate-in fade-in pointer-events-none ${
            isLightTheme
              ? 'bg-white/95 border-pink-400 text-pink-700 shadow-pink-900/10'
              : 'bg-pink-950/90 border-pink-500/60 text-pink-200'
          }`}>
            <Zap className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span>{hoveredTransition.description} (Click to jump ε = {hoveredTransition.epsilon.toFixed(3)})</span>
          </div>
        )}
      </div>

      {/* Persistence Entropy & Summary Footer */}
      {entropy && (
        <div className={`mt-1 pt-1.5 border-t flex flex-wrap items-center justify-between text-[10px] font-mono gap-2 shrink-0 ${
          isLightTheme ? 'border-slate-200 text-slate-600' : 'border-zinc-800/80 text-zinc-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className={isLightTheme ? 'text-slate-500' : 'text-zinc-500'}>Persistence Entropy E(D):</span>
            <span className="text-cyan-500 font-bold">{entropy.topologicalEntropy} bit</span>
            <span className={isLightTheme ? 'text-slate-300' : 'text-zinc-600'}>|</span>
            <span>H₀: <strong className="text-amber-500">{entropy.entropyH0}</strong></span>
            <span>H₁: <strong className="text-cyan-500">{entropy.entropyH1}</strong></span>
            <span>H₂: <strong className="text-emerald-500">{entropy.entropyH2}</strong></span>
          </div>

          <div className={`flex items-center gap-1 ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'}`}>
            <span>Complexity:</span>
            <span className={`font-bold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{(entropy.normalizedEntropy * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
