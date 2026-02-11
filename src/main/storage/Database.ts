import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import DatabaseDriver from '@journeyapps/sqlcipher';
import { DATABASE_FILE_NAME } from '@/shared/constants';

export class Database {
  private dbPath: string;
  private encryptionKey: Buffer;
  private db: DatabaseDriver.Database | null = null;

  constructor(dbPath?: string, encryptionKey?: Buffer) {
    this.dbPath = dbPath ?? path.join(app.getPath('appData'), 'PrivacyBrowser', DATABASE_FILE_NAME);
    this.encryptionKey = encryptionKey ? Buffer.from(encryptionKey) : Buffer.alloc(32, 0);
  }

  setEncryptionKey(encryptionKey: Buffer): void {
    this.encryptionKey.fill(0);
    this.encryptionKey = Buffer.from(encryptionKey);
  }

  async initialize(): Promise<void> {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new DatabaseDriver(this.dbPath);
    this.db.pragma(`key = "${this.encryptionKey.toString('hex')}"`);
    this.db.pragma('cipher_page_size = 4096');
    this.db.pragma('kdf_iter = 256000');
    this.db.pragma('cipher_hmac_algorithm = HMAC_SHA512');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth (
        id INTEGER PRIMARY KEY,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        favicon TEXT,
        folder TEXT DEFAULT 'root',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        favicon TEXT,
        visit_count INTEGER DEFAULT 1,
        last_visit INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        last_unlock INTEGER NOT NULL,
        auto_lock_timeout INTEGER DEFAULT 15
      );
    `);
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const statement = this.db.prepare(sql);
    return statement.all(...params) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const statement = this.db.prepare(sql);
    statement.run(...params);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.encryptionKey.fill(0);
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    fs.copyFileSync(this.dbPath, backupPath);
  }

  async restore(backupPath: string): Promise<void> {
    await this.close();
    fs.copyFileSync(backupPath, this.dbPath);
    await this.initialize();
  }
}
