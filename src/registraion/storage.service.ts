// services/storage/storage.service.ts
import { STORAGE_KEYS } from './constants';

class StorageService {
  private isBrowser = typeof window !== 'undefined';

  setItem(key: string, value: string): void {
    if (this.isBrowser) {
      localStorage.setItem(key, value);
    }
  }

  getItem(key: string): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  }

  async setObject(key: string, value: any): Promise<void> {
    if (this.isBrowser) {
      try {
        const jsonValue = JSON.stringify(value);
        localStorage.setItem(key, jsonValue);
      } catch (e) {
        console.error('Error saving to storage', e);
      }
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    if (this.isBrowser) {
      try {
        const jsonValue = localStorage.getItem(key);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
      } catch (e) {
        console.error('Error reading from storage', e);
        return null;
      }
    }
    return null;
  }

  async removeItem(key: string): Promise<void> {
    if (this.isBrowser) {
      localStorage.removeItem(key);
    }
  }

  clear(): void {
    if (this.isBrowser) {
      localStorage.clear();
    }
  }
}

export const storageService = new StorageService();