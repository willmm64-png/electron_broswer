import { hash, verify } from '@node-rs/argon2';
import * as keytar from 'node-keytar';
import { AUTH_LOCKOUT_MS, AUTH_MAX_ATTEMPTS, KEYTAR_PASSWORD_HASH_ACCOUNT, KEYTAR_SERVICE, PASSWORD_MIN_LENGTH, PASSWORD_STRONG_SCORE } from '@/shared/constants';
import type { PasswordStrength } from '@/shared/types';

export class PasswordManager {
  private salt: Buffer | null = null;
  private failedAttempts = 0;
  private lockedUntil = 0;

  async createMasterPassword(password: string): Promise<void> {
    const strength = this.validatePasswordStrength(password);
    if (!strength.isStrong) {
      throw new Error('Password does not meet security requirements');
    }

    const passwordHash = await hash(password, {
      algorithm: 2,
      memoryCost: 64 * 1024,
      timeCost: 3,
      parallelism: 4,
      outputLen: 32
    });

    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_PASSWORD_HASH_ACCOUNT, passwordHash);
    this.failedAttempts = 0;
    this.lockedUntil = 0;
  }

  async verifyMasterPassword(password: string): Promise<boolean> {
    if (Date.now() < this.lockedUntil) {
      return false;
    }

    const passwordHash = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_PASSWORD_HASH_ACCOUNT);
    if (!passwordHash) {
      return false;
    }

    const valid = await verify(passwordHash, password);
    if (!valid) {
      this.failedAttempts += 1;
      if (this.failedAttempts >= AUTH_MAX_ATTEMPTS) {
        this.lockedUntil = Date.now() + AUTH_LOCKOUT_MS;
        this.failedAttempts = 0;
      }
      return false;
    }

    this.failedAttempts = 0;
    this.lockedUntil = 0;
    return true;
  }

  async changeMasterPassword(oldPassword: string, newPassword: string): Promise<void> {
    const oldValid = await this.verifyMasterPassword(oldPassword);
    if (!oldValid) {
      throw new Error('Authentication failed');
    }

    await this.createMasterPassword(newPassword);
  }

  validatePasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= PASSWORD_MIN_LENGTH) {
      score += 1;
    } else {
      feedback.push('Use at least 12 characters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Add at least one uppercase letter');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Add at least one lowercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Add at least one number');
    }

    if (password.length >= 16) {
      score += 1;
    } else {
      feedback.push('Recommended: 16+ characters');
    }

    return {
      score: Math.min(score, 4),
      feedback,
      isStrong: score >= PASSWORD_STRONG_SCORE
    };
  }

  async hasMasterPassword(): Promise<boolean> {
    const passwordHash = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_PASSWORD_HASH_ACCOUNT);
    return Boolean(passwordHash);
  }

  destroy(): void {
    this.salt?.fill(0);
    this.salt = null;
  }
}
