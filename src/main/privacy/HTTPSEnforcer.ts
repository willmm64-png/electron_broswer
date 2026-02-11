export class HTTPSEnforcer {
  private httpsOnlyMode = true;
  private exceptions = new Set<string>();
  private mixedContentBlocked = true;

  shouldUpgrade(url: string): boolean {
    if (!this.httpsOnlyMode) return false;
    if (!url.startsWith('http://')) return false;
    try {
      const host = new URL(url).hostname;
      return ![...this.exceptions].some((domain) => host.endsWith(domain));
    } catch {
      return false;
    }
  }

  upgradeToHTTPS(url: string): string {
    return url.replace(/^http:\/\//i, 'https://');
  }

  isHTTPSOnlyMode(): boolean { return this.httpsOnlyMode; }
  setHTTPSOnlyMode(enabled: boolean): void { this.httpsOnlyMode = enabled; }
  addException(domain: string): void { this.exceptions.add(domain); }
  removeException(domain: string): void { this.exceptions.delete(domain); }
  blockMixedContent(enabled: boolean): void { this.mixedContentBlocked = enabled; }
  isMixedContentBlocked(): boolean { return this.mixedContentBlocked; }
}
