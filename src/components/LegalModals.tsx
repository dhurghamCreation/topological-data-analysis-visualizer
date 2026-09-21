/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldCheck, Scale, FileText, Check, Copy, ExternalLink, Code2 } from 'lucide-react';

interface LegalModalsProps {
  type: 'terms' | 'privacy' | 'citation' | null;
  onClose: () => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({ type, onClose }) => {
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  if (!type) return null;

  const bibtexCitation = `@software{Alsaadi_TDA_Studio_2026,
  author = {Alsaadi, Dhurgham},
  title = {Topological Data Analysis (TDA) Studio: Real-time Persistent Homology & Manifold Visualizer},
  year = {2026},
  url = {https://github.com/dhurghamCreation},
}`;

  const copyBibtex = () => {
    navigator.clipboard.writeText(bibtexCitation);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  return (
    <div
      id="legal-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="legal-modal-card"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            {type === 'terms' && <Scale className="w-5 h-5 text-amber-400" />}
            {type === 'privacy' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
            {type === 'citation' && <FileText className="w-5 h-5 text-cyan-400" />}
            <h2 className="text-base font-semibold text-zinc-100">
              {type === 'terms' && 'Terms of Service & Research License'}
              {type === 'privacy' && 'Privacy Statement & Client-Side Guarantee'}
              {type === 'citation' && 'Academic Citation & Attribution'}
            </h2>
          </div>
          <button
            id="btn-close-legal-modal"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto text-sm text-zinc-300 space-y-5 leading-relaxed">
          {type === 'terms' && (
            <>
              <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-2">
                <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                  MIT Open Research License
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  Copyright (c) 2026 Dhurgham Alsaadi. All Rights Reserved.
                </p>
                <p className="text-xs text-zinc-400">
                  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Academic & Publication Clause
                </h3>
                <p className="text-xs text-zinc-400">
                  If you use this Topological Data Analysis workspace, its algorithms, or generated visualizations in academic papers, preprint manuscripts (e.g. arXiv), presentations, or peer-reviewed literature, please provide appropriate attribution to <strong>Dhurgham Alsaadi</strong> using the standard BibTeX format provided in the Citation section.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Mathematical Guarantee & Disclaimer
                </h3>
                <p className="text-xs text-zinc-400">
                  Homology reductions, Vietoris-Rips complexes, Alpha empty-circumdisk filtrations, and stability metrics are implemented based on canonical algebraic topology algorithms. While validated against benchmark suites, the software is provided &quot;as is&quot;, without warranty of any kind.
                </p>
              </div>
            </>
          )}

          {type === 'privacy' && (
            <>
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300">
                    100% Zero-Telemetry & In-Memory Client Execution
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Your custom datasets, point clouds, CSV files, and calculated homological matrices never leave your browser. All linear algebra and filtration computations execute strictly in client-side memory.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-100">1. Data Storage Policy</h3>
                <p className="text-xs text-zinc-400">
                  Uploaded point cloud datasets and parameter configurations are processed entirely via local JavaScript <code className="text-zinc-300 font-mono bg-zinc-900 px-1 py-0.5 rounded">Float32Array</code> and <code className="text-zinc-300 font-mono bg-zinc-900 px-1 py-0.5 rounded">Float64Array</code> buffers. No data is serialized to external cloud databases, analytics pipelines, or remote servers.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-100">2. Network Activity</h3>
                <p className="text-xs text-zinc-400">
                  The application operates completely offline once loaded. There are zero tracking pixels, no advertising beacons, and no behavioral telemetry trackers.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-100">3. Local Session Persistence</h3>
                <p className="text-xs text-zinc-400">
                  Only non-sensitive UI preferences (such as chosen color-blindness scheme, precision mode, and canvas rendering engine) are stored in client-side <code className="text-zinc-300 font-mono bg-zinc-900 px-1 py-0.5 rounded">localStorage</code>.
                </p>
              </div>
            </>
          )}

          {type === 'citation' && (
            <>
              <div className="space-y-2">
                <p className="text-xs text-zinc-300">
                  To cite this Topological Data Analysis workspace in publications, manuscripts, or research presentations:
                </p>
              </div>

              <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300">
                <button
                  onClick={copyBibtex}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-[11px] transition"
                >
                  {copiedBibtex ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy BibTeX</span>
                    </>
                  )}
                </button>
                <pre className="overflow-x-auto pr-16">{bibtexCitation}</pre>
              </div>

              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                <div className="text-xs font-semibold text-zinc-200">Architect & Creator</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Dhurgham Alsaadi</div>
                    <div className="text-xs text-zinc-400">Computational Geometry & Topological Data Analysis</div>
                  </div>
                  <a
                    href="https://github.com/dhurghamCreation"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <span>GitHub Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">
            TDA Studio • Dhurgham Alsaadi
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
