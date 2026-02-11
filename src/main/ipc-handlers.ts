import { BrowserWindow, ipcMain } from 'electron';
import { authManager } from './auth/AuthManager';
import { privacyService } from './privacy/PrivacyService';
import { closeTab, getTabs, goBack, goForward, navigateTo, newTab, reload, switchTab } from './window';
import type { Bookmark, GeneratorOptions, HistoryEntry, PrivacySettings, VaultEntry } from '@/shared/types';

const safe = <T>(callback: () => Promise<T>) =>
  callback().catch((error) => {
    console.error('IPC handler error', error);
    throw new Error('Operation failed');
  });

export const registerIpcHandlers = () => {
  ipcMain.handle('browser:navigate', async (_event, url: string) => safe(async () => navigateTo(url)));
  ipcMain.handle('browser:go-back', async () => safe(async () => goBack()));
  ipcMain.handle('browser:go-forward', async () => safe(async () => goForward()));
  ipcMain.handle('browser:reload', async () => safe(async () => reload()));

  ipcMain.handle('tabs:new', async (_event, url?: string) => safe(async () => newTab(url)));
  ipcMain.handle('tabs:close', async (_event, tabId: string) => safe(async () => closeTab(tabId)));
  ipcMain.handle('tabs:switch', async (_event, tabId: string) => safe(async () => switchTab(tabId)));
  ipcMain.handle('tabs:get', async () => safe(async () => getTabs()));

  ipcMain.handle('auth:getState', async () => safe(async () => authManager.getAuthState()));
  ipcMain.handle('auth:setup', async (_event, password: string, enableBiometric: boolean) => safe(async () => authManager.setupMasterPassword(password, enableBiometric)));
  ipcMain.handle('auth:login', async (_event, password: string) => safe(async () => authManager.login(password)));
  ipcMain.handle('auth:loginBiometric', async () => safe(async () => authManager.loginWithBiometric()));
  ipcMain.handle('auth:logout', async () => safe(async () => authManager.logout()));
  ipcMain.handle('auth:validateStrength', async (_event, password: string) => safe(async () => authManager.validatePasswordStrength(password)));
  ipcMain.handle('password:change', async (_event, oldPass: string, newPass: string) => safe(async () => authManager.changePassword(oldPass, newPass)));

  ipcMain.handle('session:lock', async () => safe(async () => authManager.lockSession()));
  ipcMain.handle('session:setAutoLock', async (_event, minutes: number) => safe(async () => authManager.setAutoLockTimeout(minutes)));
  ipcMain.handle('session:touch', async () => safe(async () => authManager.resetInactivity()));
  ipcMain.handle('settings:getSecurity', async () => safe(async () => authManager.getSecuritySettings()));

  ipcMain.handle('biometric:isAvailable', async () => safe(async () => (await authManager.getAuthState()).biometricAvailable));
  ipcMain.handle('biometric:enable', async () => safe(async () => authManager.enableBiometric()));
  ipcMain.handle('biometric:disable', async () => safe(async () => authManager.disableBiometric()));

  ipcMain.handle('bookmarks:save', async (_event, bookmark: Bookmark) => safe(async () => authManager.saveBookmark(bookmark)));
  ipcMain.handle('bookmarks:getAll', async () => safe(async () => authManager.getBookmarks()));
  ipcMain.handle('bookmarks:delete', async (_event, id: string) => safe(async () => authManager.deleteBookmark(id)));
  ipcMain.handle('history:save', async (_event, entry: HistoryEntry) => safe(async () => authManager.saveHistory(entry)));
  ipcMain.handle('history:getAll', async (_event, limit?: number) => safe(async () => authManager.getHistory(limit)));
  ipcMain.handle('history:clear', async () => safe(async () => authManager.clearHistory()));

  ipcMain.handle('privacy:getStats', async () => safe(async () => privacyService.getStats()));
  ipcMain.handle('privacy:getReport', async (event, url: string) => safe(async () => privacyService.getReport(url, event.sender.id)));
  ipcMain.handle('privacy:setSetting', async (_event, key: keyof PrivacySettings, value: boolean) => safe(async () => privacyService.setSetting(key, value)));
  ipcMain.handle('privacy:getSettings', async () => safe(async () => privacyService.getSettings()));
  ipcMain.handle('adblocker:setEnabled', async (_event, enabled: boolean) => safe(async () => privacyService.getAdBlocker().setEnabled(enabled)));
  ipcMain.handle('adblocker:updateFilters', async () => safe(async () => privacyService.getAdBlocker().updateFilters()));
  ipcMain.handle('adblocker:addToWhitelist', async (_event, domain: string) => safe(async () => privacyService.getAdBlocker().addToWhitelist(domain)));

  ipcMain.handle('cookies:getAll', async (_event, domain?: string) => safe(async () => privacyService.getCookieManager().getCookies(domain)));
  ipcMain.handle('cookies:delete', async (_event, domain: string, name: string) => safe(async () => privacyService.getCookieManager().deleteCookie(domain, name)));
  ipcMain.handle('cookies:deleteAll', async () => safe(async () => privacyService.getCookieManager().deleteAllCookies()));
  ipcMain.handle('cookies:blockThirdParty', async (_event, enabled: boolean) => safe(async () => privacyService.getCookieManager().blockThirdPartyCookies(enabled)));

  ipcMain.handle('vault:save', async (_event, entry: VaultEntry) => safe(async () => authManager.vaultSave(entry)));
  ipcMain.handle('vault:get', async (_event, domain: string) => safe(async () => authManager.vaultGet(domain)));
  ipcMain.handle('vault:getAll', async () => safe(async () => authManager.vaultGetAll()));
  ipcMain.handle('vault:delete', async (_event, id: string) => safe(async () => authManager.vaultDelete(id)));
  ipcMain.handle('vault:search', async (_event, query: string) => safe(async () => authManager.vaultSearch(query)));
  ipcMain.handle('vault:generatePassword', async (_event, options: GeneratorOptions) => safe(async () => authManager.vaultGeneratePassword(options)));
  ipcMain.handle('vault:checkBreach', async (_event, password: string) => safe(async () => authManager.vaultCheckBreach(password)));

  authManager.onAuthStateChange((authenticated) => BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('auth:state-changed', authenticated)));
  authManager.onSessionLocked(() => BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('session:locked')));
  authManager.onSessionUnlocked(() => BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('session:unlocked')));
};
