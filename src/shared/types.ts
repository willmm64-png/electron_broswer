export interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

export interface NavigationState {
  tabId: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  favicon?: string;
  isSecure: boolean;
}

export interface TabState {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isActive: boolean;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitedAt: string;
}

export interface PasswordStrength {
  score: number;
  feedback: string[];
  isStrong: boolean;
}

export interface AuthState {
  isFirstRun: boolean;
  authenticated: boolean;
  biometricAvailable: boolean;
  biometricEnrolled: boolean;
  sessionLocked: boolean;
}

export interface SecuritySettings {
  autoLockMinutes: number;
  biometricEnabled: boolean;
}

export type RequestType = 'script' | 'image' | 'stylesheet' | 'xhr' | 'subdocument' | 'other';

export interface BlockedItem {
  id: string;
  url: string;
  domain: string;
  type: RequestType;
  reason: string;
  at: string;
}

export interface BlockStats {
  totalBlocked: number;
  adsBlocked: number;
  trackersBlocked: number;
  byDomain: Record<string, number>;
}

export interface PrivacySettings {
  adBlockerEnabled: boolean;
  httpsOnlyMode: boolean;
  blockThirdPartyCookies: boolean;
  dnsOverHttpsEnabled: boolean;
  doNotTrackEnabled: boolean;
  webRtcLeakProtection: boolean;
  fingerprintProtection: boolean;
}

export interface PrivacyReport {
  url: string;
  https: boolean;
  trackers: { domain: string; type: 'analytics' | 'advertising' | 'social' | 'other'; count: number }[];
  thirdPartyRequests: number;
  cookies: number;
  fingerprintingDetected: boolean;
  privacyScore: number;
  recommendations: string[];
}

export interface PrivacyStats {
  today: BlockStats;
  allTime: BlockStats;
  recentBlocked: BlockedItem[];
}

export interface VaultEntry {
  id: string;
  url: string;
  domain: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface BrowserAPI {
  navigateTo: (url: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  reload: () => Promise<void>;
  newTab: (url?: string) => Promise<TabState[]>;
  closeTab: (tabId: string) => Promise<TabState[]>;
  switchTab: (tabId: string) => Promise<TabState[]>;
  getTabs: () => Promise<TabState[]>;
  onNavigationUpdate: (callback: (state: NavigationState) => void) => () => void;

  authGetState: () => Promise<AuthState>;
  authSetup: (password: string, enableBiometric: boolean) => Promise<void>;
  authLogin: (password: string) => Promise<boolean>;
  authLoginBiometric: () => Promise<boolean>;
  authLogout: () => Promise<void>;
  authValidatePasswordStrength: (password: string) => Promise<PasswordStrength>;
  authChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  onAuthStateChange: (callback: (authenticated: boolean) => void) => () => void;
  onSessionLocked: (callback: () => void) => () => void;
  onSessionUnlocked: (callback: () => void) => () => void;

  sessionLock: () => Promise<void>;
  sessionSetAutoLock: (minutes: number) => Promise<void>;
  sessionTouch: () => Promise<void>;
  settingsGetSecurity: () => Promise<SecuritySettings>;
  biometricEnable: () => Promise<boolean>;
  biometricDisable: () => Promise<void>;

  bookmarksSave: (bookmark: Bookmark) => Promise<void>;
  bookmarksGetAll: () => Promise<Bookmark[]>;
  bookmarksDelete: (id: string) => Promise<void>;
  historySave: (entry: HistoryEntry) => Promise<void>;
  historyGetAll: (limit?: number) => Promise<HistoryEntry[]>;
  historyClear: () => Promise<void>;

  privacyGetStats: () => Promise<PrivacyStats>;
  privacyGetReport: (url: string) => Promise<PrivacyReport>;
  privacySetSetting: (key: keyof PrivacySettings, value: boolean) => Promise<PrivacySettings>;
  privacyGetSettings: () => Promise<PrivacySettings>;
  adblockerSetEnabled: (enabled: boolean) => Promise<void>;
  adblockerUpdateFilters: () => Promise<void>;
  adblockerAddToWhitelist: (domain: string) => Promise<void>;

  cookiesGetAll: (domain?: string) => Promise<Array<{ domain: string; name: string; value: string; path: string; expires: number; size: number; httpOnly: boolean; secure: boolean; sameSite: string }>>;
  cookiesDelete: (domain: string, name: string) => Promise<void>;
  cookiesDeleteAll: () => Promise<void>;
  cookiesBlockThirdParty: (enabled: boolean) => Promise<void>;

  vaultSave: (entry: VaultEntry) => Promise<void>;
  vaultGet: (domain: string) => Promise<VaultEntry | null>;
  vaultGetAll: () => Promise<VaultEntry[]>;
  vaultDelete: (id: string) => Promise<void>;
  vaultSearch: (query: string) => Promise<VaultEntry[]>;
  vaultGeneratePassword: (options: GeneratorOptions) => Promise<string>;
  vaultCheckBreach: (password: string) => Promise<boolean>;
}
