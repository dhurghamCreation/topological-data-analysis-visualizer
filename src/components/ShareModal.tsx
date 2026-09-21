/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import {
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  QrCode,
  Mail,
  MessageSquare,
  Globe,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { DatasetConfig, ThemeMode } from '../types/tda';
import { generateShareableUrl } from '../utils/urlStateEncoding';
import { playSoundFeedback } from '../utils/audioSonification';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DatasetConfig;
  currentEpsilon: number;
  activeTab: string;
  theme?: ThemeMode;
  isLightTheme?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  config,
  currentEpsilon,
  activeTab,
  theme = 'obsidian',
  isLightTheme = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  const isLight = isLightTheme || theme === 'light';
  const isBlueprint = theme === 'blueprint';

  const shareUrl = generateShareableUrl(config, currentEpsilon, activeTab as any);
  const shareTitle = `Explore Persistent Homology of ${config.name} with ε = ${currentEpsilon.toFixed(3)} in TDA Suite!`;

  // Unique Non-Blue Color Palette for each Theme
  const themeStyles = isLight
    ? {
        badgeBg: 'bg-rose-100 border-rose-300 text-rose-700 shadow-sm',
        accentText: 'text-rose-800 font-extrabold',
        copyBtn: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20',
        nativeShareBtn: 'from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white',
        cardBg: 'bg-white border-slate-300 text-black',
        headerBg: 'bg-slate-50 border-slate-200',
        inputBg: 'bg-slate-50 border-slate-300 text-black focus:border-rose-500',
        socialCard: 'bg-slate-50 border-slate-300 text-black hover:bg-slate-100 hover:border-slate-400',
        footerBg: 'bg-slate-50 border-slate-200 text-black',
        labelColor: 'text-black font-bold',
      }
    : isBlueprint
    ? {
        badgeBg: 'bg-amber-950/80 border-amber-600/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
        accentText: 'text-amber-300 font-extrabold',
        copyBtn: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold shadow-amber-500/20',
        nativeShareBtn: 'from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold',
        cardBg: 'bg-[#0b1329] border-sky-900/60 text-sky-100',
        headerBg: 'bg-[#070f26] border-sky-900/60',
        inputBg: 'bg-[#050b1a] border-sky-900/80 text-amber-300 focus:border-amber-400',
        socialCard: 'bg-[#070f26] border-sky-900/60 text-zinc-200 hover:border-amber-400 hover:text-amber-200',
        footerBg: 'bg-[#070f26] border-sky-900/60 text-sky-300',
        labelColor: 'text-amber-300 font-mono font-bold',
      }
    : {
        // Obsidian Dark Mode -> Brilliant Mint Emerald
        badgeBg: 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
        accentText: 'text-emerald-300 font-extrabold',
        copyBtn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold shadow-emerald-500/20',
        nativeShareBtn: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold',
        cardBg: 'bg-[#09090b] border-zinc-800 text-zinc-100',
        headerBg: 'bg-zinc-900/50 border-zinc-800',
        inputBg: 'bg-zinc-950 border-zinc-800 text-emerald-300 focus:border-emerald-500',
        socialCard: 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-emerald-400 hover:text-emerald-200',
        footerBg: 'bg-zinc-900/30 border-zinc-800 text-zinc-400',
        labelColor: 'text-emerald-400 font-mono font-bold',
      };

  // Instant local QR code generation with zero network lag
  useEffect(() => {
    if (showQr && shareUrl) {
      setIsGeneratingQr(true);
      QRCode.toDataURL(shareUrl, {
        width: 256,
        margin: 1.5,
        color: {
          dark: isLight ? '#000000' : '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => {
          setQrDataUrl(url);
          setIsGeneratingQr(false);
        })
        .catch((err) => {
          console.error('Local QR code error:', err);
          setIsGeneratingQr(false);
        });
    }
  }, [showQr, shareUrl, isLight]);

  if (!isOpen) return null;

  const handleCopy = () => {
    playSoundFeedback('complete');
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Topological Data Analysis Session',
          text: shareTitle,
          url: shareUrl,
        });
      } catch (err) {
        // user cancelled or failed
      }
    } else {
      handleCopy();
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent('Topological Data Analysis Session')}&body=${encodeURIComponent(`Check out this topological manifold analysis:\n\n${shareTitle}\n\n${shareUrl}`)}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`w-full max-w-lg ${themeStyles.cardBg} border rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans transition-colors`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${themeStyles.headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${themeStyles.badgeBg}`}>
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold font-mono ${isLight ? 'text-black' : 'text-zinc-100'}`}>
                  Advanced Sharing Studio
                </h2>
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${themeStyles.badgeBg}`}>
                  {isLight ? 'Crimson Rose' : isBlueprint ? 'Radiant Amber' : 'Emerald Mint'}
                </span>
              </div>
              <p className={`text-[11px] font-sans ${isLight ? 'text-black font-semibold' : 'text-zinc-400'}`}>
                Share your exact topological manifold state and filtration scale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'text-black hover:text-red-600 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Direct Link Copy */}
          <div className="space-y-1.5">
            <label className={`text-xs font-mono uppercase tracking-wider ${themeStyles.labelColor}`}>
              Mathematical Session URL Hash
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className={`flex-1 border rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none select-all transition ${themeStyles.inputBg}`}
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition shadow-md shrink-0 active:scale-95 ${themeStyles.copyBtn}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Social Platforms & Quick Export */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => playSoundFeedback('click')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-1.5 group cursor-pointer ${themeStyles.socialCard}`}
              title="Share on X / Twitter"
            >
              <Globe className="w-4 h-4 text-sky-500 group-hover:scale-125 transition-transform duration-200" />
              <span className={`text-xs ${isLight ? 'text-black font-bold' : 'font-medium'}`}>X / Twitter</span>
            </a>

            {/* LinkedIn */}
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => playSoundFeedback('click')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-1.5 group cursor-pointer ${themeStyles.socialCard}`}
              title="Share on LinkedIn"
            >
              <ExternalLink className="w-4 h-4 text-blue-600 group-hover:scale-125 transition-transform duration-200" />
              <span className={`text-xs ${isLight ? 'text-black font-bold' : 'font-medium'}`}>LinkedIn</span>
            </a>

            {/* Email */}
            <a
              href={emailUrl}
              onClick={() => playSoundFeedback('click')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-1.5 group cursor-pointer ${themeStyles.socialCard}`}
              title="Share via Email"
            >
              <Mail className="w-4 h-4 text-amber-500 group-hover:scale-125 transition-transform duration-200" />
              <span className={`text-xs ${isLight ? 'text-black font-bold' : 'font-medium'}`}>Email</span>
            </a>

            {/* QR Code */}
            <button
              onClick={() => {
                playSoundFeedback('click');
                setShowQr(!showQr);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-1.5 group cursor-pointer ${
                showQr
                  ? isLight
                    ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm ring-1 ring-purple-400'
                    : 'bg-purple-950/60 border-purple-400 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-1 ring-purple-400'
                  : themeStyles.socialCard
              }`}
              title="Generate Instant Session QR Code"
            >
              <QrCode className="w-4 h-4 text-purple-500 group-hover:scale-125 transition-transform duration-200" />
              <span className={`text-xs ${isLight ? 'text-black font-bold' : 'font-medium'}`}>QR Code</span>
            </button>
          </div>

          {/* QR Code Instant Preview Box */}
          <AnimatePresence>
            {showQr && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 border rounded-xl flex flex-col items-center gap-3 text-center shadow-inner ${
                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-zinc-950 border-purple-900/40'
                }`}
              >
                <div className="w-44 h-44 bg-white p-3 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-purple-500/30">
                  {isGeneratingQr ? (
                    <div className="flex flex-col items-center gap-2 text-slate-600 font-mono text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                      <span>Generating QR...</span>
                    </div>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Session QR Code"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : null}
                </div>
                <div className={`text-[11px] font-mono ${isLight ? 'text-black font-bold' : 'text-zinc-400'}`}>
                  Instant client-side QR generation. Scan with your camera to open this exact state.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Native Web Share API */}
          {typeof navigator.share === 'function' && (
            <button
              onClick={handleWebShare}
              className={`w-full py-2.5 bg-gradient-to-r rounded-xl text-xs font-mono font-bold transition shadow-md flex items-center justify-center gap-2 ${themeStyles.nativeShareBtn}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Use Native System Share</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t text-[11px] font-mono flex items-center justify-between ${themeStyles.footerBg}`}>
          <span className={isLight ? 'text-black font-semibold' : ''}>State compression: Active</span>
          <span className={isLight ? 'text-black font-black' : ''}>Architect: Dhurgham Alsaadi</span>
        </div>
      </motion.div>
    </div>
  );
};
