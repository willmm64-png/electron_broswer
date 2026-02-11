import { EventEmitter } from 'node:events';
import { powerMonitor } from 'electron';
import { DEFAULT_AUTO_LOCK_MINUTES } from '@/shared/constants';

export class SessionManager {
  private autoLockMinutes = DEFAULT_AUTO_LOCK_MINUTES;
  private active = false;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private events = new EventEmitter();

  constructor() {
    powerMonitor.on('suspend', () => this.lockSession());
    powerMonitor.on('lock-screen', () => this.lockSession());
  }

  startSession(): void {
    this.active = true;
    this.resetInactivityTimer();
    this.events.emit('unlocked');
  }

  lockSession(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    this.events.emit('locked');
  }

  unlockSession(): void {
    this.active = true;
    this.resetInactivityTimer();
    this.events.emit('unlocked');
  }

  isSessionActive(): boolean {
    return this.active;
  }

  setAutoLockTimeout(minutes: number): void {
    this.autoLockMinutes = minutes;
    this.resetInactivityTimer();
  }

  resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (!this.active || this.autoLockMinutes <= 0) {
      return;
    }

    this.inactivityTimer = setTimeout(() => this.lockSession(), this.autoLockMinutes * 60_000);
    this.inactivityTimer.unref();
  }

  onSessionLocked(callback: () => void): void {
    this.events.on('locked', callback);
  }

  onSessionUnlocked(callback: () => void): void {
    this.events.on('unlocked', callback);
  }
}
