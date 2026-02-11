import type { RequestType } from '@/shared/types';

interface MatchOptions {
  type: RequestType;
  domain: string;
  sourceUrl: string;
}

interface FilterMatch {
  filter: string;
  type: 'block' | 'allow';
}

export class FilterEngine {
  private blockRules = new Set<string>();
  private allowRules = new Set<string>();
  private cosmeticRules = new Map<string, string[]>();
  private regexRules: { pattern: RegExp; raw: string; type: 'block' | 'allow' }[] = [];

  loadFilters(filterContent: string): void {
    filterContent.split('\n').forEach((line) => this.addFilter(line.trim()));
  }

  addFilter(filter: string): void {
    if (!filter || filter.startsWith('!') || filter.startsWith('[')) {
      return;
    }

    if (filter.includes('##')) {
      const [domain, selector] = filter.split('##');
      const existing = this.cosmeticRules.get(domain || '*') ?? [];
      existing.push(selector);
      this.cosmeticRules.set(domain || '*', existing);
      return;
    }

    if (filter.startsWith('/') && filter.endsWith('/')) {
      try {
        this.regexRules.push({ pattern: new RegExp(filter.slice(1, -1), 'i'), raw: filter, type: 'block' });
      } catch {
        return;
      }
      return;
    }

    if (filter.startsWith('@@')) {
      const value = filter.replace(/^@@\|\|?/, '').replace(/\^.*$/, '');
      this.allowRules.add(value);
      return;
    }

    const value = filter.replace(/^\|\|?/, '').replace(/\^.*$/, '');
    this.blockRules.add(value);
  }

  removeFilter(filter: string): void {
    this.blockRules.delete(filter);
    this.allowRules.delete(filter);
  }

  match(url: string, options: MatchOptions): FilterMatch | null {
    const host = new URL(url).hostname;

    for (const allow of this.allowRules) {
      if (allow && host.includes(allow)) {
        return { filter: allow, type: 'allow' };
      }
    }

    for (const rule of this.blockRules) {
      if (rule && host.includes(rule)) {
        return { filter: rule, type: 'block' };
      }
    }

    for (const regex of this.regexRules) {
      if (regex.pattern.test(url)) {
        return { filter: regex.raw, type: regex.type };
      }
    }

    const sourceHost = options.sourceUrl ? new URL(options.sourceUrl).hostname : '';
    if (sourceHost && sourceHost !== host && ['script', 'xhr', 'subdocument'].includes(options.type)) {
      const heuristicTracker = /(analytics|track|pixel|beacon|doubleclick|ads|facebook|google-analytics)/i.test(host);
      if (heuristicTracker) {
        return { filter: 'heuristic-tracker', type: 'block' };
      }
    }

    return null;
  }

  getCosmeticFilters(domain: string): string[] {
    return [...(this.cosmeticRules.get('*') ?? []), ...(this.cosmeticRules.get(domain) ?? [])];
  }

  getFilterCount(): number {
    return this.blockRules.size + this.allowRules.size + this.regexRules.length;
  }

  clearFilters(): void {
    this.blockRules.clear();
    this.allowRules.clear();
    this.cosmeticRules.clear();
    this.regexRules = [];
  }
}
