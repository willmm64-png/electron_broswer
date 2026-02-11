import { DEFAULT_AUTO_LOCK_MINUTES } from '@/shared/constants';
import { SecureStorage } from './SecureStorage';

export class SettingsStore {
  constructor(private readonly storage: SecureStorage) {}

  async getAutoLockMinutes(): Promise<number> {
    return (await this.storage.getSetting<number>('security.autoLockMinutes')) ?? DEFAULT_AUTO_LOCK_MINUTES;
  }

  async setAutoLockMinutes(minutes: number): Promise<void> {
    await this.storage.saveSetting('security.autoLockMinutes', minutes);
  }

  async isBiometricEnabled(): Promise<boolean> {
    return (await this.storage.getSetting<boolean>('security.biometricEnabled')) ?? false;
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.storage.saveSetting('security.biometricEnabled', enabled);
  }
}
