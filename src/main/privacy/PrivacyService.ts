import path from 'node:path';
import { app, BrowserWindow, session } from 'electron';
import { getDomain } from 'tldts';
import { DEFAULT_PRIVACY_SETTINGS } from '@/shared/constants';
import type { BlockedItem, PrivacyReport, PrivacySettings, PrivacyStats, RequestType } from '@/shared/types';
import { AdBlocker } from './AdBlocker';
import { CookieManager } from './CookieManager';
import { DNSOverHTTPS } from './DNSOverHTTPS';
import { FilterEngine } from './FilterEngine';
import { HTTPSEnforcer } from './HTTPSEnforcer';
import { PrivacyAnalyzer } from './PrivacyAnalyzer';

const mapResourceType = (type: string): RequestType => {
  if (type === 'script') return 'script';
  if (type === 'image') return 'image';
  if (type === 'stylesheet') return 'stylesheet';
  if (type === 'xhr' || type === 'xmlhttprequest') return 'xhr';
  if (type === 'subFrame') return 'subdocument';
  return 'other';
};

export class PrivacyService {
  private filterEngine = new FilterEngine();
  private adBlocker = new AdBlocker(this.filterEngine, path.join(app.getPath('userData'), 'filter-lists'));
  private httpsEnforcer = new HTTPSEnforcer();
  private cookieManager = new CookieManager();
  private doh = new DNSOverHTTPS();
  private analyzer = new PrivacyAnalyzer();
  private settings: PrivacySettings = { ...DEFAULT_PRIVACY_SETTINGS };
  private todayStats = { totalBlocked: 0, adsBlocked: 0, trackersBlocked: 0, byDomain: {} as Record<string, number> };
  private allTimeStats = { totalBlocked: 0, adsBlocked: 0, trackersBlocked: 0, byDomain: {} as Record<string, number> };
  private recentBlocked: BlockedItem[] = [];
  private requestHistory = new Map<string, Array<{ url: string; type: string }>>();

  async initialize(): Promise<void> {
    await this.adBlocker.initialize();
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const type = mapResourceType(details.resourceType);
      const blockResult = this.adBlocker.shouldBlock(details.url, details.referrer ?? '', type);

      if (this.settings.httpsOnlyMode && this.httpsEnforcer.shouldUpgrade(details.url)) {
        callback({ redirectURL: this.httpsEnforcer.upgradeToHTTPS(details.url) });
        return;
      }

      if (blockResult.blocked) {
        this.recordBlocked({ url: details.url, type, reason: blockResult.reason ?? 'Blocked' });
        callback({ cancel: true });
        return;
      }

      const key = details.webContentsId ? String(details.webContentsId) : 'global';
      const list = this.requestHistory.get(key) ?? [];
      list.push({ url: details.url, type });
      this.requestHistory.set(key, list.slice(-500));

      callback({});
    });

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      if (this.settings.doNotTrackEnabled) {
        details.requestHeaders.DNT = '1';
        details.requestHeaders['Sec-GPC'] = '1';
      }
      callback({ requestHeaders: details.requestHeaders });
    });
  }

  private recordBlocked(item: { url: string; type: RequestType; reason: string }): void {
    const domain = getDomain(item.url) ?? 'unknown';
    const entry: BlockedItem = { id: crypto.randomUUID(), url: item.url, domain, type: item.type, reason: item.reason, at: new Date().toISOString() };
    this.recentBlocked = [entry, ...this.recentBlocked].slice(0, 200);

    const update = (stats: { totalBlocked: number; adsBlocked: number; trackersBlocked: number; byDomain: Record<string, number> }) => {
      stats.totalBlocked += 1;
      if (/tracker|analytics|pixel/i.test(item.reason)) stats.trackersBlocked += 1;
      else stats.adsBlocked += 1;
      stats.byDomain[domain] = (stats.byDomain[domain] ?? 0) + 1;
    };

    update(this.todayStats);
    update(this.allTimeStats);

    BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('privacy:blocked', entry));
  }

  getStats(): PrivacyStats {
    return { today: { ...this.todayStats }, allTime: { ...this.allTimeStats }, recentBlocked: [...this.recentBlocked] };
  }

  async getReport(url: string, webContentsId?: number): Promise<PrivacyReport> {
    const key = webContentsId ? String(webContentsId) : 'global';
    const requests = this.requestHistory.get(key) ?? [];
    const cookies = (await this.cookieManager.getCookies(getDomain(url) ?? undefined)).length;
    return this.analyzer.analyzePage(url, requests, cookies);
  }

  setSetting(key: keyof PrivacySettings, value: boolean): PrivacySettings {
    this.settings = { ...this.settings, [key]: value };
    if (key === 'adBlockerEnabled') this.adBlocker.setEnabled(value);
    if (key === 'httpsOnlyMode') this.httpsEnforcer.setHTTPSOnlyMode(value);
    if (key === 'blockThirdPartyCookies') this.cookieManager.blockThirdPartyCookies(value);
    if (key === 'dnsOverHttpsEnabled') this.doh.setEnabled(value);
    return this.settings;
  }

  getSettings(): PrivacySettings { return { ...this.settings }; }

  getAdBlocker(): AdBlocker { return this.adBlocker; }
  getCookieManager(): CookieManager { return this.cookieManager; }
}

export const privacyService = new PrivacyService();
