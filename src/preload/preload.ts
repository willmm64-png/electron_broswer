import { contextBridge, ipcRenderer } from 'electron';
import type { AuthState, Bookmark, BrowserAPI, GeneratorOptions, HistoryEntry, NavigationState, PasswordStrength, PrivacyReport, PrivacySettings, PrivacyStats, SecuritySettings, TabState, VaultEntry } from '@/shared/types';

const api: BrowserAPI = {
  navigateTo: async (url: string) => ipcRenderer.invoke('browser:navigate', url),
  goBack: async () => ipcRenderer.invoke('browser:go-back'),
  goForward: async () => ipcRenderer.invoke('browser:go-forward'),
  reload: async () => ipcRenderer.invoke('browser:reload'),
  newTab: async (url?: string) => ipcRenderer.invoke('tabs:new', url),
  closeTab: async (tabId: string) => ipcRenderer.invoke('tabs:close', tabId),
  switchTab: async (tabId: string) => ipcRenderer.invoke('tabs:switch', tabId),
  getTabs: async () => ipcRenderer.invoke('tabs:get'),
  onNavigationUpdate: (callback: (state: NavigationState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: NavigationState) => callback(state);
    ipcRenderer.on('browser:navigation-update', listener);
    return () => ipcRenderer.off('browser:navigation-update', listener);
  },

  authGetState: async (): Promise<AuthState> => ipcRenderer.invoke('auth:getState'),
  authSetup: async (password: string, enableBiometric: boolean): Promise<void> => ipcRenderer.invoke('auth:setup', password, enableBiometric),
  authLogin: async (password: string): Promise<boolean> => ipcRenderer.invoke('auth:login', password),
  authLoginBiometric: async (): Promise<boolean> => ipcRenderer.invoke('auth:loginBiometric'),
  authLogout: async (): Promise<void> => ipcRenderer.invoke('auth:logout'),
  authValidatePasswordStrength: async (password: string): Promise<PasswordStrength> => ipcRenderer.invoke('auth:validateStrength', password),
  authChangePassword: async (oldPassword: string, newPassword: string): Promise<void> => ipcRenderer.invoke('password:change', oldPassword, newPassword),
  onAuthStateChange: (callback: (authenticated: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, authenticated: boolean) => callback(authenticated);
    ipcRenderer.on('auth:state-changed', listener);
    return () => ipcRenderer.off('auth:state-changed', listener);
  },
  onSessionLocked: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('session:locked', listener);
    return () => ipcRenderer.off('session:locked', listener);
  },
  onSessionUnlocked: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('session:unlocked', listener);
    return () => ipcRenderer.off('session:unlocked', listener);
  },

  sessionLock: async (): Promise<void> => ipcRenderer.invoke('session:lock'),
  sessionSetAutoLock: async (minutes: number): Promise<void> => ipcRenderer.invoke('session:setAutoLock', minutes),
  sessionTouch: async (): Promise<void> => ipcRenderer.invoke('session:touch'),
  settingsGetSecurity: async (): Promise<SecuritySettings> => ipcRenderer.invoke('settings:getSecurity'),
  biometricEnable: async (): Promise<boolean> => ipcRenderer.invoke('biometric:enable'),
  biometricDisable: async (): Promise<void> => ipcRenderer.invoke('biometric:disable'),

  bookmarksSave: async (bookmark: Bookmark): Promise<void> => ipcRenderer.invoke('bookmarks:save', bookmark),
  bookmarksGetAll: async (): Promise<Bookmark[]> => ipcRenderer.invoke('bookmarks:getAll'),
  bookmarksDelete: async (id: string): Promise<void> => ipcRenderer.invoke('bookmarks:delete', id),
  historySave: async (entry: HistoryEntry): Promise<void> => ipcRenderer.invoke('history:save', entry),
  historyGetAll: async (limit?: number): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:getAll', limit),
  historyClear: async (): Promise<void> => ipcRenderer.invoke('history:clear'),

  privacyGetStats: async (): Promise<PrivacyStats> => ipcRenderer.invoke('privacy:getStats'),
  privacyGetReport: async (url: string): Promise<PrivacyReport> => ipcRenderer.invoke('privacy:getReport', url),
  privacySetSetting: async (key: keyof PrivacySettings, value: boolean): Promise<PrivacySettings> => ipcRenderer.invoke('privacy:setSetting', key, value),
  privacyGetSettings: async (): Promise<PrivacySettings> => ipcRenderer.invoke('privacy:getSettings'),
  adblockerSetEnabled: async (enabled: boolean): Promise<void> => ipcRenderer.invoke('adblocker:setEnabled', enabled),
  adblockerUpdateFilters: async (): Promise<void> => ipcRenderer.invoke('adblocker:updateFilters'),
  adblockerAddToWhitelist: async (domain: string): Promise<void> => ipcRenderer.invoke('adblocker:addToWhitelist', domain),

  cookiesGetAll: async (domain?: string) => ipcRenderer.invoke('cookies:getAll', domain),
  cookiesDelete: async (domain: string, name: string) => ipcRenderer.invoke('cookies:delete', domain, name),
  cookiesDeleteAll: async () => ipcRenderer.invoke('cookies:deleteAll'),
  cookiesBlockThirdParty: async (enabled: boolean) => ipcRenderer.invoke('cookies:blockThirdParty', enabled),

  vaultSave: async (entry: VaultEntry): Promise<void> => ipcRenderer.invoke('vault:save', entry),
  vaultGet: async (domain: string): Promise<VaultEntry | null> => ipcRenderer.invoke('vault:get', domain),
  vaultGetAll: async (): Promise<VaultEntry[]> => ipcRenderer.invoke('vault:getAll'),
  vaultDelete: async (id: string): Promise<void> => ipcRenderer.invoke('vault:delete', id),
  vaultSearch: async (query: string): Promise<VaultEntry[]> => ipcRenderer.invoke('vault:search', query),
  vaultGeneratePassword: async (options: GeneratorOptions): Promise<string> => ipcRenderer.invoke('vault:generatePassword', options),
  vaultCheckBreach: async (password: string): Promise<boolean> => ipcRenderer.invoke('vault:checkBreach', password)
};

contextBridge.exposeInMainWorld('browserAPI', api);

ipcRenderer.on('browser:tabs-update', (_event, tabs: TabState[]) => {
  window.dispatchEvent(new CustomEvent('tabs:update', { detail: tabs }));
});
