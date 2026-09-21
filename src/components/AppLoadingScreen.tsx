/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Terminal, Activity, Layers } from 'lucide-react';

interface AppLoadingScreenProps {
  isLoading: boolean;
  onFinish?: () => void;
}

const BOOT_STEPS = [
  'Initializing algebraic topology kernel...',
  'Constructing metric distance matrices (Float32Array)...',
  'Building Vietoris-Rips simplicial boundary operators ∂₁ & ∂₂...',
  'Calibrating Elder Rule union-find disjoint sets...',
  'Synthesizing harmonic sonification audio buffers...',
  'Finalizing 3D manifold WebGL shaders...',
];

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ isLoading, onFinish }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setStepIdx((prev) => {
        if (prev < BOOT_STEPS.length - 1) return prev + 1;
        return prev;
      });
      setProgress((p) => {
        const next = p + 18;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onFinish?.();
          }, 350);
          return 100;
        }
        return next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isLoading, onFinish]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          id="app-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-100 select-none"
        >
          {/* Ambient Background Grid Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center space-y-6">
            {/* Animated Vector Logo */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-cyan-500/40 flex items-center justify-center shadow-2xl shadow-cyan-500/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-purple-500/20 animate-pulse" />
                <span className="text-3xl font-mono font-bold text-cyan-400 select-none">
                  ∂
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-cyan-950 border border-cyan-700/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 font-bold uppercase">
                v2.5
              </div>
            </div>

            {/* App Title & Subtitle */}
            <div>
              <h1 className="text-xl font-bold font-mono tracking-tight text-white flex items-center justify-center gap-2">
                <span>Topological Data Analysis Studio</span>
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                Persistent Homology & Multi-Scale Manifold Engine
              </p>
              <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                Architect: Dhurgham Alsaadi
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                <motion.div
                  className="bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 h-full rounded-full"
                  initial={{ width: '10%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 px-1">
                <span className="text-zinc-400">{BOOT_STEPS[stepIdx]}</span>
                <span className="text-cyan-400 font-bold">{progress}%</span>
              </div>
            </div>

            {/* Terminal Stream Tag */}
            <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800/80 font-mono text-[10px] text-zinc-400 w-full text-left space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>Kernel Log:</span>
              </div>
              <div className="text-cyan-300 truncate">
                &gt; hom_groups = [H0(X), H1(X), H2(X)] • Z2_reduced
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
