/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Settings,
  Sliders,
  Eye,
  Cpu,
  Monitor,
  Sparkles,
  ExternalLink,
  Shield,
  Scale,
  FileText,
  User,
  Crosshair,
  Volume2,
  VolumeX,
  Palette,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { AppSettings, ColorBlindnessMode, PrecisionMode, RenderEngine, ThemeMode } from '../types/tda';
import { HOMOLOGY_COLORS } from '../utils/colors';
import { playSoundFeedback, toggleAudioSonification, isSonificationEnabled } from '../utils/audioSonification';
import { REALTIME_PALETTES, applyRealtimePalette, getInitialRealtimePalette } from '../utils/realtimeColors';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenLegal: (type: 'terms' | 'privacy' | 'citation') => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenLegal,
}) => {
  if (!isOpen) return null;

  const colorBlindnessOptions: {
    id: ColorBlindnessMode;
    label: string;
    desc: string;
  }[] = [
    { id: 'standard', label: 'Standard (Full Spectrum)', desc: 'Amber, Cyan, Emerald canonical palette' },
    { id: 'deuteranopia', label: 'Deuteranopia (Green-Weak)', desc: 'Okabe-Ito Yellow, Sky Blue, Dark Blue' },
    { id: 'protanopia', label: 'Protanopia (Red-Weak)', desc: 'Tol Yellow, Blue, Reddish Purple' },
    { id: 'tritanopia', label: 'Tritanopia (Blue-Weak)', desc: 'Vermillion, Bluish Green, Magenta' },
  ];

  const [soundOn, setSoundOn] = React.useState<boolean>(isSonificationEnabled());
  const [activePalette, setActivePalette] = React.useState<string>(getInitialRealtimePalette());

  const handleSelectPalette = (paletteId: string) => {
    playSoundFeedback('toggle');
    setActivePalette(paletteId);
    applyRealtimePalette(paletteId);
  };

  const handleToggleSound = () => {
    const next = toggleAudioSonification();
    setSoundOn(next);
    if (next) {
      playSoundFeedback('complete');
    }
  };

  const isLight = settings.theme === 'light' || activePalette === 'research-white-clean';

  return (
    <div
      id="settings-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="settings-drawer-panel"
        className={`w-full max-w-md ${
          isLight
            ? 'bg-white border-l border-slate-200 text-slate-800'
            : 'bg-[#09090b] border-l border-zinc-800 text-zinc-300'
        } h-full flex flex-col shadow-2xl overflow-hidden transition-colors duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-cyan-500" />
            <div>
              <h2
                className={`text-sm font-bold uppercase tracking-wider font-mono ${
                  isLight ? 'text-slate-900' : 'text-zinc-100'
                }`}
              >
                Preferences & Lab Engine
              </h2>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                TDA Studio v2.4.0 Configuration
              </p>
            </div>
          </div>
          <button
            id="btn-close-settings-drawer"
            onClick={() => {
              playSoundFeedback('click');
              onClose();
            }}
            className={`p-1.5 rounded-lg border border-transparent transition group ${
              isLight
                ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200'
                : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40'
            }`}
            title="Close Settings"
          >
            <X className="w-4 h-4 group-hover:text-red-500" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Section 0: Theme Mode */}
          <div className="space-y-3">
            <div
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-900' : 'text-zinc-200'
              }`}
            >
              <Palette className="w-4 h-4 text-cyan-500" />
              <span>Cinematic Visual Atmosphere</span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono">
              <button
                onClick={() => {
                  playSoundFeedback('toggle');
                  onUpdateSettings({ theme: 'obsidian' });
                  applyRealtimePalette('radix-slate-indigo');
                  setActivePalette('radix-slate-indigo');
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.theme === 'obsidian' || !settings.theme
                    ? 'bg-zinc-800 border-cyan-500 text-cyan-200 shadow-md ring-1 ring-cyan-500'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    isLight && settings.theme !== 'obsidian' ? 'text-slate-800' : 'text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Obsidian</span>
                </div>
                <span
                  className={`text-[10px] leading-tight ${
                    isLight && settings.theme !== 'obsidian' ? 'text-slate-500' : 'text-zinc-400'
                  }`}
                >
                  Dark-room zinc research
                </span>
              </button>

              <button
                onClick={() => {
                  playSoundFeedback('toggle');
                  onUpdateSettings({ theme: 'blueprint' });
                  applyRealtimePalette('realtime-electric-cobalt');
                  setActivePalette('realtime-electric-cobalt');
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.theme === 'blueprint'
                    ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-md ring-1 ring-sky-400'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    isLight && settings.theme !== 'blueprint' ? 'text-slate-800' : 'text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-sky-400" />
                  <span>Blueprint</span>
                </div>
                <span
                  className={`text-[10px] leading-tight ${
                    isLight && settings.theme !== 'blueprint' ? 'text-slate-500' : 'text-zinc-400'
                  }`}
                >
                  Cobalt & cyan CAD
                </span>
              </button>

              <button
                onClick={() => {
                  playSoundFeedback('toggle');
                  onUpdateSettings({ theme: 'light' });
                  applyRealtimePalette('research-white-clean');
                  setActivePalette('research-white-clean');
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.theme === 'light'
                    ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-md ring-2 ring-blue-500'
                    : isLight
                    ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    settings.theme === 'light'
                      ? 'text-blue-950 font-bold'
                      : isLight
                      ? 'text-slate-900'
                      : 'text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pure Light</span>
                </div>
                <span
                  className={`text-[10px] leading-tight ${
                    settings.theme === 'light'
                      ? 'text-blue-800 font-medium'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-zinc-400'
                  }`}
                >
                  Clean white manifold
                </span>
              </button>
            </div>
          </div>

          {/* Section 0.5: Radix UI Themes System */}
          <div
            className={`space-y-3 p-4 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900/80 border-zinc-800 text-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${
                  isLight ? 'text-slate-900' : 'text-zinc-200'
                }`}
              >
                <Palette className="w-4 h-4 text-indigo-500" />
                <span>Radix UI Themes System</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  isLight
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                    : 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60'
                }`}
              >
                @radix-ui/themes
              </span>
            </div>
            <p className={`text-[11px] font-mono leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Modern theme architecture powered by{' '}
              <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>
                Radix UI Themes
              </span>
              . Choose an accent and gray scale to dynamically re-style the components, cards, and 3D canvas:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {REALTIME_PALETTES.map((pal) => {
                const isSelected = activePalette === pal.id;
                const isPalLight = pal.appearance === 'light';
                return (
                  <button
                    key={pal.id}
                    onClick={() => handleSelectPalette(pal.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-2 shadow-sm relative overflow-hidden group ${
                      isSelected
                        ? isPalLight
                          ? 'ring-2 ring-offset-2 ring-blue-600 ring-offset-white'
                          : 'ring-2 ring-offset-1 ring-offset-zinc-950'
                        : isPalLight
                        ? 'hover:border-slate-400'
                        : 'hover:border-zinc-700'
                    }`}
                    style={{
                      borderColor: isSelected ? pal.primary : isPalLight ? '#cbd5e1' : '#27272a',
                      backgroundColor: isPalLight ? '#ffffff' : '#12141a',
                      borderWidth: isSelected ? '2px' : '1px',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-mono font-bold truncate"
                        style={{ color: isPalLight ? '#0f172a' : '#f8fafc' }}
                      >
                        {pal.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${
                            isPalLight
                              ? 'bg-slate-100 text-slate-800 border border-slate-300'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {isPalLight ? 'LIGHT' : 'DARK'}
                        </span>
                        {isSelected && (
                          <span
                            className="w-2 h-2 rounded-full animate-pulse shrink-0"
                            style={{ backgroundColor: pal.primary }}
                          />
                        )}
                      </div>
                    </div>
                    {/* Swatches: Background, Card, Primary, Accent */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: pal.background }}
                        title={`Background: ${pal.background}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: pal.card }}
                        title={`Card: ${pal.card}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: pal.primary }}
                        title={`Primary: ${pal.primary}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: pal.accent }}
                        title={`Accent: ${pal.accent}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Audio Sonification */}
          <div className="space-y-3">
            <div
              className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-900' : 'text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {soundOn ? (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <VolumeX className={isLight ? 'text-slate-400' : 'text-zinc-500'} />
                )}
                <span>Mathematical Audio Sonification</span>
              </div>
              <button
                onClick={handleToggleSound}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition ${
                  soundOn
                    ? isLight
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold'
                      : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-600'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {soundOn ? 'Enabled' : 'Muted'}
              </button>
            </div>
            <p className={`text-[11px] leading-relaxed font-sans ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Harmonic synthesizer maps birth-death coordinate intervals into musical frequencies (H₀: Sub-bass, H₁: Sine bell harmonics, H₂: Ethereal triad).
            </p>
          </div>

          {/* Section 2: Rendering Engine */}
          <div className="space-y-3">
            <div
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-900' : 'text-zinc-200'
              }`}
            >
              <Monitor className="w-4 h-4 text-cyan-500" />
              <span>Renderer Engine</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button
                id="btn-engine-webgl"
                onClick={() => {
                  playSoundFeedback('toggle');
                  onUpdateSettings({ renderEngine: 'webgl' });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.renderEngine === 'webgl'
                    ? isLight
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-950 shadow-md ring-1 ring-cyan-500'
                      : 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-md'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  WebGL Hardware
                </span>
                <span className={`text-[10px] leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Three.js 3D pipeline with antialiased shaders & lighting
                </span>
              </button>

              <button
                id="btn-engine-canvas2d"
                onClick={() => {
                  playSoundFeedback('toggle');
                  onUpdateSettings({ renderEngine: 'canvas2d' });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.renderEngine === 'canvas2d'
                    ? isLight
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-950 shadow-md ring-1 ring-cyan-500'
                      : 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-md'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Canvas 2D Fallback
                </span>
                <span className={`text-[10px] leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Low-overhead orthogonal rasterization engine
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Color Blindness Accessibility */}
          <div className="space-y-3">
            <div
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-900' : 'text-zinc-200'
              }`}
            >
              <Eye className="w-4 h-4 text-amber-500" />
              <span>Color Blindness Profiles</span>
            </div>
            <div className="space-y-2 font-sans">
              {colorBlindnessOptions.map((opt) => {
                const colors = HOMOLOGY_COLORS[opt.id];
                const isSelected = settings.colorBlindness === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`btn-colorblind-${opt.id}`}
                    onClick={() => {
                      playSoundFeedback('toggle');
                      onUpdateSettings({ colorBlindness: opt.id });
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? isLight
                          ? 'bg-amber-50 border-amber-500 text-slate-900 ring-1 ring-amber-500'
                          : 'bg-amber-950/30 border-amber-500/60 text-zinc-100'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-medium ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>
                        {opt.label}
                      </div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        {opt.desc}
                      </div>
                    </div>
                    {/* Color Swatches preview */}
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: colors[0] }}
                        title="H0 Color"
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: colors[1] }}
                        title="H1 Color"
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: colors[2] }}
                        title="H2 Color"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Numerical Precision */}
          <div className="space-y-3">
            <div
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-900' : 'text-zinc-200'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span>Computation Precision & Epsilon Matrix</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button
                id="btn-precision-float32"
                onClick={() => {
                  playSoundFeedback('toggle');
                  onUpdateSettings({ precision: 'float32' });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.precision === 'float32'
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-md ring-1 ring-emerald-500'
                      : 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Float32 Standard
                </span>
                <span className={`text-[10px] leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  10⁻⁶ threshold. Optimized for real-time 60 FPS exploration.
                </span>
              </button>

              <button
                id="btn-precision-float64"
                onClick={() => {
                  playSoundFeedback('toggle');
                  onUpdateSettings({ precision: 'float64' });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.precision === 'float64'
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-md ring-1 ring-emerald-500'
                      : 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Float64 Double
                </span>
                <span className={`text-[10px] leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  10⁻¹² precision threshold. Exact reduction for academic research.
                </span>
              </button>
            </div>
          </div>

          {/* Section 5: Creator Branding & Legal Metadata */}
          <div className={`space-y-3 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
            <div
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-900' : 'text-zinc-200'
              }`}
            >
              <User className="w-4 h-4 text-cyan-500" />
              <span>Architect & Creator</span>
            </div>

            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#121215] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Dhurgham Alsaadi
                  </h4>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Architect & Creator
                  </p>
                </div>
                <a
                  href="https://github.com/dhurghamCreation"
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm font-mono ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-cyan-700 border border-slate-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700/80'
                  }`}
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    playSoundFeedback('click');
                    onOpenLegal('terms');
                  }}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1 transition ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border-zinc-700/50'
                  }`}
                >
                  <Scale className="w-3 h-3 text-amber-500" />
                  <span>License</span>
                </button>
                <button
                  onClick={() => {
                    playSoundFeedback('click');
                    onOpenLegal('privacy');
                  }}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1 transition ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border-zinc-700/50'
                  }`}
                >
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>Privacy</span>
                </button>
                <button
                  onClick={() => {
                    playSoundFeedback('click');
                    onOpenLegal('citation');
                  }}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1 transition ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border-zinc-700/50'
                  }`}
                >
                  <FileText className="w-3 h-3 text-cyan-500" />
                  <span>Cite</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/40 border-zinc-800'
          }`}
        >
          <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
            Build v2.4.0 • Dhurgham Alsaadi
          </span>
          <button
            id="btn-done-settings"
            onClick={() => {
              playSoundFeedback('click');
              onClose();
            }}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition shadow-sm font-mono"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
