/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TDAResult } from '../types/tda';
import { Mountain, Layers, Copy, Check, Terminal, Code, Cpu } from 'lucide-react';

interface PersistenceLandscapesProps {
  tdaResult: TDAResult | null;
  currentEpsilon: number;
  isLightTheme?: boolean;
}

export const PersistenceLandscapes: React.FC<PersistenceLandscapesProps> = ({
  tdaResult,
  currentEpsilon,
  isLightTheme = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [activeDim, setActiveDim] = useState<0 | 1>(1);
  const [subView, setSubView] = useState<'plot' | 'vector' | 'python'>('plot');
  const [copied, setCopied] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (subView !== 'plot' || !chartWrapperRef.current) return;
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
  }, [subView]);

  useEffect(() => {
    if (subView !== 'plot') return;
    if (!svgRef.current || !chartWrapperRef.current || !tdaResult) return;

    const width = dimensions.width || chartWrapperRef.current.clientWidth || 500;
    const height = dimensions.height || chartWrapperRef.current.clientHeight || 220;
    const margin = { top: 20, right: 25, bottom: 35, left: 45 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const landscapes = tdaResult.landscapes.filter((l) => l.dimension === activeDim);
    if (landscapes.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#71717a')
        .attr('font-size', '12px')
        .attr('font-mono', 'true')
        .text(`No significant H${activeDim} persistence landscape layers.`);
      return;
    }

    const maxEps = tdaResult.maxEpsilon || 1.0;
    let maxY = 0.05;
    for (const l of landscapes) {
      for (const p of l.points) {
        if (p.value > maxY) maxY = p.value;
      }
    }
    maxY *= 1.15;

    const scaleX = d3.scaleLinear().domain([0, maxEps]).range([0, innerWidth]);
    const scaleY = d3.scaleLinear().domain([0, maxY]).range([innerHeight, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const gridColor = isLightTheme ? '#e2e8f0' : '#27272a';
    const axisTextColor = isLightTheme ? '#475569' : '#a1a1aa';
    const axisDomainColor = isLightTheme ? '#94a3b8' : '#3f3f46';

    // X Axis
    const xAxis = d3.axisBottom(scaleX).ticks(6).tickFormat((d) => Number(d).toFixed(2));
    const gx = g.append('g').attr('transform', `translate(0, ${innerHeight})`).call(xAxis);
    gx.selectAll('.tick line').attr('stroke', gridColor);
    gx.selectAll('.tick text').attr('fill', axisTextColor).attr('font-size', '10px');
    gx.select('.domain').attr('stroke', axisDomainColor);

    // Y Axis
    const yAxis = d3.axisLeft(scaleY).ticks(4).tickFormat((d) => Number(d).toFixed(2));
    const gy = g.append('g').call(yAxis);
    gy.selectAll('.tick line').attr('stroke', gridColor);
    gy.selectAll('.tick text').attr('fill', axisTextColor).attr('font-size', '10px');
    gy.select('.domain').attr('stroke', axisDomainColor);

    // Layer Colors
    const layerColors =
      activeDim === 1
        ? ['#06b6d4', '#0284c7', '#6366f1']
        : ['#f59e0b', '#d97706', '#b45309'];

    // Draw filled area under landscapes from highest layer to lowest
    const sorted = [...landscapes].sort((a, b) => b.layer - a.layer);

    sorted.forEach((l) => {
      const col = layerColors[l.layer - 1] || '#06b6d4';

      const areaGen = d3
        .area<{ t: number; value: number }>()
        .x((d) => scaleX(d.t))
        .y0(innerHeight)
        .y1((d) => scaleY(d.value))
        .curve(d3.curveLinear);

      const lineGen = d3
        .line<{ t: number; value: number }>()
        .x((d) => scaleX(d.t))
        .y((d) => scaleY(d.value))
        .curve(d3.curveLinear);

      g.append('path')
        .datum(l.points)
        .attr('d', areaGen as any)
        .attr('fill', col)
        .attr('fill-opacity', 0.15 + (4 - l.layer) * 0.08);

      g.append('path')
        .datum(l.points)
        .attr('d', lineGen as any)
        .attr('fill', 'none')
        .attr('stroke', col)
        .attr('stroke-width', 2);
    });

    // Sweep cursor line
    if (currentEpsilon > 0) {
      g.append('line')
        .attr('x1', scaleX(currentEpsilon))
        .attr('y1', 0)
        .attr('x2', scaleX(currentEpsilon))
        .attr('y2', innerHeight)
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3');
    }
  }, [tdaResult, activeDim, currentEpsilon, subView, dimensions]);

  const copyVectorCode = () => {
    if (!tdaResult?.vectorization) return;
    const pyCode = `# Scikit-Learn / GUDHI Machine Learning Topological Feature Vector
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# 128-Dimensional Topological Feature Vector:
# [Persistence Landscapes (64D) + Equidistant Betti Curve (32D) + Sorted Lifetimes (32D)]
tda_feature_vector = np.array(${JSON.stringify(tdaResult.vectorization.vector128D)})

# Topological Invariants:
# Topological Entropy: ${tdaResult.vectorization.topologicalEntropy} bit
# Total Persistence: ${tdaResult.vectorization.totalPersistence}
# L1 Landscape Norm: ${tdaResult.vectorization.persLandscapeL1Norm}
# L2 Landscape Norm: ${tdaResult.vectorization.persLandscapeL2Norm}

print("Feature Vector Shape:", tda_feature_vector.shape)
`;
    navigator.clipboard.writeText(pyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      id="persistence-landscapes-container"
      className={`relative w-full h-full max-h-full overflow-hidden rounded-xl border p-3 flex flex-col font-sans transition-colors ${
        isLightTheme ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09090b] border-[#27272a] text-zinc-100'
      }`}
    >
      {/* Header Bar */}
      <div className={`flex items-center justify-between pb-2 border-b ${
        isLightTheme ? 'border-slate-200' : 'border-[#27272a]'
      } mb-2 z-10`}>
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-cyan-500" />
          <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isLightTheme ? 'text-slate-800' : 'text-zinc-200'
          }`}>
            Persistence Landscapes (λ_k(t) Functional Vectorization)
          </h3>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <div className={`flex items-center p-0.5 rounded-lg border ${
            isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-[#18181b] border-[#27272a]'
          }`}>
            <button
              onClick={() => setSubView('plot')}
              className={`px-2 py-1 rounded text-[11px] transition ${
                subView === 'plot'
                  ? isLightTheme
                    ? 'bg-white text-cyan-700 font-bold shadow-xs'
                    : 'bg-zinc-800 text-cyan-300 font-bold'
                  : isLightTheme
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400'
              }`}
            >
              Function Plot
            </button>
            <button
              onClick={() => setSubView('vector')}
              className={`px-2 py-1 rounded text-[11px] transition ${
                subView === 'vector'
                  ? isLightTheme
                    ? 'bg-white text-cyan-700 font-bold shadow-xs'
                    : 'bg-zinc-800 text-cyan-300 font-bold'
                  : isLightTheme
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400'
              }`}
            >
              128-D Vector
            </button>
            <button
              onClick={() => setSubView('python')}
              className={`px-2 py-1 rounded text-[11px] transition ${
                subView === 'python'
                  ? isLightTheme
                    ? 'bg-white text-cyan-700 font-bold shadow-xs'
                    : 'bg-zinc-800 text-cyan-300 font-bold'
                  : isLightTheme
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400'
              }`}
            >
              Python / ML
            </button>
          </div>

          {subView === 'plot' && (
            <div className="flex items-center gap-1 ml-2">
              <button
                id="btn-landscape-h0"
                onClick={() => setActiveDim(0)}
                className={`px-2 py-1 rounded text-[11px] transition ${
                  activeDim === 0
                    ? isLightTheme
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : isLightTheme
                    ? 'text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200'
                    : 'text-zinc-400 bg-zinc-900 border border-zinc-800'
                }`}
              >
                H₀ Layers
              </button>
              <button
                id="btn-landscape-h1"
                onClick={() => setActiveDim(1)}
                className={`px-2 py-1 rounded text-[11px] transition ${
                  activeDim === 1
                    ? isLightTheme
                      ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : isLightTheme
                    ? 'text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200'
                    : 'text-zinc-400 bg-zinc-900 border border-zinc-800'
                }`}
              >
                H₁ Layers
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {subView === 'plot' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          <div ref={chartWrapperRef} className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden">
            <svg
              ref={svgRef}
              id="landscapes-svg"
              preserveAspectRatio="none"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              className="block select-none"
            />
          </div>

          {/* Telemetry Footer */}
          <div className={`flex items-center justify-between text-[11px] font-mono pt-2 border-t shrink-0 ${
            isLightTheme ? 'border-slate-200 text-slate-600' : 'border-zinc-800/80 text-zinc-400'
          }`}>
            <span>
              L₁ Norm: <strong className={isLightTheme ? 'text-slate-900' : 'text-zinc-200'}>{tdaResult?.vectorization?.persLandscapeL1Norm ?? 0}</strong>
            </span>
            <span>
              L₂ Norm: <strong className={isLightTheme ? 'text-slate-900' : 'text-zinc-200'}>{tdaResult?.vectorization?.persLandscapeL2Norm ?? 0}</strong>
            </span>
            <span>
              Topological Entropy: <strong className="text-cyan-500">{tdaResult?.vectorization?.topologicalEntropy ?? 0} bit</strong>
            </span>
          </div>
        </div>
      )}

      {subView === 'vector' && (
        <div className={`flex-1 overflow-y-auto space-y-2 p-2 rounded-lg border font-mono text-xs ${
          isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#121215] border-[#27272a] text-zinc-300'
        }`}>
          <div className={`flex items-center justify-between pb-1 border-b text-[11px] ${
            isLightTheme ? 'border-slate-200 text-slate-600' : 'border-zinc-800 text-zinc-400'
          }`}>
            <span>Dense Continuous Feature Embedding (128-D)</span>
            <button
              onClick={copyVectorCode}
              className="flex items-center gap-1 text-cyan-500 hover:text-cyan-600 text-[11px] font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Vector'}</span>
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 text-[10px] font-mono">
            {tdaResult?.vectorization?.vector128D.map((val, i) => (
              <div
                key={i}
                className={`p-1 rounded border text-center transition ${
                  isLightTheme
                    ? 'bg-white border-slate-200 text-slate-800 hover:border-cyan-500'
                    : 'bg-[#18181b] border-zinc-800/80 text-zinc-300 hover:border-cyan-500'
                }`}
                title={`Dim ${i}: ${val}`}
              >
                {val}
              </div>
            ))}
          </div>
        </div>
      )}

      {subView === 'python' && (
        <div className={`flex-1 flex flex-col justify-between p-3 rounded-lg border font-mono text-xs ${
          isLightTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#121215] border-[#27272a]'
        }`}>
          <div className={`flex items-center justify-between pb-1.5 border-b text-[11px] ${
            isLightTheme ? 'border-slate-200 text-slate-600' : 'border-zinc-800 text-zinc-400'
          }`}>
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-500" />
              <span>Scikit-Learn Topological ML Pipeline</span>
            </span>
            <button
              onClick={copyVectorCode}
              className="flex items-center gap-1 text-cyan-500 hover:text-cyan-600 text-[11px] font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Code' : 'Copy Python'}</span>
            </button>
          </div>
          <pre className={`text-[11px] overflow-x-auto p-2 rounded border leading-relaxed max-h-36 ${
            isLightTheme ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#09090b] border-zinc-800/80 text-zinc-300'
          }`}>
{`from sklearn.ensemble import RandomForestClassifier
import numpy as np

# Load pre-computed 128D topological signature
tda_feat = np.array(${JSON.stringify(tdaResult?.vectorization?.vector128D || [])})

clf = RandomForestClassifier(n_estimators=100)
# Model ready for downstream topological classification & clustering`}
          </pre>
        </div>
      )}
    </div>
  );
};
