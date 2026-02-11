import { createHash } from 'node:crypto';
import { getDomain } from 'tldts';
import type { VaultEntry } from '@/shared/types';
import { EncryptionEngine } from '@/main/encryption/EncryptionEngine';
import { Database } from '@/main/storage/Database';

export class PasswordVault {
  constructor(private readonly encryptionEngine: EncryptionEngine, private readonly db: Database) {}

  async initialize(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS vault_entries (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used INTEGER
      )
    `);
  }

  async savePassword(entry: VaultEntry): Promise<void> {
    const now = Date.now();
    const encryptedPassword = JSON.stringify(this.encryptionEngine.encrypt(entry.password));
    const encryptedNotes = entry.notes ? JSON.stringify(this.encryptionEngine.encrypt(entry.notes)) : null;
    await this.db.execute(
      `INSERT INTO vault_entries (id, url, domain, username, password, notes, created_at, updated_at, last_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET url=excluded.url, domain=excluded.domain, username=excluded.username, password=excluded.password, notes=excluded.notes, updated_at=excluded.updated_at`,
      [entry.id, entry.url, entry.domain || getDomain(entry.url) || '', entry.username, encryptedPassword, encryptedNotes, new Date(entry.createdAt).getTime() || now, now, entry.lastUsed ? new Date(entry.lastUsed).getTime() : null]
    );
  }

  async getPassword(domain: string, username?: string): Promise<VaultEntry | null> {
    const rows = await this.db.query<any>(`SELECT * FROM vault_entries WHERE domain = ? ${username ? 'AND username = ?' : ''} ORDER BY updated_at DESC LIMIT 1`, username ? [domain, username] : [domain]);
    if (!rows.length) return null;
    return this.decode(rows[0]);
  }

  async getAllPasswords(): Promise<VaultEntry[]> {
    const rows = await this.db.query<any>('SELECT * FROM vault_entries ORDER BY updated_at DESC');
    return rows.map((row) => this.decode(row));
  }

  async deletePassword(id: string): Promise<void> { await this.db.execute('DELETE FROM vault_entries WHERE id = ?', [id]); }

  async searchPasswords(query: string): Promise<VaultEntry[]> {
    const rows = await this.db.query<any>('SELECT * FROM vault_entries WHERE lower(username) LIKE ? OR lower(url) LIKE ? ORDER BY updated_at DESC', [`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`]);
    return rows.map((row) => this.decode(row));
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const encrypted = JSON.stringify(this.encryptionEngine.encrypt(newPassword));
    await this.db.execute('UPDATE vault_entries SET password = ?, updated_at = ? WHERE id = ?', [encrypted, Date.now(), id]);
  }

  async checkForBreaches(password: string): Promise<boolean> {
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const body = await response.text();
      return body.split('\n').some((line) => line.startsWith(suffix));
    } catch {
      return false;
    }
  }

  private decode(row: any): VaultEntry {
    return {
      id: row.id,
      url: row.url,
      domain: row.domain,
      username: row.username,
      password: this.encryptionEngine.decrypt(JSON.parse(row.password)),
      notes: row.notes ? this.encryptionEngine.decrypt(JSON.parse(row.notes)) : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      lastUsed: row.last_used ? new Date(row.last_used).toISOString() : undefined
    };
  }
}
