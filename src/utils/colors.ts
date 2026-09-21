/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorBlindnessMode } from '../types/tda';

/**
 * Color blindness optimized palettes (Okabe-Ito & Tol palettes)
 */
export const HOMOLOGY_COLORS: Record<
  ColorBlindnessMode,
  { 0: string; 1: string; 2: string; hex0: number; hex1: number; hex2: number }
> = {
  standard: {
    0: '#f59e0b', // Amber / orange (H0)
    1: '#06b6d4', // Cyan / sky (H1)
    2: '#10b981', // Emerald (H2)
    hex0: 0xf59e0b,
    hex1: 0x06b6d4,
    hex2: 0x10b981,
  },
  deuteranopia: {
    // Deuteranopia (green-weak/blind): Blue, Yellow-Orange, Vermillion
    0: '#e69f00', // Yellow-orange
    1: '#56b4e9', // Sky blue
    2: '#0072b2', // Dark blue
    hex0: 0xe69f00,
    hex1: 0x56b4e9,
    hex2: 0x0072b2,
  },
  protanopia: {
    // Protanopia (red-weak/blind): Blue, Yellow, Purple
    0: '#f0e442', // Yellow
    1: '#0072b2', // Blue
    2: '#cc79a7', // Reddish purple
    hex0: 0xf0e442,
    hex1: 0x0072b2,
    hex2: 0xcc79a7,
  },
  tritanopia: {
    // Tritanopia (blue-weak/blind): Cyan, Crimson, Magenta
    0: '#d55e00', // Vermillion
    1: '#009e73', // Bluish green
    2: '#cc79a7', // Magenta
    hex0: 0xd55e00,
    hex1: 0x009e73,
    hex2: 0xcc79a7,
  },
};

export function getDimensionColor(dim: 0 | 1 | 2, mode: ColorBlindnessMode = 'standard'): string {
  return HOMOLOGY_COLORS[mode]?.[dim] || HOMOLOGY_COLORS.standard[dim];
}

export function getDimensionHexColor(dim: 0 | 1 | 2, mode: ColorBlindnessMode = 'standard'): number {
  return HOMOLOGY_COLORS[mode]?.[`hex${dim}` as const] || HOMOLOGY_COLORS.standard[`hex${dim}` as const];
}
