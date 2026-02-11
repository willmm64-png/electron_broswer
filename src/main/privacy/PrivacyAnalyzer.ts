import { getDomain } from 'tldts';
import type { PrivacyReport } from '@/shared/types';

const TRACKER_PATTERNS = [
  { keyword: 'google-analytics', type: 'analytics' as const },
  { keyword: 'doubleclick', type: 'advertising' as const },
  { keyword: 'facebook', type: 'social' as const },
  { keyword: 'segment', type: 'analytics' as const }
];

export class PrivacyAnalyzer {
  analyzePage(url: string, requests: Array<{ url: string; type: string }>, cookies = 0): PrivacyReport {
    const trackers = this.detectTrackers(requests);
    const thirdPartyRequests = this.thirdPartyCount(url, requests);
    const fingerprintingDetected = requests.some((req) => /fingerprint|canvas|webrtc|webgl/i.test(req.url));
    const https = url.startsWith('https://');
    const privacyScore = this.calculatePrivacyScore({ https, trackers, thirdPartyRequests, cookies, fingerprintingDetected });

    const recommendations: string[] = [];
    if (!https) recommendations.push('Use HTTPS where possible');
    if (trackers.length > 0) recommendations.push('Trackers detected; keep shield enabled');
    if (thirdPartyRequests > 20) recommendations.push('High third-party activity detected');

    return { url, https, trackers, thirdPartyRequests, cookies, fingerprintingDetected, privacyScore, recommendations };
  }

  detectTrackers(requests: Array<{ url: string }>) {
    const counter = new Map<string, { domain: string; type: 'analytics' | 'advertising' | 'social' | 'other'; count: number }>();
    for (const req of requests) {
      const domain = getDomain(req.url) ?? 'unknown';
      let type: 'analytics' | 'advertising' | 'social' | 'other' = 'other';
      const pattern = TRACKER_PATTERNS.find((entry) => req.url.includes(entry.keyword));
      if (pattern) type = pattern.type;
      if (type === 'other') continue;
      const item = counter.get(domain) ?? { domain, type, count: 0 };
      item.count += 1;
      counter.set(domain, item);
    }
    return [...counter.values()];
  }

  private thirdPartyCount(pageUrl: string, requests: Array<{ url: string }>): number {
    const pageDomain = getDomain(pageUrl);
    return requests.filter((req) => getDomain(req.url) !== pageDomain).length;
  }

  calculatePrivacyScore(input: { https: boolean; trackers: Array<unknown>; thirdPartyRequests: number; cookies: number; fingerprintingDetected: boolean }): number {
    let score = 0;
    if (input.https) score += 20;
    if (input.trackers.length === 0) score += 30;
    if (input.cookies <= 5) score += 20;
    if (!input.fingerprintingDetected) score += 30;
    if (input.thirdPartyRequests > 25) score -= 10;
    return Math.max(0, Math.min(100, score));
  }
}
