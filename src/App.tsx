/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ActiveSimplicialComplex,
  AppSettings,
  ColorMapScheme,
  DatasetConfig,
  PersistencePair,
  PointData,
  TDAResult,
} from './types/tda';
import { generatePoints, parseCustomDataset } from './utils/pointGenerators';
import {
  computeTDAHomology,
  computeVietorisRipsHomology,
  getActiveSimplicialComplex,
} from './utils/tdaEngine';
import { PointCloudViewer3D } from './components/PointCloudViewer3D';
import { PersistenceDiagram } from './components/PersistenceDiagram';
import { PersistenceBarcode } from './components/PersistenceBarcode';
import { BettiAndEulerCurves } from './components/BettiAndEulerCurves';
import { PersistenceLandscapes } from './components/PersistenceLandscapes';
import { FiltrationController } from './components/FiltrationController';
import { DatasetControlPanel } from './components/DatasetControlPanel';
import { AITopologyCopilot } from './components/AITopologyCopilot';
import { TheoryDocumentationModal } from './components/TheoryDocumentationModal';
import { TopologicalComparisonModal } from './components/TopologicalComparisonModal';
import { ExportModal } from './components/ExportModal';
import { CommandPalette } from './components/CommandPalette';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ExplainFeatureDrawer } from './components/ExplainFeatureDrawer';
import { LegalModals } from './components/LegalModals';
import { PresentationMode } from './components/PresentationMode';
import { DataInspectorModal } from './components/DataInspectorModal';
import { GuidedTutorialModal } from './components/GuidedTutorialModal';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import {
  decodeStateFromUrlHash,
  encodeStateToUrlHash,
  generateShareableUrl,
} from './utils/urlStateEncoding';
import { playSoundFeedback } from './utils/audioSonification';
import { ShareModal } from './components/ShareModal';
import { TdaMinigameModal } from './components/TdaMinigameModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  REALTIME_PALETTES,
  applyRealtimePalette,
  getInitialRealtimePalette,
} from './utils/realtimeColors';
import {
  BookOpen,
  GitCompare,
  Download,
  Activity,
  Layers,
  BarChart2,
  Mountain,
  Grid,
  Search,
  Command,
  Settings,
  Shield,
  Scale,
  FileText,
  Sparkles,
  ExternalLink,
  Eye,
  Maximize2,
  User,
  Share2,
  HelpCircle,
  FileSpreadsheet,
  Check,
  Zap,
  Palette,
  Gamepad2,
} from 'lucide-react';

export default function App() {
  // Boot Sequence Loading State
  const [isBootLoading, setIsBootLoading] = useState<boolean>(true);

  // Application Preferences & Engine Configuration
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('tda_app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      theme: 'obsidian',
      renderEngine: 'webgl',
      colorBlindness: 'standard',
      precision: 'float32',
      showCrosshair: true,
      pulseGlow: true,
      magneticSnap: true,
      soundFeedback: false,
    };
  });

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('tda_app_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Dataset Configuration (with URL hash hydration)
  const [config, setConfig] = useState<DatasetConfig>(() => {
    const decoded = decodeStateFromUrlHash();
    const baseConfig: DatasetConfig = {
      type: 'torus',
      name: 'Torus (T²)',
      filtrationModel: 'vietoris_rips',
      numPoints: 320,
      noise: 0.08,
      scale: 1.0,
      paramR: 2.0,
      paramR2: 0.8,
      metric: 'euclidean',
      subsampling: 'farthest_point',
      subsampleTarget: 180,
      maxDimension: 2,
      noiseFilterRatio: 0.03,
    };

    if (decoded?.config) {
      return { ...baseConfig, ...decoded.config };
    }
    return baseConfig;
  });

  // Visual options
  const [colorScheme, setColorScheme] = useState<ColorMapScheme>('cyan_amber');
  const [pointSize, setPointSize] = useState<number>(0.12);
  const [ballOpacity, setBallOpacity] = useState<number>(0.4);
  const [showBalls, setShowBalls] = useState<boolean>(false);
  const [showEdges, setShowEdges] = useState<boolean>(true);
  const [showTriangles, setShowTriangles] = useState<boolean>(true);
  const [showGeneratorCycle, setShowGeneratorCycle] = useState<boolean>(true);

  // Data & Computation
  const [points, setPoints] = useState<PointData[]>([]);
  const [tdaResult, setTdaResult] = useState<TDAResult | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);

  // Filtration State
  const [currentEpsilon, setCurrentEpsilon] = useState<number>(() => {
    const decoded = decodeStateFromUrlHash();
    return typeof decoded?.epsilon === 'number' ? decoded.epsilon : 0.35;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);

  // Interactive Selection / Hover
  const [selectedPair, setSelectedPair] = useState<PersistencePair | null>(null);
  const [hoveredPair, setHoveredPair] = useState<PersistencePair | null>(null);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'diagram' | 'barcode' | 'betti' | 'landscape'>(() => {
    const decoded = decodeStateFromUrlHash();
    if (
      decoded?.activeTab === 'diagram' ||
      decoded?.activeTab === 'barcode' ||
      decoded?.activeTab === 'betti' ||
      decoded?.activeTab === 'landscape'
    ) {
      return decoded.activeTab;
    }
    return 'diagram';
  });

  // Modals & Drawers
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExplainOpen, setIsExplainOpen] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | 'citation' | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isMinigameOpen, setIsMinigameOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [realtimePaletteId, setRealtimePaletteId] = useState<string>(getInitialRealtimePalette());

  const handleCycleRealtimePalette = () => {
    playSoundFeedback('toggle');
    const idx = REALTIME_PALETTES.findIndex((p) => p.id === realtimePaletteId);
    const nextPalette = REALTIME_PALETTES[(idx + 1) % REALTIME_PALETTES.length];
    setRealtimePaletteId(nextPalette.id);
    applyRealtimePalette(nextPalette.id);
    addToast('Radix UI Theme Applied', `${nextPalette.name}`, 'info');
  };

  const addToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Animation Loop Ref
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // 1. Generate Points & Compute Homology on Config change
  const runComputation = useCallback((newConfig: DatasetConfig, existingPoints?: PointData[]) => {
    setIsComputing(true);

    setTimeout(() => {
      let pts = existingPoints;
      if (!pts || pts.length === 0) {
        pts = generatePoints(newConfig);
      }
      setPoints(pts);

      const result = computeTDAHomology(pts, newConfig);
      setTdaResult(result);

      // Default epsilon to 35% of max filtration if not initialized
      const initialEps = result.maxEpsilon * 0.35;
      setCurrentEpsilon((prev) => (prev > 0 && prev <= result.maxEpsilon ? prev : initialEps));
      setIsComputing(false);
    }, 20);
  }, []);

  useEffect(() => {
    runComputation(config);
  }, [
    config.type,
    config.filtrationModel,
    config.numPoints,
    config.noise,
    config.metric,
    config.subsampling,
    config.subsampleTarget,
    config.maxDimension,
    config.noiseFilterRatio,
  ]);

  // Sync state to URL hash
  useEffect(() => {
    const hash = encodeStateToUrlHash(config, currentEpsilon, activeTab);
    if (typeof window !== 'undefined' && hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [config, currentEpsilon, activeTab]);

  // Compute Active Simplicial Complex deterministically
  const activeComplex: ActiveSimplicialComplex | null = useMemo(() => {
    if (!tdaResult || points.length === 0) return null;
    return getActiveSimplicialComplex(tdaResult, currentEpsilon, points);
  }, [tdaResult, currentEpsilon, points]);

  // 2. Filtration Animation Playback Loop
  useEffect(() => {
    if (!isPlaying || !tdaResult) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const maxEps = tdaResult.maxEpsilon || 1.0;
      const rate = (maxEps / 12) * playSpeed;

      setCurrentEpsilon((prev) => {
        let next = prev + rate * delta;
        if (next >= maxEps) {
          next = 0;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playSpeed, tdaResult]);

  // Handle Custom Dataset Upload
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const { points: parsedPts, error } = parseCustomDataset(content, file.name);
        if (error) {
          alert(`File Parse Error: ${error}`);
          return;
        }
        const updatedConfig: DatasetConfig = {
          ...config,
          type: 'custom_upload',
          name: file.name.replace(/\.[^/.]+$/, ''),
          numPoints: parsedPts.length,
        };
        setConfig(updatedConfig);
        runComputation(updatedConfig, parsedPts);
      }
    };
    reader.readAsText(file);
  };

  const handleCustomPointsLoaded = (customPoints: PointData[], datasetName: string) => {
    const updatedConfig: DatasetConfig = {
      ...config,
      type: 'custom_upload',
      name: datasetName,
      numPoints: customPoints.length,
    };
    setConfig(updatedConfig);
    runComputation(updatedConfig, customPoints);
  };

  const handleConfigChange = (partial: Partial<DatasetConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleOpenExplainForPair = (pair?: PersistencePair) => {
    const target =
      pair ||
      selectedPair ||
      hoveredPair ||
      tdaResult?.pairs.find((p) => p.dimension === 1 && !p.isInfinite) ||
      tdaResult?.pairs[0];
    if (target) {
      setSelectedPair(target);
    }
    setIsExplainOpen((prev) => !prev);
  };

  const handleShareSession = () => {
    const url = generateShareableUrl(config, currentEpsilon, activeTab);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      playSoundFeedback('complete');
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      // Cmd+K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Cmd+P for presentation mode
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPresentationOpen((prev) => !prev);
        return;
      }

      // Cmd+, for settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }

      // Cmd+B for comparison modal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsComparisonOpen((prev) => !prev);
        return;
      }

      // Cmd+E for export modal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsExportOpen((prev) => !prev);
        return;
      }

      // Cmd+T for theory modal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setIsTheoryOpen((prev) => !prev);
        return;
      }

      // Cmd+I for inspector
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight' && tdaResult) {
        setCurrentEpsilon((prev) => Math.min(tdaResult.maxEpsilon, prev + tdaResult.maxEpsilon / 100));
      } else if (e.code === 'ArrowLeft' && tdaResult) {
        setCurrentEpsilon((prev) => Math.max(0, prev - tdaResult.maxEpsilon / 100));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tdaResult]);

  const currentPalette = useMemo(
    () => REALTIME_PALETTES.find((p) => p.id === realtimePaletteId),
    [realtimePaletteId]
  );
  const isBlueprintTheme = settings.theme === 'blueprint';
  const isLightTheme = settings.theme === 'light' || currentPalette?.appearance === 'light';

  // Unique non-blue Share button styles per theme
  const shareStyles = useMemo(() => {
    if (isLightTheme) {
      return {
        btnClass: 'share-btn-light',
        iconClass: 'text-rose-600',
        textClass: 'share-text-light',
        copyBtnClass: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300 hover:border-rose-400',
        copyIconClass: 'text-rose-600',
      };
    }
    if (isBlueprintTheme) {
      return {
        btnClass: 'share-btn-blueprint',
        iconClass: 'text-amber-400',
        textClass: 'share-text-blueprint',
        copyBtnClass: 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border-amber-600/80 hover:border-amber-400',
        copyIconClass: 'text-amber-400',
      };
    }
    // Obsidian Dark Theme
    return {
      btnClass: 'share-btn-obsidian',
      iconClass: 'text-emerald-400',
      textClass: 'share-text-obsidian',
      copyBtnClass: 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-600/80 hover:border-emerald-400',
      copyIconClass: 'text-emerald-400',
    };
  }, [isLightTheme, isBlueprintTheme]);

  return (
    <div
      className={`min-h-screen ${
        isLightTheme
          ? 'bg-slate-50 text-slate-900 selection:bg-blue-500/20 selection:text-blue-900 theme-light'
          : isBlueprintTheme
          ? 'bg-[#030712] text-sky-100 selection:bg-sky-500/30 selection:text-white theme-blueprint'
          : 'bg-[#09090b] text-zinc-100 selection:bg-cyan-500/20 selection:text-cyan-200'
      } flex flex-col font-sans antialiased transition-colors duration-200`}
    >
      {/* Loading Boot Splash Screen */}
      <AppLoadingScreen
        isLoading={isBootLoading}
        onFinish={() => setIsBootLoading(false)}
      />

      {/* Top Precision Navigation Bar */}
      <header
        id="app-header"
        className={`h-16 ${
          isLightTheme
            ? 'bg-white/95 border-slate-200 text-slate-900'
            : isBlueprintTheme
            ? 'bg-[#0b1329]/95 border-sky-900/60'
            : 'bg-zinc-950/90 border-zinc-800/80'
        } backdrop-blur-md border-b px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 transition-colors shadow-sm`}
      >
        {/* Left Brand Identity */}
        <div className="flex items-center gap-3">
          <div
            id="app-logo"
            className="w-9 h-9 rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/80 via-zinc-900 to-indigo-950/80 flex items-center justify-center font-display font-black text-base text-cyan-300 shadow-md shadow-cyan-950/40 app-logo-badge"
          >
            ∂
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-sm sm:text-base font-display font-extrabold tracking-tight ${isLightTheme ? 'text-black' : 'text-white'}`}>
                Topological Data Analysis
              </h1>
              <span className={`text-[10px] sm:text-[11px] uppercase font-mono font-bold px-2 py-0.5 rounded-md border shadow-xs ${
                isLightTheme
                  ? 'bg-slate-100 text-black border-slate-300'
                  : 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60'
              }`}>
                {config.filtrationModel === 'alpha_complex' ? 'Alpha(X, α)' : 'VR(X, ε)'}
              </span>
            </div>
            <div className={`text-[11px] font-sans flex items-center gap-1.5 font-medium ${isLightTheme ? 'text-black font-semibold' : 'text-zinc-400'}`}>
              
              <span className={isLightTheme ? 'text-black font-bold' : 'text-zinc-600'}>•</span>
             
            </div>
          </div>
        </div>

        {/* Command Search Omnibar Trigger */}
        <button
          onClick={() => {
            playSoundFeedback('click');
            setIsCommandPaletteOpen(true);
          }}
          className={`hidden xl:flex items-center gap-2.5 px-4 py-2 border rounded-xl text-xs font-mono transition-all shadow-inner group ${
            isLightTheme
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-black font-medium'
              : 'bg-zinc-900/90 hover:bg-zinc-800/90 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
          }`}
        >
          <Search className={`w-3.5 h-3.5 ${isLightTheme ? 'text-black' : 'text-zinc-400 group-hover:text-cyan-400 transition'}`} />
          <span className={`font-sans ${isLightTheme ? 'text-black font-semibold' : 'font-medium'}`}>Search manifold, actions, complexes...</span>
          <kbd className={`px-1.5 py-0.5 text-[10px] font-mono rounded flex items-center gap-0.5 shadow-xs border ${
            isLightTheme ? 'bg-white text-black border-slate-300 font-bold' : 'text-zinc-300 bg-zinc-950 border-zinc-800'
          }`}>
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Action Tool Buttons - Clean Spacious Clustering */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theory Modal Trigger */}
          <button
            id="btn-open-theory"
            onClick={() => {
              playSoundFeedback('click');
              setIsMinigameOpen(false);
              setIsTheoryOpen(true);
            }}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${
              isLightTheme
                ? 'bg-amber-50 hover:bg-amber-100 text-black border-amber-300 hover:border-amber-400'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-amber-500/50'
            }`}
            title="Mathematical Foundations (Cmd+T)"
          >
            <BookOpen className={`w-4 h-4 ${isLightTheme ? 'text-amber-700' : 'text-amber-400'}`} />
            <span>Theory</span>
          </button>

          {/* Minigames Challenge Trigger */}
          <button
            id="btn-open-minigame"
            onClick={() => {
              playSoundFeedback('click');
              setIsTheoryOpen(false);
              setIsMinigameOpen(true);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${
              isLightTheme
                ? 'bg-emerald-50 hover:bg-emerald-100 text-black border-emerald-300 hover:border-emerald-400'
                : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-100 border-emerald-800/60 hover:border-emerald-500/50'
            }`}
            title="Topological Invariant Challenges & Minigames"
          >
            <Gamepad2 className={`w-4 h-4 ${isLightTheme ? 'text-emerald-700' : 'text-emerald-400 animate-pulse'}`} />
            <span>Minigames</span>
          </button>

          {/* Stability Metric Matching */}
          <button
            id="btn-open-comparison"
            onClick={() => {
              playSoundFeedback('click');
              setIsComparisonOpen(true);
            }}
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${
              isLightTheme
                ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300 hover:border-slate-400'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-cyan-500/40'
            }`}
            title="Stability & Bottleneck Matching (Cmd+B)"
          >
            <GitCompare className={`w-4 h-4 ${isLightTheme ? 'text-cyan-700' : 'text-cyan-400'}`} />
            <span>Stability</span>
          </button>

          {/* Interactive Tutorial Trigger */}
          <button
            id="btn-open-tutorial-top"
            onClick={() => {
              playSoundFeedback('click');
              setIsTutorialOpen(true);
            }}
            className={`hidden xl:flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${
              isLightTheme
                ? 'bg-purple-50 hover:bg-purple-100 text-black border-purple-300 hover:border-purple-400'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-purple-500/40'
            }`}
            title="Open Interactive TDA Tutorial Guide"
          >
            <HelpCircle className={`w-4 h-4 ${isLightTheme ? 'text-purple-700' : 'text-purple-400'}`} />
            <span>Tutorial</span>
          </button>

          {/* Matrix Inspector Button */}
          <button
            id="btn-open-inspector-top"
            onClick={() => {
              playSoundFeedback('click');
              setIsInspectorOpen(true);
            }}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${
              isLightTheme
                ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300 hover:border-slate-400'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-cyan-500/40'
            }`}
            title="Open Advanced CSV/JSON Matrix Inspector (Cmd+I)"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isLightTheme ? 'text-cyan-700' : 'text-cyan-400'}`} />
            <span>Inspector</span>
          </button>

          {/* Presentation Mode Trigger */}
          <button
            id="btn-open-presentation-top"
            onClick={() => {
              playSoundFeedback('click');
              setIsPresentationOpen(true);
            }}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${
              isLightTheme
                ? 'bg-purple-100 hover:bg-purple-200 text-black border-purple-300 hover:border-purple-400 font-bold'
                : 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 hover:text-purple-100 border-purple-800/60 hover:border-purple-500/50'
            }`}
            title="Distraction-Free Presentation Mode (Cmd+P)"
          >
            <Eye className={`w-4 h-4 ${isLightTheme ? 'text-purple-700' : 'text-purple-400'}`} />
            <span>Presentation</span>
          </button>

          {/* Dedicated Share Studio Trigger with Unique Theme Color */}
          <button
            id="btn-open-share"
            onClick={() => {
              playSoundFeedback('click');
              setIsShareModalOpen(true);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${shareStyles.btnClass}`}
            title="Advanced Social & Web Sharing Studio"
          >
            <Share2 className={`w-4 h-4 ${shareStyles.iconClass}`} />
            <span className={shareStyles.textClass}>Share</span>
          </button>

          {/* Instant Hash Link Copy */}
          <button
            id="btn-share-session"
            onClick={handleShareSession}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all shadow-sm active:scale-95 ${shareStyles.copyBtnClass}`}
            title="Quick Copy Direct URL Hash"
          >
            {copiedShareLink ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Sparkles className={`w-4 h-4 ${shareStyles.copyIconClass}`} />
            )}
          </button>

          {/* Quick Radix UI Themes Cycle Button */}
          <button
            id="btn-cycle-realtime-colors"
            onClick={handleCycleRealtimePalette}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-heading font-bold border transition-all shadow-sm active:scale-95 ${
              isLightTheme
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 hover:border-slate-400'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-indigo-500/40'
            }`}
            title="Cycle Radix UI Themes (@radix-ui/themes)"
          >
            <Palette className={`w-4 h-4 ${isLightTheme ? 'text-indigo-700' : 'text-indigo-400'}`} />
            <span className="hidden md:inline">Theme</span>
            <span
              className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: REALTIME_PALETTES.find((p) => p.id === realtimePaletteId)?.primary || '#3e63dd' }}
            />
          </button>

          {/* Settings Drawer Button */}
          <button
            id="btn-open-settings"
            onClick={() => {
              playSoundFeedback('click');
              setIsSettingsOpen(true);
            }}
            className="p-2 sm:p-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm active:scale-95"
            title="Preferences & Accessibility (Cmd+,)"
          >
            <Settings className="w-4 h-4 text-zinc-400 hover:text-cyan-400 transition" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout with Staggered Entrance */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex-1 p-3 md:p-4 max-w-[1800px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        {/* Left Sidebar: Controls & AI Analysis (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <DatasetControlPanel
            config={config}
            colorScheme={colorScheme}
            pointSize={pointSize}
            ballOpacity={ballOpacity}
            isComputing={isComputing}
            onConfigChange={handleConfigChange}
            onColorSchemeChange={setColorScheme}
            onPointSizeChange={setPointSize}
            onBallOpacityChange={setBallOpacity}
            onRegenerate={() => runComputation(config)}
            onFileUpload={handleFileUpload}
            onOpenInspector={() => setIsInspectorOpen(true)}
          />

          <AITopologyCopilot
            config={config}
            tdaResult={tdaResult}
            activeComplex={activeComplex}
          />
        </div>

        {/* Right Area: 3D Visualizer + Diagrams + Time Machine (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Top: 3D Point Cloud & Simplicial Complex Viewer */}
          <div className="h-[360px] sm:h-[430px] w-full">
            <PointCloudViewer3D
              points={points}
              tdaResult={tdaResult}
              activeComplex={activeComplex}
              currentEpsilon={currentEpsilon}
              selectedPair={selectedPair}
              hoveredPair={hoveredPair}
              colorScheme={colorScheme}
              colorBlindness={settings.colorBlindness}
              settings={settings}
              showBalls={showBalls}
              showEdges={showEdges}
              showTriangles={showTriangles}
              showGeneratorCycle={showGeneratorCycle}
              pointSize={pointSize}
              ballOpacity={ballOpacity}
              onSelectPair={(pair) => setSelectedPair(pair)}
              onOpenExplain={handleOpenExplainForPair}
            />
          </div>

          {/* Filtration Time Machine Controller */}
          <FiltrationController
            tdaResult={tdaResult}
            currentEpsilon={currentEpsilon}
            maxEpsilon={tdaResult?.maxEpsilon || 1.0}
            isPlaying={isPlaying}
            playSpeed={playSpeed}
            activeComplex={activeComplex}
            showBalls={showBalls}
            showEdges={showEdges}
            showTriangles={showTriangles}
            showGeneratorCycle={showGeneratorCycle}
            onEpsilonChange={setCurrentEpsilon}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onChangeSpeed={setPlaySpeed}
            onToggleBalls={() => setShowBalls(!showBalls)}
            onToggleEdges={() => setShowEdges(!showEdges)}
            onToggleTriangles={() => setShowTriangles(!showTriangles)}
            onToggleGeneratorCycle={() => setShowGeneratorCycle(!showGeneratorCycle)}
          />

          {/* Bottom: Synchronized Multi-View Interactive Dashboard */}
          <div
            className={`rounded-xl border p-3 shadow-xl flex flex-col h-[480px] min-h-[440px] max-h-[520px] font-sans overflow-hidden transition-colors ${
              isLightTheme
                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
                : isBlueprintTheme
                ? 'bg-[#0b1329] border-sky-900/60 text-sky-100'
                : 'bg-[#09090b] border-zinc-800 text-zinc-100'
            }`}
          >
            {/* Tab Bar */}
            <div
              className={`flex flex-wrap items-center justify-between pb-2 border-b gap-2 ${
                isLightTheme ? 'border-slate-200' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1 overflow-x-auto font-mono py-0.5">
                <button
                  id="tab-btn-diagram"
                  onClick={() => {
                    playSoundFeedback('toggle');
                    setActiveTab('diagram');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'diagram'
                      ? isLightTheme
                        ? 'bg-sky-100 text-sky-950 border border-sky-300 font-bold shadow-sm'
                        : 'tda-tab-active shadow-sm'
                      : isLightTheme
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200'
                      : 'tda-tab-inactive'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Persistence Diagram</span>
                </button>

                <button
                  id="tab-btn-barcode"
                  onClick={() => {
                    playSoundFeedback('toggle');
                    setActiveTab('barcode');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'barcode'
                      ? isLightTheme
                        ? 'bg-sky-100 text-sky-950 border border-sky-300 font-bold shadow-sm'
                        : 'tda-tab-active shadow-sm'
                      : isLightTheme
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200'
                      : 'tda-tab-inactive'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Barcode (Intervals)</span>
                </button>

                <button
                  id="tab-btn-betti"
                  onClick={() => {
                    playSoundFeedback('toggle');
                    setActiveTab('betti');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'betti'
                      ? isLightTheme
                        ? 'bg-sky-100 text-sky-950 border border-sky-300 font-bold shadow-sm'
                        : 'tda-tab-active shadow-sm'
                      : isLightTheme
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200'
                      : 'tda-tab-inactive'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Betti & Euler Curves</span>
                </button>

                <button
                  id="tab-btn-landscape"
                  onClick={() => {
                    playSoundFeedback('toggle');
                    setActiveTab('landscape');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'landscape'
                      ? isLightTheme
                        ? 'bg-sky-100 text-sky-950 border border-sky-300 font-bold shadow-sm'
                        : 'tda-tab-active shadow-sm'
                      : isLightTheme
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200'
                      : 'tda-tab-inactive'
                  }`}
                >
                  <Mountain className="w-3.5 h-3.5" />
                  <span>Landscapes & ML Vectors</span>
                </button>
              </div>

              {/* Status Indicator & Explain Trigger */}
              <div
                className={`text-[11px] font-mono hidden sm:flex items-center gap-3 ${
                  isLightTheme ? 'text-slate-600' : 'text-zinc-400'
                }`}
              >
                {selectedPair && (
                  <button
                    onClick={() => {
                      playSoundFeedback('click');
                      setIsExplainOpen(true);
                    }}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition ${
                      isLightTheme
                        ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-300 font-semibold'
                        : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-800/80'
                    }`}
                  >
                    <Sparkles className={`w-3 h-3 ${isLightTheme ? 'text-sky-700' : 'text-cyan-400'}`} />
                    <span>Explain {selectedPair.id}</span>
                  </button>
                )}
                <span>
                  Features:{' '}
                  <strong className={isLightTheme ? 'text-slate-900 font-bold' : 'text-zinc-200'}>
                    {tdaResult?.pairs.length || 0}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Runtime:{' '}
                  <strong className={isLightTheme ? 'text-sky-700 font-bold' : 'text-cyan-300'}>
                    {tdaResult?.computationTimeMs || 0}ms
                  </strong>
                </span>
              </div>
            </div>

            {/* Tab Views */}
            <div className="flex-1 min-h-0 min-w-0 pt-2 relative overflow-hidden">
              {activeTab === 'diagram' && (
                <PersistenceDiagram
                  tdaResult={tdaResult}
                  currentEpsilon={currentEpsilon}
                  selectedPair={selectedPair}
                  hoveredPair={hoveredPair}
                  noiseThreshold={config.noiseFilterRatio * (tdaResult?.maxEpsilon || 1)}
                  colorBlindness={settings.colorBlindness}
                  magneticSnap={settings.magneticSnap}
                  isLightTheme={isLightTheme}
                  onHoverPair={setHoveredPair}
                  onSelectPair={setSelectedPair}
                  onOpenExplain={handleOpenExplainForPair}
                />
              )}

              {activeTab === 'barcode' && (
                <PersistenceBarcode
                  tdaResult={tdaResult}
                  currentEpsilon={currentEpsilon}
                  selectedPair={selectedPair}
                  hoveredPair={hoveredPair}
                  noiseThreshold={config.noiseFilterRatio * (tdaResult?.maxEpsilon || 1)}
                  colorBlindness={settings.colorBlindness}
                  isLightTheme={isLightTheme}
                  onHoverPair={setHoveredPair}
                  onSelectPair={setSelectedPair}
                />
              )}

              {activeTab === 'betti' && (
                <BettiAndEulerCurves
                  tdaResult={tdaResult}
                  currentEpsilon={currentEpsilon}
                  isLightTheme={isLightTheme}
                  onSelectEpsilon={setCurrentEpsilon}
                />
              )}

              {activeTab === 'landscape' && (
                <PersistenceLandscapes
                  tdaResult={tdaResult}
                  currentEpsilon={currentEpsilon}
                  isLightTheme={isLightTheme}
                />
              )}
            </div>
          </div>
        </div>
      </motion.main>

      {/* Creator Branding & Legal Metadata Footer */}
      <footer
        id="app-footer"
        className={`mt-auto border-t px-4 sm:px-6 py-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-mono z-20 ${
          isLightTheme
            ? 'bg-white border-slate-300 text-black'
            : isBlueprintTheme
            ? 'border-sky-900/80 bg-[#070f26] text-sky-200'
            : 'border-zinc-800/80 bg-zinc-950 text-zinc-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${isLightTheme ? 'text-black' : 'text-zinc-300'}`}>
            <span className={`w-2 h-2 rounded-full ${isLightTheme ? 'bg-indigo-600' : 'bg-cyan-400'}`} />
            <span className={isLightTheme ? 'font-bold text-black' : 'font-medium'}>Architect & Creator:</span>
            <span className={isLightTheme ? 'font-black text-black' : 'font-bold text-white'}>Dhurgham Alsaadi</span>
          </div>

          <a
            href="https://github.com/dhurghamCreation"
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1 text-[11px] underline underline-offset-2 transition ${
              isLightTheme ? 'text-black hover:text-indigo-800 font-bold' : 'text-cyan-400 hover:text-cyan-300'
            }`}
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Legal & Preferences Quick Access */}
        <div className={`flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] ${isLightTheme ? 'text-black font-semibold' : ''}`}>
          <button
            onClick={() => setLegalModalType('terms')}
            className={`transition flex items-center gap-1 ${isLightTheme ? 'text-black hover:text-indigo-700' : 'hover:text-zinc-200'}`}
          >
            <Scale className={`w-3 h-3 ${isLightTheme ? 'text-amber-600' : 'text-amber-400'}`} />
            <span>License (MIT)</span>
          </button>

          <button
            onClick={() => setLegalModalType('privacy')}
            className={`transition flex items-center gap-1 ${isLightTheme ? 'text-black hover:text-emerald-700' : 'hover:text-zinc-200'}`}
          >
            <Shield className={`w-3 h-3 ${isLightTheme ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span>Privacy Guarantee</span>
          </button>

          <button
            onClick={() => setLegalModalType('citation')}
            className={`transition flex items-center gap-1 ${isLightTheme ? 'text-black hover:text-cyan-700' : 'hover:text-zinc-200'}`}
          >
            <FileText className={`w-3 h-3 ${isLightTheme ? 'text-blue-600' : 'text-cyan-400'}`} />
            <span>Cite Software</span>
          </button>

          <button
            onClick={() => setIsTutorialOpen(true)}
            className={`transition flex items-center gap-1 ${isLightTheme ? 'text-black hover:text-purple-700' : 'hover:text-purple-300 text-zinc-300'}`}
          >
            <HelpCircle className={`w-3 h-3 ${isLightTheme ? 'text-purple-600' : 'text-purple-400'}`} />
            <span>Tutorial</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`transition flex items-center gap-1 ${isLightTheme ? 'text-black hover:text-cyan-700' : 'hover:text-cyan-300 text-zinc-300'}`}
          >
            <Settings className={`w-3 h-3 ${isLightTheme ? 'text-black' : 'text-zinc-400'}`} />
            <span>Preferences</span>
          </button>
        </div>
      </footer>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        config={config}
        isPlaying={isPlaying}
        onConfigChange={handleConfigChange}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onResetEpsilon={() => setCurrentEpsilon(0)}
        onToggleBalls={() => setShowBalls(!showBalls)}
        onToggleEdges={() => setShowEdges(!showEdges)}
        onToggleTriangles={() => setShowTriangles(!showTriangles)}
        onToggleGeneratorCycle={() => setShowGeneratorCycle(!showGeneratorCycle)}
        onOpenComparison={() => setIsComparisonOpen(true)}
        onOpenTheory={() => setIsTheoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenExplain={() => setIsExplainOpen(true)}
        onOpenInspector={() => setIsInspectorOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onShareSession={handleShareSession}
        onOpenLegal={(type) => setLegalModalType(type)}
      />

      {/* Matrix Data Inspector Modal */}
      <DataInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onLoadCustomPoints={handleCustomPointsLoaded}
      />

      {/* Guided In-App Tutorial Modal */}
      <GuidedTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Settings & Accessibility Preferences Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenLegal={(type) => setLegalModalType(type)}
      />

      {/* Feature Deep-Dive Mathematical Inspector Drawer */}
      <ExplainFeatureDrawer
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        pair={selectedPair || hoveredPair}
        tdaResult={tdaResult}
        points={points}
        noiseThreshold={config.noiseFilterRatio * (tdaResult?.maxEpsilon || 1)}
      />

      {/* Fullscreen Snapshot & Presentation Studio */}
      <PresentationMode
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        points={points}
        tdaResult={tdaResult}
        activeComplex={activeComplex}
        datasetConfig={config}
        currentEpsilon={currentEpsilon}
        selectedPair={selectedPair}
        hoveredPair={hoveredPair}
        colorScheme={colorScheme}
        colorBlindness={settings.colorBlindness}
        settings={settings}
        showBalls={showBalls}
        showEdges={showEdges}
        showTriangles={showTriangles}
        showGeneratorCycle={showGeneratorCycle}
        pointSize={pointSize}
        ballOpacity={ballOpacity}
        noiseThreshold={config.noiseFilterRatio * (tdaResult?.maxEpsilon || 1)}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onEpsilonChange={setCurrentEpsilon}
        onHoverPair={setHoveredPair}
        onSelectPair={setSelectedPair}
        onOpenExplain={handleOpenExplainForPair}
      />

      {/* Legal & Policy Modals */}
      <LegalModals
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      {/* Theory & Comparison & Export Modals */}
      <TheoryDocumentationModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
        onOpenMinigame={() => {
          setIsTheoryOpen(false);
          setIsMinigameOpen(true);
        }}
      />

      <TopologicalComparisonModal
        isOpen={isComparisonOpen}
        baseConfig={config}
        baseTdaResult={tdaResult}
        onClose={() => setIsComparisonOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        config={config}
        points={points}
        tdaResult={tdaResult}
        onClose={() => setIsExportOpen(false)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        config={config}
        currentEpsilon={currentEpsilon}
        activeTab={activeTab}
        theme={settings.theme}
        isLightTheme={isLightTheme}
      />

      <TdaMinigameModal
        isOpen={isMinigameOpen}
        onClose={() => setIsMinigameOpen(false)}
        onOpenTheory={() => {
          setIsMinigameOpen(false);
          setIsTheoryOpen(true);
        }}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
