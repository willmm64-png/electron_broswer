import type { Bookmark } from '@/shared/types';
import { SecureStorage } from './SecureStorage';

export class BookmarksStore {
  constructor(private readonly storage: SecureStorage) {}

  save(bookmark: Bookmark): Promise<void> {
    return this.storage.saveBookmark(bookmark);
  }

  getAll(): Promise<Bookmark[]> {
    return this.storage.getBookmarks();
  }

  delete(id: string): Promise<void> {
    return this.storage.deleteBookmark(id);
  }
}
