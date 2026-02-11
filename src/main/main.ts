import { app, BrowserWindow } from 'electron';
import { authManager } from './auth/AuthManager';
import { registerIpcHandlers } from './ipc-handlers';
import { privacyService } from './privacy/PrivacyService';
import { createMainWindow } from './window';

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('host-resolver-rules', 'MAP * ~NOTFOUND, EXCLUDE localhost');
app.enableHardwareAcceleration();

app.whenReady().then(async () => {
  await authManager.initialize();
  await privacyService.initialize();
  registerIpcHandlers();
  await createMainWindow();

  app.on('activate', async () => {
    if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});
