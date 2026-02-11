import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { EXPORT_VERSION } from '@/shared/constants';
import type { Bookmark, EncryptedData, HistoryEntry } from '@/shared/types';
import { EncryptionEngine } from '@/main/encryption/EncryptionEngine';
import { Database } from './Database';

interface CacheRecord<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 20_000;

const encode = (payload: EncryptedData) => JSON.stringify(payload);
const decode = (payload: string) => JSON.parse(payload) as EncryptedData;

export class SecureStorage {
  private cache = new Map<string, CacheRecord<unknown>>();

  constructor(
    private readonly db: Database,
    private readonly encryptionEngine: EncryptionEngine
  ) {}

  private getCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  private setCache<T>(key: string, value: T): void {
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO bookmarks (id, url, title, favicon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET url=excluded.url,title=excluded.title,favicon=excluded.favicon,updated_at=excluded.updated_at`,
      [
        bookmark.id,
        encode(this.encryptionEngine.encrypt(bookmark.url)),
        encode(this.encryptionEngine.encrypt(bookmark.title)),
        bookmark.favicon ?? null,
        new Date(bookmark.createdAt).getTime() || now,
        now
      ]
    );
    this.cache.delete('bookmarks');
  }

  async getBookmarks(): Promise<Bookmark[]> {
    const cached = this.getCache<Bookmark[]>('bookmarks');
    if (cached) {
      return cached;
    }
    const rows = await this.db.query<{ id: string; url: string; title: string; favicon: string | null; created_at: number }>(
      'SELECT id, url, title, favicon, created_at FROM bookmarks ORDER BY updated_at DESC'
    );
    const bookmarks = rows.map((row) => ({
      id: row.id,
      url: this.encryptionEngine.decrypt(decode(row.url)),
      title: this.encryptionEngine.decrypt(decode(row.title)),
      favicon: row.favicon ?? undefined,
      createdAt: new Date(row.created_at).toISOString()
    }));
    this.setCache('bookmarks', bookmarks);
    return bookmarks;
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.db.execute('DELETE FROM bookmarks WHERE id = ?', [id]);
    this.cache.delete('bookmarks');
  }

  async saveHistory(entry: HistoryEntry): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO history (id, url, title, favicon, visit_count, last_visit, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
       url=excluded.url,
       title=excluded.title,
       favicon=excluded.favicon,
       visit_count=history.visit_count + 1,
       last_visit=excluded.last_visit`,
      [
        entry.id,
        encode(this.encryptionEngine.encrypt(entry.url)),
        encode(this.encryptionEngine.encrypt(entry.title)),
        entry.favicon ?? null,
        new Date(entry.visitedAt).getTime() || now,
        now
      ]
    );
    this.cache.delete('history');
  }

  async getHistory(limit = 100): Promise<HistoryEntry[]> {
    const cacheKey = `history:${limit}`;
    const cached = this.getCache<HistoryEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }
    const rows = await this.db.query<{ id: string; url: string; title: string; favicon: string | null; last_visit: number }>(
      'SELECT id, url, title, favicon, last_visit FROM history ORDER BY last_visit DESC LIMIT ?',
      [limit]
    );
    const entries = rows.map((row) => ({
      id: row.id,
      url: this.encryptionEngine.decrypt(decode(row.url)),
      title: this.encryptionEngine.decrypt(decode(row.title)),
      favicon: row.favicon ?? undefined,
      visitedAt: new Date(row.last_visit).toISOString()
    }));
    this.setCache(cacheKey, entries);
    return entries;
  }

  async clearHistory(): Promise<void> {
    await this.db.execute('DELETE FROM history');
    [...this.cache.keys()].forEach((key) => {
      if (key.startsWith('history')) {
        this.cache.delete(key);
      }
    });
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    const encrypted = encode(this.encryptionEngine.encrypt(JSON.stringify(value)));
    await this.db.execute(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
      [key, encrypted, Date.now()]
    );
  }

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const rows = await this.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ? LIMIT 1', [key]);
    if (rows.length === 0) {
      return null;
    }
    const raw = this.encryptionEngine.decrypt(decode(rows[0].value));
    return JSON.parse(raw) as T;
  }

  async exportData(password: string): Promise<Buffer> {
    const bookmarks = await this.getBookmarks();
    const history = await this.getHistory(1000);
    const settings = await this.db.query<{ key: string; value: string }>('SELECT key, value FROM settings');

    const payload = {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      bookmarks,
      history,
      settings
    };

    const serialized = Buffer.from(JSON.stringify(payload), 'utf8');
    const passwordKey = createHash('sha256').update(password).digest();
    const tempEngine = new EncryptionEngine(passwordKey);
    const encrypted = tempEngine.encryptBuffer(serialized);
    tempEngine.destroy();
    serialized.fill(0);

    return Buffer.from(JSON.stringify(encrypted), 'utf8');
  }

  async importData(data: Buffer, password: string): Promise<void> {
    const payload = JSON.parse(data.toString('utf8')) as EncryptedData;
    const passwordKey = createHash('sha256').update(password).digest();
    const tempEngine = new EncryptionEngine(passwordKey);
    const decrypted = tempEngine.decryptBuffer(payload);
    tempEngine.destroy();

    const parsed = JSON.parse(decrypted.toString('utf8')) as {
      bookmarks: Bookmark[];
      history: HistoryEntry[];
      settings: { key: string; value: string }[];
    };

    for (const bookmark of parsed.bookmarks ?? []) {
      await this.saveBookmark({ ...bookmark, id: bookmark.id || randomUUID() });
    }
    for (const entry of parsed.history ?? []) {
      await this.saveHistory({ ...entry, id: entry.id || randomUUID() });
    }
    for (const setting of parsed.settings ?? []) {
      await this.db.execute(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        [setting.key, setting.value, Date.now()]
      );
    }

    decrypted.fill(0);
  }
}
