import * as keytar from 'node-keytar';
import { systemPreferences } from 'electron';
import { KEYTAR_MASTER_KEY_ACCOUNT, KEYTAR_SERVICE } from '@/shared/constants';

export class BiometricAuth {
  private enrolled = false;

  async isAvailable(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        return systemPreferences.canPromptTouchID();
      }
      return process.platform === 'win32';
    } catch {
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    const available = await this.isAvailable();
    if (!available || !this.enrolled) {
      return false;
    }

    try {
      if (process.platform === 'darwin') {
        return await systemPreferences.promptTouchID('Unlock Privacy Browser');
      }
      return true;
    } catch {
      return false;
    }
  }

  async enrollBiometric(masterKey: Buffer): Promise<void> {
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_MASTER_KEY_ACCOUNT, masterKey.toString('base64'));
    this.enrolled = true;
  }

  async getStoredMasterKey(): Promise<Buffer | null> {
    const encoded = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_MASTER_KEY_ACCOUNT);
    if (!encoded) {
      return null;
    }
    return Buffer.from(encoded, 'base64');
  }

  async removeBiometric(): Promise<void> {
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_MASTER_KEY_ACCOUNT);
    this.enrolled = false;
  }

  async isBiometricEnrolled(): Promise<boolean> {
    const key = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_MASTER_KEY_ACCOUNT);
    this.enrolled = Boolean(key);
    return this.enrolled;
  }
}
