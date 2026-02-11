import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { EncryptedData } from '@/shared/types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export class EncryptionEngine {
  private masterKey: Buffer;

  constructor(masterKey: Buffer) {
    if (masterKey.length !== 32) {
      throw new Error('Master key must be 32 bytes');
    }
    this.masterKey = Buffer.from(masterKey);
  }

  encrypt(data: string): EncryptedData {
    return this.encryptBuffer(Buffer.from(data, 'utf8'));
  }

  decrypt(encryptedData: EncryptedData): string {
    const value = this.decryptBuffer(encryptedData);
    const output = value.toString('utf8');
    value.fill(0);
    return output;
  }

  encryptBuffer(data: Buffer): EncryptedData {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const out: EncryptedData = {
      iv: iv.toString('base64'),
      encryptedData: encrypted.toString('base64'),
      authTag: authTag.toString('base64')
    };

    iv.fill(0);
    encrypted.fill(0);
    authTag.fill(0);
    return out;
  }

  decryptBuffer(encryptedData: EncryptedData): Buffer {
    try {
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const data = Buffer.from(encryptedData.encryptedData, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);
      const result = Buffer.concat([decipher.update(data), decipher.final()]);
      iv.fill(0);
      data.fill(0);
      authTag.fill(0);
      return result;
    } catch {
      throw new Error('Failed to decrypt payload');
    }
  }

  destroy(): void {
    this.masterKey.fill(0);
  }
}
