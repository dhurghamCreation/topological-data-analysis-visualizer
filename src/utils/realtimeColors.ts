/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RealtimeColorPalette {
  id: string;
  name: string;
  radixAccent?: string;
  radixGray?: string;
  appearance?: 'dark' | 'light';
  text: string;
  background: string;
  card: string;
  elevated: string;
  border: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  accentGlow: string;
}

export const REALTIME_PALETTES: RealtimeColorPalette[] = [
  {
    id: 'radix-slate-indigo',
    name: 'Radix UI Indigo & Slate (Default)',
    radixAccent: 'indigo',
    radixGray: 'slate',
    appearance: 'dark',
    text: '#f8fafc',
    background: '#111318',
    card: '#181b22',
    elevated: '#222631',
    border: 'rgba(255, 255, 255, 0.12)',
    primary: '#3e63dd', // Radix Indigo 9
    primaryHover: '#3657c9',
    secondary: '#202438',
    accent: '#9bb1ff', // Radix Indigo 11
    accentGlow: 'rgba(62, 99, 221, 0.4)',
  },
  {
    id: 'radix-cyan-slate',
    name: 'Radix UI Cyan & Slate',
    radixAccent: 'cyan',
    radixGray: 'slate',
    appearance: 'dark',
    text: '#f8fafc',
    background: '#0e151b',
    card: '#141d26',
    elevated: '#1a2734',
    border: 'rgba(255, 255, 255, 0.12)',
    primary: '#00a2c7', // Radix Cyan 9
    primaryHover: '#0394b6',
    secondary: '#112836',
    accent: '#4ccbe6',
    accentGlow: 'rgba(0, 162, 199, 0.4)',
  },
  {
    id: 'radix-violet-mauve',
    name: 'Radix UI Violet & Mauve',
    radixAccent: 'violet',
    radixGray: 'mauve',
    appearance: 'dark',
    text: '#fbfaff',
    background: '#131118',
    card: '#1a1724',
    elevated: '#242033',
    border: 'rgba(255, 255, 255, 0.12)',
    primary: '#6e56cf', // Radix Violet 9
    primaryHover: '#654dc4',
    secondary: '#26203f',
    accent: '#baa7ff',
    accentGlow: 'rgba(110, 86, 207, 0.4)',
  },
  {
    id: 'radix-jade-olive',
    name: 'Radix UI Jade & Olive',
    radixAccent: 'jade',
    radixGray: 'olive',
    appearance: 'dark',
    text: '#f4fbf7',
    background: '#0e1512',
    card: '#141f1a',
    elevated: '#1c2c25',
    border: 'rgba(255, 255, 255, 0.12)',
    primary: '#29a383', // Radix Jade 9
    primaryHover: '#239174',
    secondary: '#132c23',
    accent: '#69dbb7',
    accentGlow: 'rgba(41, 163, 131, 0.4)',
  },
  {
    id: 'radix-amber-sand',
    name: 'Radix UI Amber & Sand',
    radixAccent: 'amber',
    radixGray: 'sand',
    appearance: 'dark',
    text: '#fffdf5',
    background: '#16140e',
    card: '#201c13',
    elevated: '#2c271b',
    border: 'rgba(255, 255, 255, 0.12)',
    primary: '#ffc53d', // Radix Amber 9
    primaryHover: '#f1b72e',
    secondary: '#362a14',
    accent: '#ffe7a3',
    accentGlow: 'rgba(255, 197, 61, 0.35)',
  },
  {
    id: 'realtime-electric-cobalt',
    name: 'Realtime Colors Electric Cobalt',
    radixAccent: 'blue',
    radixGray: 'slate',
    appearance: 'dark',
    text: '#f8fafc',
    background: '#070f26',
    card: '#0c173b',
    elevated: '#13245c',
    border: 'rgba(56, 189, 248, 0.4)',
    primary: '#38bdf8',
    primaryHover: '#7dd3fc',
    secondary: '#172554',
    accent: '#60a5fa',
    accentGlow: 'rgba(56, 189, 248, 0.5)',
  },
  {
    id: 'research-white-clean',
    name: 'Radix Light Pure White & Slate',
    radixAccent: 'indigo',
    radixGray: 'slate',
    appearance: 'light',
    text: '#090d16',
    background: '#f8fafc',
    card: '#ffffff',
    elevated: '#f1f5f9',
    border: '#cbd5e1',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    secondary: '#dbeafe',
    accent: '#1d4ed8',
    accentGlow: 'rgba(37, 99, 235, 0.25)',
  },
  {
    id: 'natural-sage',
    name: 'Natural Sage & Earth',
    radixAccent: 'grass',
    radixGray: 'olive',
    appearance: 'dark',
    text: '#eaf2ec',
    background: '#0d1410',
    card: '#141f19',
    elevated: '#1c2a23',
    border: '#273a30',
    primary: '#34d399',
    primaryHover: '#6ee7b7',
    secondary: '#1a382b',
    accent: '#a7f3d0',
    accentGlow: 'rgba(52, 211, 153, 0.25)',
  },
  {
    id: 'natural-clay',
    name: 'Natural Clay & Terracotta',
    radixAccent: 'orange',
    radixGray: 'sand',
    appearance: 'dark',
    text: '#f6f1ea',
    background: '#13110f',
    card: '#1c1916',
    elevated: '#282420',
    border: '#3b352e',
    primary: '#ea580c',
    primaryHover: '#f97316',
    secondary: '#3a2012',
    accent: '#fdba74',
    accentGlow: 'rgba(234, 88, 12, 0.25)',
  },
  {
    id: 'natural-stone',
    name: 'Natural Mineral Stone',
    radixAccent: 'sky',
    radixGray: 'slate',
    appearance: 'dark',
    text: '#e9eff5',
    background: '#0c1217',
    card: '#131c24',
    elevated: '#1a2632',
    border: '#263748',
    primary: '#38bdf8',
    primaryHover: '#7dd3fc',
    secondary: '#163246',
    accent: '#bae6fd',
    accentGlow: 'rgba(56, 189, 248, 0.25)',
  },
  {
    id: 'natural-moss',
    name: 'Natural Olive Moss',
    radixAccent: 'lime',
    radixGray: 'olive',
    appearance: 'dark',
    text: '#eff3ea',
    background: '#10130d',
    card: '#181c13',
    elevated: '#232a1c',
    border: '#35402b',
    primary: '#84cc16',
    primaryHover: '#a3e635',
    secondary: '#2a3814',
    accent: '#bef264',
    accentGlow: 'rgba(132, 204, 22, 0.25)',
  },
  {
    id: 'natural-linen',
    name: 'Radix Light Linen & Sage',
    radixAccent: 'jade',
    radixGray: 'sage',
    appearance: 'light',
    text: '#17201a',
    background: '#f7f9f6',
    card: '#edf2ea',
    elevated: '#e2ebe0',
    border: '#cad8c6',
    primary: '#2d6a4f',
    primaryHover: '#1b4332',
    secondary: '#d8f3dc',
    accent: '#52b788',
    accentGlow: 'rgba(45, 106, 79, 0.2)',
  },
];

export function applyRealtimePalette(paletteId: string): void {
  const palette = REALTIME_PALETTES.find((p) => p.id === paletteId) || REALTIME_PALETTES[0];
  const root = document.documentElement;

  root.style.setProperty('--realtime-text', palette.text);
  root.style.setProperty('--realtime-background', palette.background);
  root.style.setProperty('--realtime-card', palette.card);
  root.style.setProperty('--realtime-elevated', palette.elevated);
  root.style.setProperty('--realtime-border', palette.border);
  root.style.setProperty('--realtime-primary', palette.primary);
  root.style.setProperty('--realtime-primary-hover', palette.primaryHover);
  root.style.setProperty('--realtime-secondary', palette.secondary);
  root.style.setProperty('--realtime-accent', palette.accent);
  root.style.setProperty('--realtime-accent-glow', palette.accentGlow);

  // Sync Radix Theme tokens directly in root CSS variables
  root.style.setProperty('--radix-primary', palette.primary);
  root.style.setProperty('--radix-accent', palette.accent);
  root.style.setProperty('--radix-accent-soft', palette.secondary);
  root.style.setProperty('--radix-border', palette.border);
  root.style.setProperty('--color-background', palette.background);
  root.style.setProperty('--color-surface', palette.card);
  root.style.setProperty('--color-panel-solid', palette.card);
  root.style.setProperty(
    '--color-panel-translucent',
    palette.appearance === 'light' ? 'rgba(237, 242, 234, 0.94)' : 'rgba(24, 27, 34, 0.88)'
  );

  // Sync Radix UI DOM theme attributes
  if (palette.radixAccent) {
    root.setAttribute('data-accent-color', palette.radixAccent);
  }
  if (palette.radixGray) {
    root.setAttribute('data-gray-color', palette.radixGray);
  }
  root.setAttribute('data-appearance', palette.appearance || 'dark');

  try {
    localStorage.setItem('tda_realtime_palette', palette.id);
  } catch (e) {
    // localStorage fallback
  }

  // Dispatch event for canvas & 3D WebGL scenes to sync background colors
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('realtime-palette-change', { detail: palette }));
  }
}

export function getInitialRealtimePalette(): string {
  try {
    const saved = localStorage.getItem('tda_realtime_palette');
    if (saved && REALTIME_PALETTES.some((p) => p.id === saved)) {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return 'radix-slate-indigo';
}

// Auto-apply initial palette on load immediately
if (typeof window !== 'undefined') {
  applyRealtimePalette(getInitialRealtimePalette());
}

