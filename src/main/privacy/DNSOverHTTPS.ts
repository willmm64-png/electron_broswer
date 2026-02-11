import doh from 'dns-over-https';
import { DOH_PROVIDERS } from '@/shared/constants';

export class DNSOverHTTPS {
  private enabled = true;
  private provider: keyof typeof DOH_PROVIDERS = 'cloudflare';
  private cache = new Map<string, { ips: string[]; expiresAt: number }>();

  async resolve(domain: string): Promise<string[]> {
    const cached = this.cache.get(domain);
    if (cached && cached.expiresAt > Date.now()) return cached.ips;
    if (!this.enabled) return [];
    try {
      const records = await doh.resolve(domain, 'A', { dns: DOH_PROVIDERS[this.provider], timeout: 2000 });
      const ips = (records?.answers ?? []).map((entry: { data: string }) => entry.data).filter(Boolean);
      this.cache.set(domain, { ips, expiresAt: Date.now() + 5 * 60 * 1000 });
      return ips;
    } catch {
      return [];
    }
  }

  setProvider(provider: keyof typeof DOH_PROVIDERS): void { this.provider = provider; }
  getProvider(): string { return this.provider; }
  isEnabled(): boolean { return this.enabled; }
  setEnabled(enabled: boolean): void { this.enabled = enabled; }
  async testConnection(): Promise<boolean> { return (await this.resolve('example.com')).length > 0; }
}
