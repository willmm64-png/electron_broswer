import { session } from 'electron';

export class CookieManager {
  private blockThirdParty = true;

  async getCookies(domain?: string): Promise<Array<{ domain: string; name: string; value: string; path: string; expires: number; size: number; httpOnly: boolean; secure: boolean; sameSite: string }>> {
    const cookies = await session.defaultSession.cookies.get(domain ? { domain } : {});
    return cookies.map((cookie) => ({
      domain: cookie.domain,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      expires: cookie.expirationDate ?? -1,
      size: cookie.value.length,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite
    }));
  }

  async deleteCookie(domain: string, name: string): Promise<void> {
    const cookies = await session.defaultSession.cookies.get({ domain, name });
    for (const cookie of cookies) {
      const protocol = cookie.secure ? 'https' : 'http';
      await session.defaultSession.cookies.remove(`${protocol}://${cookie.domain.replace(/^\./, '')}${cookie.path}`, cookie.name);
    }
  }

  async deleteAllCookies(): Promise<void> { await session.defaultSession.cookies.flushStore(); await session.defaultSession.clearStorageData({ storages: ['cookies'] }); }
  blockThirdPartyCookies(enabled: boolean): void { this.blockThirdParty = enabled; }
  isBlockingThirdPartyCookies(): boolean { return this.blockThirdParty; }
}
