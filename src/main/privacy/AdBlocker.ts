import fs from 'node:fs';
import path from 'node:path';
import type { RequestType, BlockStats } from '@/shared/types';
import { FILTER_LIST_URLS } from '@/shared/constants';
import { FilterEngine } from './FilterEngine';

interface BlockResult {
  blocked: boolean;
  reason?: string;
  filter?: string;
}

export class AdBlocker {
  private enabled = true;
  private whitelist = new Set<string>();
  private stats: BlockStats = { totalBlocked: 0, adsBlocked: 0, trackersBlocked: 0, byDomain: {} };

  constructor(private readonly filterEngine: FilterEngine, private readonly filterDir: string) {}

  async initialize(): Promise<void> {
    fs.mkdirSync(this.filterDir, { recursive: true });
    await this.loadLocalOrDefault();
    setInterval(() => this.updateFilters().catch(console.error), 24 * 60 * 60 * 1000).unref();
  }

  private async loadLocalOrDefault(): Promise<void> {
    const files = ['easylist.txt', 'easyprivacy.txt', 'fanboy-annoyance.txt'];
    let loaded = false;
    for (const file of files) {
      const full = path.join(this.filterDir, file);
      if (fs.existsSync(full)) {
        this.filterEngine.loadFilters(fs.readFileSync(full, 'utf8'));
        loaded = true;
      }
    }
    if (!loaded) {
      this.filterEngine.loadFilters('||doubleclick.net^\n||google-analytics.com^\n||facebook.com/tr^\n||adservice.google.com^\n@@||example.com^');
      for (const file of files) {
        fs.writeFileSync(path.join(this.filterDir, file), '! default fallback list\n');
      }
    }
  }

  async updateFilters(): Promise<void> {
    const pairs = [
      ['easylist.txt', FILTER_LIST_URLS.easylist],
      ['easyprivacy.txt', FILTER_LIST_URLS.easyprivacy],
      ['fanboy-annoyance.txt', FILTER_LIST_URLS.fanboy]
    ] as const;
    this.filterEngine.clearFilters();

    for (const [name, url] of pairs) {
      try {
        const response = await fetch(url);
        const content = await response.text();
        fs.writeFileSync(path.join(this.filterDir, name), content);
        this.filterEngine.loadFilters(content);
      } catch {
        const local = path.join(this.filterDir, name);
        if (fs.existsSync(local)) {
          this.filterEngine.loadFilters(fs.readFileSync(local, 'utf8'));
        }
      }
    }
  }

  shouldBlock(url: string, sourceUrl: string, type: RequestType): BlockResult {
    if (!this.enabled) {
      return { blocked: false };
    }

    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      return { blocked: false };
    }

    if ([...this.whitelist].some((domain) => host.endsWith(domain))) {
      return { blocked: false };
    }

    const match = this.filterEngine.match(url, { type, domain: host, sourceUrl });
    if (!match || match.type === 'allow') {
      return { blocked: false };
    }

    this.stats.totalBlocked += 1;
    this.stats.byDomain[host] = (this.stats.byDomain[host] ?? 0) + 1;
    if (/(tracker|analytics|pixel)/i.test(match.filter)) {
      this.stats.trackersBlocked += 1;
    } else {
      this.stats.adsBlocked += 1;
    }

    return { blocked: true, reason: 'Matched filter', filter: match.filter };
  }

  addToWhitelist(domain: string): void { this.whitelist.add(domain); }
  removeFromWhitelist(domain: string): void { this.whitelist.delete(domain); }
  getStats(): BlockStats { return { ...this.stats, byDomain: { ...this.stats.byDomain } }; }
  resetStats(): void { this.stats = { totalBlocked: 0, adsBlocked: 0, trackersBlocked: 0, byDomain: {} }; }
  isEnabled(): boolean { return this.enabled; }
  setEnabled(enabled: boolean): void { this.enabled = enabled; }
}
