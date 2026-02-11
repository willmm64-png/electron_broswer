import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { BiometricAuth } from './BiometricAuth';
import { PasswordManager } from './PasswordManager';
import { SessionManager } from './SessionManager';
import { KeyDerivation } from '@/main/encryption/KeyDerivation';
import { EncryptionEngine } from '@/main/encryption/EncryptionEngine';
import { BookmarksStore } from '@/main/storage/BookmarksStore';
import { Database } from '@/main/storage/Database';
import { HistoryStore } from '@/main/storage/HistoryStore';
import { SecureStorage } from '@/main/storage/SecureStorage';
import { SettingsStore } from '@/main/storage/SettingsStore';
import { PasswordVault } from '@/main/vault/PasswordVault';
import { PasswordGenerator } from '@/main/vault/PasswordGenerator';
import type { AuthState, Bookmark, GeneratorOptions, HistoryEntry, PasswordStrength, SecuritySettings, VaultEntry } from '@/shared/types';

export class AuthManager {
  private passwordManager = new PasswordManager();
  private biometricAuth = new BiometricAuth();
  private sessionManager = new SessionManager();
  private events = new EventEmitter();

  private db: Database | null = null;
  private encryptionEngine: EncryptionEngine | null = null;
  private secureStorage: SecureStorage | null = null;
  private bookmarksStore: BookmarksStore | null = null;
  private historyStore: HistoryStore | null = null;
  private settingsStore: SettingsStore | null = null;
  private passwordVault: PasswordVault | null = null;
  private authenticated = false;
  private activeMasterKey: Buffer | null = null;

  constructor() {
    this.sessionManager.onSessionLocked(() => {
      this.authenticated = false;
      this.encryptionEngine?.destroy();
      this.encryptionEngine = null;
      this.activeMasterKey?.fill(0);
      this.activeMasterKey = null;
      this.events.emit('session:locked');
      this.events.emit('auth:state', false);
    });
    this.sessionManager.onSessionUnlocked(() => {
      this.events.emit('session:unlocked');
      this.events.emit('auth:state', true);
    });
  }

  async initialize(): Promise<void> {
    await this.passwordManager.hasMasterPassword();
    await this.biometricAuth.isBiometricEnrolled();
  }

  async isFirstRun(): Promise<boolean> {
    return !(await this.passwordManager.hasMasterPassword());
  }

  async setupMasterPassword(password: string, enableBiometric: boolean): Promise<void> {
    await this.passwordManager.createMasterPassword(password);
    const salt = KeyDerivation.generateSalt();
    const masterKey = await KeyDerivation.deriveKey(password, salt);

    await this.openStores(masterKey);
    await this.db?.execute(
      `INSERT OR REPLACE INTO auth (id, password_hash, salt, created_at, updated_at)
       VALUES (1, ?, ?, COALESCE((SELECT created_at FROM auth WHERE id = 1), ?), ?)`,
      ['keytar-managed', salt.toString('base64'), Date.now(), Date.now()]
    );

    if (enableBiometric) {
      await this.biometricAuth.enrollBiometric(masterKey);
      await this.settingsStore?.setBiometricEnabled(true);
    }

    this.authenticated = true;
    this.sessionManager.startSession();
    this.events.emit('auth:state', true);
    salt.fill(0);
    masterKey.fill(0);
  }

  async login(password: string): Promise<boolean> {
    const isValid = await this.passwordManager.verifyMasterPassword(password);
    if (!isValid) {
      return false;
    }

    const authRows = await this.ensureAuthRow();
    const salt = Buffer.from(authRows.salt, 'base64');
    const masterKey = await KeyDerivation.deriveKey(password, salt);

    await this.openStores(masterKey);
    this.authenticated = true;
    this.sessionManager.startSession();
    this.events.emit('auth:state', true);

    salt.fill(0);
    masterKey.fill(0);
    return true;
  }

  async loginWithBiometric(): Promise<boolean> {
    const authenticated = await this.biometricAuth.authenticate();
    if (!authenticated) {
      return false;
    }

    const storedMasterKey = await this.biometricAuth.getStoredMasterKey();
    if (!storedMasterKey) {
      return false;
    }

    await this.openStores(storedMasterKey);
    this.authenticated = true;
    this.sessionManager.startSession();
    this.events.emit('auth:state', true);

    storedMasterKey.fill(0);
    return true;
  }

  async logout(): Promise<void> {
    this.sessionManager.lockSession();
  }

  isAuthenticated(): boolean {
    return this.authenticated && this.sessionManager.isSessionActive();
  }

  lockSession(): void {
    this.sessionManager.lockSession();
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const authRows = await this.ensureAuthRow();
    const oldSalt = Buffer.from(authRows.salt, 'base64');

    await this.passwordManager.changeMasterPassword(oldPassword, newPassword);

    const newSalt = KeyDerivation.generateSalt();
    const newMasterKey = await KeyDerivation.deriveKey(newPassword, newSalt);
    await this.openStores(newMasterKey);

    await this.db?.execute('UPDATE auth SET salt = ?, updated_at = ? WHERE id = 1', [newSalt.toString('base64'), Date.now()]);
    await this.biometricAuth.removeBiometric();
    await this.settingsStore?.setBiometricEnabled(false);

    oldSalt.fill(0);
    newSalt.fill(0);
    newMasterKey.fill(0);
  }

  async enableBiometric(): Promise<boolean> {
    if (!this.encryptionEngine) {
      return false;
    }
    const available = await this.biometricAuth.isAvailable();
    if (!available) {
      return false;
    }
    if (!this.activeMasterKey) {
      return false;
    }
    await this.biometricAuth.enrollBiometric(this.activeMasterKey);
    await this.settingsStore?.setBiometricEnabled(true);
    return true;
  }

  async disableBiometric(): Promise<void> {
    await this.biometricAuth.removeBiometric();
    await this.settingsStore?.setBiometricEnabled(false);
  }

  onAuthStateChange(callback: (authenticated: boolean) => void): void {
    this.events.on('auth:state', callback);
  }

  onSessionLocked(callback: () => void): void {
    this.events.on('session:locked', callback);
  }

  onSessionUnlocked(callback: () => void): void {
    this.events.on('session:unlocked', callback);
  }

  validatePasswordStrength(password: string): PasswordStrength {
    return this.passwordManager.validatePasswordStrength(password);
  }

  async getAuthState(): Promise<AuthState> {
    const isFirstRun = await this.isFirstRun();
    const biometricAvailable = await this.biometricAuth.isAvailable();
    const biometricEnrolled = await this.biometricAuth.isBiometricEnrolled();
    return {
      isFirstRun,
      authenticated: this.isAuthenticated(),
      biometricAvailable,
      biometricEnrolled,
      sessionLocked: !this.sessionManager.isSessionActive()
    };
  }

  setAutoLockTimeout(minutes: number): void {
    this.sessionManager.setAutoLockTimeout(minutes);
    this.settingsStore?.setAutoLockMinutes(minutes).catch(console.error);
  }

  async getSecuritySettings(): Promise<SecuritySettings> {
    const autoLockMinutes = (await this.settingsStore?.getAutoLockMinutes()) ?? 15;
    const biometricEnabled = (await this.settingsStore?.isBiometricEnabled()) ?? false;
    return { autoLockMinutes, biometricEnabled };
  }

  resetInactivity(): void {
    this.sessionManager.resetInactivityTimer();
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    this.requireAuth();
    await this.bookmarksStore?.save(bookmark);
  }

  async getBookmarks(): Promise<Bookmark[]> {
    this.requireAuth();
    return this.bookmarksStore?.getAll() ?? [];
  }

  async deleteBookmark(id: string): Promise<void> {
    this.requireAuth();
    await this.bookmarksStore?.delete(id);
  }

  async saveHistory(entry: HistoryEntry): Promise<void> {
    this.requireAuth();
    await this.historyStore?.save(entry);
  }

  async getHistory(limit?: number): Promise<HistoryEntry[]> {
    this.requireAuth();
    return this.historyStore?.getAll(limit) ?? [];
  }

  async clearHistory(): Promise<void> {
    this.requireAuth();
    await this.historyStore?.clear();
  }

  private async openStores(masterKey: Buffer): Promise<void> {
    this.encryptionEngine?.destroy();
    this.activeMasterKey?.fill(0);
    this.activeMasterKey = Buffer.from(masterKey);
    this.encryptionEngine = new EncryptionEngine(masterKey);

    const dbKey = createHash('sha256').update(masterKey).digest();
    this.db = new Database(undefined, dbKey);
    await this.db.initialize();

    this.secureStorage = new SecureStorage(this.db, this.encryptionEngine);
    this.bookmarksStore = new BookmarksStore(this.secureStorage);
    this.historyStore = new HistoryStore(this.secureStorage);
    this.settingsStore = new SettingsStore(this.secureStorage);
    this.passwordVault = new PasswordVault(this.encryptionEngine, this.db);
    await this.passwordVault.initialize();

    const timeout = await this.settingsStore.getAutoLockMinutes();
    this.sessionManager.setAutoLockTimeout(timeout);
  }


  async vaultSave(entry: VaultEntry): Promise<void> {
    this.requireAuth();
    await this.passwordVault?.savePassword(entry);
  }

  async vaultGet(domain: string): Promise<VaultEntry | null> {
    this.requireAuth();
    return this.passwordVault?.getPassword(domain) ?? null;
  }

  async vaultGetAll(): Promise<VaultEntry[]> {
    this.requireAuth();
    return this.passwordVault?.getAllPasswords() ?? [];
  }

  async vaultDelete(id: string): Promise<void> {
    this.requireAuth();
    await this.passwordVault?.deletePassword(id);
  }

  async vaultSearch(query: string): Promise<VaultEntry[]> {
    this.requireAuth();
    return this.passwordVault?.searchPasswords(query) ?? [];
  }

  async vaultGeneratePassword(options: GeneratorOptions): Promise<string> {
    this.requireAuth();
    return PasswordGenerator.generate(options);
  }

  async vaultCheckBreach(password: string): Promise<boolean> {
    this.requireAuth();
    return (await this.passwordVault?.checkForBreaches(password)) ?? false;
  }

  private requireAuth(): void {
    if (!this.isAuthenticated()) {
      throw new Error('Session is locked');
    }
  }

  private async ensureAuthRow(): Promise<{ salt: string }> {
    if (!this.db) {
      this.db = new Database(undefined, Buffer.alloc(32, 0));
      await this.db.initialize();
    }

    let rows = await this.db.query<{ salt: string }>('SELECT salt FROM auth WHERE id = 1 LIMIT 1');
    if (rows.length === 0) {
      const fallbackSalt = KeyDerivation.generateSalt();
      await this.db.execute(
        'INSERT INTO auth (id, password_hash, salt, created_at, updated_at) VALUES (1, ?, ?, ?, ?)',
        ['keytar-managed', fallbackSalt.toString('base64'), Date.now(), Date.now()]
      );
      rows = [{ salt: fallbackSalt.toString('base64') }];
      fallbackSalt.fill(0);
    }

    return rows[0];
  }

}

export const authManager = new AuthManager();
