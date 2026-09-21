/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatasetConfig } from '../types/tda';

export interface SharedSessionState {
  config: Partial<DatasetConfig>;
  epsilon?: number;
  activeTab?: string;
}

/**
 * Encode current mathematical parameters into a shareable URL hash
 */
export function encodeStateToUrlHash(config: DatasetConfig, currentEpsilon: number, activeTab = 'diagram'): string {
  const minimalState = {
    t: config.type,
    n: config.numPoints,
    ns: Number(config.noise.toFixed(3)),
    m: config.metric,
    f: config.filtrationModel,
    s: config.subsampling,
    st: config.subsampleTarget,
    md: config.maxDimension,
    r: config.paramR,
    r2: config.paramR2,
    nf: Number(config.noiseFilterRatio.toFixed(3)),
    eps: Number(currentEpsilon.toFixed(3)),
    tab: activeTab,
  };

  try {
    const json = JSON.stringify(minimalState);
    const b64 = btoa(json);
    return `#state=${b64}`;
  } catch (e) {
    return '';
  }
}

/**
 * Decode shared state from URL hash
 */
export function decodeStateFromUrlHash(): SharedSessionState | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('#state=')) return null;

  try {
    const b64 = hash.replace('#state=', '');
    const json = atob(b64);
    const parsed = JSON.parse(json);

    const configPartial: Partial<DatasetConfig> = {};
    if (parsed.t) configPartial.type = parsed.t;
    if (parsed.n) configPartial.numPoints = parsed.n;
    if (typeof parsed.ns === 'number') configPartial.noise = parsed.ns;
    if (parsed.m) configPartial.metric = parsed.m;
    if (parsed.f) configPartial.filtrationModel = parsed.f;
    if (parsed.s) configPartial.subsampling = parsed.s;
    if (parsed.st) configPartial.subsampleTarget = parsed.st;
    if (parsed.md) configPartial.maxDimension = parsed.md;
    if (typeof parsed.r === 'number') configPartial.paramR = parsed.r;
    if (typeof parsed.r2 === 'number') configPartial.paramR2 = parsed.r2;
    if (typeof parsed.nf === 'number') configPartial.noiseFilterRatio = parsed.nf;

    return {
      config: configPartial,
      epsilon: typeof parsed.eps === 'number' ? parsed.eps : undefined,
      activeTab: parsed.tab,
    };
  } catch (e) {
    console.warn('Failed to decode TDA state from URL hash:', e);
    return null;
  }
}

/**
 * Generate full share URL
 */
export function generateShareableUrl(config: DatasetConfig, currentEpsilon: number, activeTab = 'diagram'): string {
  if (typeof window === 'undefined') return '';
  const hash = encodeStateToUrlHash(config, currentEpsilon, activeTab);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}${hash}`;
}
