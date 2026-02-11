import { pbkdf2 as pbkdf2Callback, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { KDF_ITERATIONS, KDF_KEY_LENGTH, KDF_SALT_LENGTH } from '@/shared/constants';

const pbkdf2 = promisify(pbkdf2Callback);

export class KeyDerivation {
  static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    if (!this.verifySalt(salt)) {
      throw new Error('Invalid salt length');
    }
    return pbkdf2(password, salt, KDF_ITERATIONS, KDF_KEY_LENGTH, 'sha512');
  }

  static generateSalt(): Buffer {
    return randomBytes(KDF_SALT_LENGTH);
  }

  static verifySalt(salt: Buffer): boolean {
    return Buffer.isBuffer(salt) && salt.length === KDF_SALT_LENGTH;
  }
}
