export const APP_NAME = 'PrivacyBrowser';
export const KEYTAR_SERVICE = 'PrivacyBrowser';
export const KEYTAR_MASTER_KEY_ACCOUNT = 'MasterKey';
export const KEYTAR_PASSWORD_HASH_ACCOUNT = 'PasswordHash';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_STRONG_SCORE = 3;

export const KDF_ITERATIONS = 600_000;
export const KDF_KEY_LENGTH = 32;
export const KDF_SALT_LENGTH = 32;

export const DEFAULT_AUTO_LOCK_MINUTES = 15;
export const AUTH_MAX_ATTEMPTS = 5;
export const AUTH_LOCKOUT_MS = 30_000;

export const DATABASE_FILE_NAME = 'user.db';
export const EXPORT_VERSION = 1;

export const FILTER_LIST_URLS = {
  easylist: 'https://easylist.to/easylist/easylist.txt',
  easyprivacy: 'https://easylist.to/easylist/easyprivacy.txt',
  fanboy: 'https://easylist.to/easylist/fanboy-annoyance.txt'
};

export const DOH_PROVIDERS = {
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  google: 'https://dns.google/dns-query',
  quad9: 'https://dns.quad9.net/dns-query',
  adguard: 'https://dns.adguard.com/dns-query'
} as const;

export const DEFAULT_PRIVACY_SETTINGS = {
  adBlockerEnabled: true,
  httpsOnlyMode: true,
  blockThirdPartyCookies: true,
  dnsOverHttpsEnabled: true,
  doNotTrackEnabled: true,
  webRtcLeakProtection: true,
  fingerprintProtection: true
};
