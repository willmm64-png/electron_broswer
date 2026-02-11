import type { HistoryEntry } from '@/shared/types';
import { SecureStorage } from './SecureStorage';

export class HistoryStore {
  constructor(private readonly storage: SecureStorage) {}

  save(entry: HistoryEntry): Promise<void> {
    return this.storage.saveHistory(entry);
  }

  getAll(limit?: number): Promise<HistoryEntry[]> {
    return this.storage.getHistory(limit);
  }

  clear(): Promise<void> {
    return this.storage.clearHistory();
  }
}
