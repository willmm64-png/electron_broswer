import { BrowserView, BrowserWindow, app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TAB_LIMIT = 20;
const IDLE_DESTROY_MS = 10 * 60 * 1000;

interface ManagedTab {
  id: string;
  view: BrowserView;
  url: string;
  title: string;
  favicon?: string;
  isActive: boolean;
  lastUsedAt: number;
}

let mainWindow: BrowserWindow | null = null;
const tabs = new Map<string, ManagedTab>();
let activeTabId: string | null = null;

const tabState = () =>
  [...tabs.values()].map((tab) => ({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    favicon: tab.favicon,
    isActive: tab.id === activeTabId
  }));

const emitNavigation = (tab: ManagedTab) => {
  mainWindow?.webContents.send('browser:navigation-update', {
    tabId: tab.id,
    url: tab.url,
    title: tab.title,
    canGoBack: tab.view.webContents.navigationHistory.canGoBack(),
    canGoForward: tab.view.webContents.navigationHistory.canGoForward(),
    isLoading: tab.view.webContents.isLoading(),
    favicon: tab.favicon,
    isSecure: tab.url.startsWith('https://')
  });
  mainWindow?.webContents.send('browser:tabs-update', tabState());
};

const browserBounds = () => {
  if (!mainWindow) {
    return { x: 0, y: 90, width: 1200, height: 710 };
  }
  const [width, height] = mainWindow.getContentSize();
  return { x: 0, y: 90, width, height: Math.max(height - 90, 1) };
};

const attachView = (tab: ManagedTab) => {
  if (!mainWindow) {
    return;
  }
  mainWindow.setBrowserView(tab.view);
  tab.view.setBounds(browserBounds());
  tab.view.setAutoResize({ width: true, height: true });
};

const normalizeUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) {
    return 'https://duckduckgo.com';
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const looksLikeUrl = value.includes('.') && !value.includes(' ');
  return looksLikeUrl ? `https://${value}` : `https://duckduckgo.com/?q=${encodeURIComponent(value)}`;
};

const wireNavigationEvents = (tab: ManagedTab) => {
  const { webContents } = tab.view;

  webContents.on('will-navigate', (_event, url) => {
    tab.url = url;
    tab.lastUsedAt = Date.now();
    emitNavigation(tab);
  });

  webContents.on('did-navigate', (_event, url) => {
    tab.url = url;
    tab.lastUsedAt = Date.now();
    emitNavigation(tab);
  });

  webContents.on('did-finish-load', async () => {
    tab.title = webContents.getTitle() || tab.title;
    tab.url = webContents.getURL() || tab.url;
    tab.lastUsedAt = Date.now();
    try {
      const [favicon] = await webContents.executeJavaScript<string[]>(
        "Array.from(document.querySelectorAll('link[rel*=\"icon\"]')).map((element) => element.href).filter(Boolean)",
        true
      );
      tab.favicon = favicon;
    } catch (error) {
      console.warn('favicon fetch failed', error);
    }
    emitNavigation(tab);
  });

  webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    tab.title = title;
    emitNavigation(tab);
  });

  webContents.on('did-start-loading', () => emitNavigation(tab));
  webContents.on('did-stop-loading', () => emitNavigation(tab));
};

const createTab = async (url = 'https://duckduckgo.com'): Promise<ManagedTab | null> => {
  if (tabs.size >= TAB_LIMIT) {
    return null;
  }

  const id = crypto.randomUUID();
  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  const tab: ManagedTab = {
    id,
    view,
    url,
    title: 'New Tab',
    isActive: false,
    lastUsedAt: Date.now()
  };

  tabs.set(id, tab);
  wireNavigationEvents(tab);
  await view.webContents.loadURL(normalizeUrl(url));
  return tab;
};

export const getMainWindow = () => mainWindow;

export const getTabs = () => tabState();

export const getActiveTab = () => (activeTabId ? tabs.get(activeTabId) ?? null : null);

export const switchTab = async (tabId: string) => {
  const tab = tabs.get(tabId);
  if (!tab || !mainWindow) {
    return tabState();
  }

  activeTabId = tab.id;
  tabs.forEach((current) => {
    current.isActive = current.id === tab.id;
  });

  attachView(tab);
  tab.lastUsedAt = Date.now();
  emitNavigation(tab);
  return tabState();
};

export const newTab = async (url?: string) => {
  const tab = await createTab(url);
  if (!tab) {
    return tabState();
  }
  await switchTab(tab.id);
  return tabState();
};

export const closeTab = async (tabId: string) => {
  const tab = tabs.get(tabId);
  if (!tab) {
    return tabState();
  }

  if (mainWindow && activeTabId === tabId) {
    mainWindow.removeBrowserView(tab.view);
  }

  tab.view.webContents.destroy();
  tabs.delete(tabId);

  if (tabs.size === 0) {
    await newTab();
    return tabState();
  }

  const fallback = [...tabs.values()].at(-1);
  if (fallback) {
    await switchTab(fallback.id);
  }

  return tabState();
};

export const navigateTo = async (url: string) => {
  const active = getActiveTab();
  if (!active) {
    return;
  }
  await active.view.webContents.loadURL(normalizeUrl(url));
};

export const goBack = async () => {
  const active = getActiveTab();
  if (active?.view.webContents.navigationHistory.canGoBack()) {
    active.view.webContents.navigationHistory.goBack();
  }
};

export const goForward = async () => {
  const active = getActiveTab();
  if (active?.view.webContents.navigationHistory.canGoForward()) {
    active.view.webContents.navigationHistory.goForward();
  }
};

export const reload = async () => {
  const active = getActiveTab();
  active?.view.webContents.reload();
};

export const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('resize', () => {
    const active = getActiveTab();
    if (active) {
      active.view.setBounds(browserBounds());
    }
  });

  setInterval(() => {
    const now = Date.now();
    tabs.forEach((tab) => {
      if (tab.id !== activeTabId && now - tab.lastUsedAt > IDLE_DESTROY_MS) {
        tab.view.webContents.destroy();
        tabs.delete(tab.id);
      }
    });
    mainWindow?.webContents.send('browser:tabs-update', tabState());
  }, 60_000).unref();

  await newTab('https://duckduckgo.com');

  mainWindow.on('closed', () => {
    mainWindow = null;
    tabs.clear();
    activeTabId = null;
  });

  return mainWindow;
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
