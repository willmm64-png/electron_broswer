import { memo, useEffect, useRef, useState } from 'react';
import { Bookmark as BookmarkIcon, History, MonitorCog, MoonStar, Plus, Shield, Star, Sun, KeyRound, X } from 'lucide-react';
import type { AuthState, BlockedItem, Bookmark, HistoryEntry, NavigationState, PasswordStrength, PrivacyReport, PrivacySettings, PrivacyStats, SecuritySettings, TabState, VaultEntry } from '@/shared/types';
import { AddressBar } from './components/AddressBar';
import { LockScreen } from './components/auth/LockScreen';
import { MasterPasswordSetup } from './components/auth/MasterPasswordSetup';
import { LoginScreen } from './components/auth/LoginScreen';
import { BiometricPrompt } from './components/auth/BiometricPrompt';
import { NavControls } from './components/NavControls';
import { SecuritySettings } from './components/settings/SecuritySettings';
import { WebView } from './components/WebView';
import { PrivacyDashboard } from './components/privacy/PrivacyDashboard';
import { SiteShield } from './components/privacy/SiteShield';
import { CookieViewer } from './components/privacy/CookieViewer';
import { BlockedTracker } from './components/privacy/BlockedTracker';
import { PasswordManager } from './components/vault/PasswordManager';
import { PasswordGenerator } from './components/vault/PasswordGenerator';

const DEFAULT_NAV: NavigationState = { tabId: '', url: 'https://duckduckgo.com', title: 'New Tab', canGoBack: false, canGoForward: false, isLoading: false, isSecure: true };
const DEFAULT_AUTH: AuthState = { isFirstRun: true, authenticated: false, biometricAvailable: false, biometricEnrolled: false, sessionLocked: true };
const DEFAULT_STATS: PrivacyStats = { today: { totalBlocked: 0, adsBlocked: 0, trackersBlocked: 0, byDomain: {} }, allTime: { totalBlocked: 0, adsBlocked: 0, trackersBlocked: 0, byDomain: {} }, recentBlocked: [] };

const TabButton = memo(function TabButton({ tab, onClick, onClose }: { tab: TabState; onClick: () => void; onClose: () => void }) {
  return <button type="button" onClick={onClick} className={`group flex h-8 min-w-44 max-w-56 items-center gap-2 rounded-lg border px-3 text-sm transition-all duration-150 ${tab.isActive ? 'border-accent bg-bgTertiary text-textPrimary' : 'border-borderColor bg-bgSecondary text-textSecondary hover:bg-bgTertiary'}`}><span>{tab.favicon ? <img src={tab.favicon} alt="" className="size-4" /> : <MonitorCog size={14} />}</span><span className="truncate text-left">{tab.title || 'New Tab'}</span><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onClose(); }} className="ml-auto rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-bgPrimary"><X size={12} /></span></button>;
});

export default function App() {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [navigation, setNavigation] = useState<NavigationState>(DEFAULT_NAV);
  const [addressBarValue, setAddressBarValue] = useState(DEFAULT_NAV.url);
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(DEFAULT_AUTH);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isStrong: false });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({ autoLockMinutes: 15, biometricEnabled: false });
  const [biometricPromptVisible, setBiometricPromptVisible] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({ adBlockerEnabled: true, httpsOnlyMode: true, blockThirdPartyCookies: true, dnsOverHttpsEnabled: true, doNotTrackEnabled: true, webRtcLeakProtection: true, fingerprintProtection: true });
  const [privacyStats, setPrivacyStats] = useState<PrivacyStats>(DEFAULT_STATS);
  const [siteReport, setSiteReport] = useState<PrivacyReport | null>(null);
  const [cookies, setCookies] = useState<Array<{ domain: string; name: string; value: string; path: string; expires: number; size: number; httpOnly: boolean; secure: boolean; sameSite: string }>>([]);
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  const refreshData = async () => {
    try {
      const [savedBookmarks, savedHistory, settings, stats, psettings, ventries] = await Promise.all([
        window.browserAPI.bookmarksGetAll(), window.browserAPI.historyGetAll(100), window.browserAPI.settingsGetSecurity(), window.browserAPI.privacyGetStats(), window.browserAPI.privacyGetSettings(), window.browserAPI.vaultGetAll()
      ]);
      setBookmarks(savedBookmarks); setHistoryEntries(savedHistory); setSecuritySettings(settings); setPrivacyStats(stats); setPrivacySettings(psettings); setVaultEntries(ventries);
      setCookies(await window.browserAPI.cookiesGetAll());
      setSiteReport(await window.browserAPI.privacyGetReport(navigation.url));
    } catch {
      setBookmarks([]); setHistoryEntries([]);
    }
  };

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('theme', theme); }, [theme]);

  useEffect(() => {
    const bootstrap = async () => {
      const [initialTabs, initialAuth] = await Promise.all([window.browserAPI.getTabs(), window.browserAPI.authGetState()]);
      setTabs(initialTabs); setAuthState(initialAuth); if (initialAuth.authenticated) await refreshData();
    };
    bootstrap().catch(console.error);

    const removeNavigationListener = window.browserAPI.onNavigationUpdate((state) => {
      setNavigation(state); setAddressBarValue(state.url);
      if (authState.authenticated) {
        const entry: HistoryEntry = { id: crypto.randomUUID(), title: state.title, url: state.url, favicon: state.favicon, visitedAt: new Date().toISOString() };
        window.browserAPI.historySave(entry).catch(console.error);
        window.browserAPI.privacyGetReport(state.url).then(setSiteReport).catch(console.error);
      }
    });

    const removeAuthListener = window.browserAPI.onAuthStateChange((authenticated) => { setAuthState((current) => ({ ...current, authenticated, sessionLocked: !authenticated })); if (authenticated) refreshData().catch(console.error); });
    const removeSessionLocked = window.browserAPI.onSessionLocked(() => setAuthState((current) => ({ ...current, sessionLocked: true, authenticated: false })));
    const removeSessionUnlocked = window.browserAPI.onSessionUnlocked(() => { setAuthState((current) => ({ ...current, sessionLocked: false, authenticated: true })); refreshData().catch(console.error); });
    const tabsListener = (event: Event) => setTabs((event as CustomEvent<TabState[]>).detail);
    window.addEventListener('tabs:update', tabsListener);

    return () => { removeNavigationListener(); removeAuthListener(); removeSessionLocked(); removeSessionUnlocked(); window.removeEventListener('tabs:update', tabsListener); };
  }, [authState.authenticated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (!authState.authenticated) return;
      if (ctrlOrMeta && event.key.toLowerCase() === 't') { event.preventDefault(); window.browserAPI.newTab().catch(console.error); }
      else if (ctrlOrMeta && event.key.toLowerCase() === 'w') { event.preventDefault(); const activeTab = tabs.find((tab) => tab.isActive); if (activeTab) window.browserAPI.closeTab(activeTab.id).catch(console.error); }
      else if (ctrlOrMeta && event.key === 'Tab') { event.preventDefault(); if (tabs.length > 1) { const index = tabs.findIndex((tab) => tab.isActive); const offset = event.shiftKey ? -1 : 1; const next = tabs[(index + offset + tabs.length) % tabs.length]; if (next) window.browserAPI.switchTab(next.id).catch(console.error); } }
      else if (ctrlOrMeta && event.key.toLowerCase() === 'l') { event.preventDefault(); addressInputRef.current?.focus(); }
      else if ((ctrlOrMeta && event.key.toLowerCase() === 'r') || event.key === 'F5') { event.preventDefault(); window.browserAPI.reload().catch(console.error); }
      else if (event.altKey && event.key === 'ArrowLeft') { event.preventDefault(); window.browserAPI.goBack().catch(console.error); }
      else if (event.altKey && event.key === 'ArrowRight') { event.preventDefault(); window.browserAPI.goForward().catch(console.error); }
      else if (ctrlOrMeta && event.shiftKey && event.key.toLowerCase() === 'l') { event.preventDefault(); const active = tabs.find((tab) => tab.isActive); if (!active) return; window.browserAPI.vaultGet(new URL(navigation.url).hostname).then((entry) => entry && alert(`Auto-fill ready for ${entry.username}`)).catch(console.error); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authState.authenticated, tabs, navigation.url]);

  const addBookmark = async () => { const bookmark: Bookmark = { id: crypto.randomUUID(), title: navigation.title, url: navigation.url, favicon: navigation.favicon, createdAt: new Date().toISOString() }; await window.browserAPI.bookmarksSave(bookmark); setBookmarks((items) => [bookmark, ...items]); };
  const activeTab = tabs.find((tab) => tab.isActive);

  return (
    <main className="flex h-screen w-screen flex-col bg-bgPrimary text-textPrimary transition-colors duration-150" onMouseMove={() => authState.authenticated && window.browserAPI.sessionTouch().catch(console.error)}>
      <header className="flex h-10 items-center gap-2 overflow-x-auto border-b border-borderColor bg-bgSecondary px-2">
        {(tabs.length > 15 ? tabs.slice(0, 15) : tabs).map((tab) => <TabButton key={tab.id} tab={tab} onClick={() => window.browserAPI.switchTab(tab.id).catch(console.error)} onClose={() => window.browserAPI.closeTab(tab.id).catch(console.error)} />)}
        <button type="button" onClick={() => window.browserAPI.newTab().catch(console.error)} className="rounded-lg border border-borderColor bg-bgSecondary p-2 transition-all duration-150 hover:bg-bgTertiary" aria-label="New tab"><Plus size={14} /></button>
      </header>

      <section className="flex h-[50px] items-center gap-2 border-b border-borderColor bg-bgSecondary px-3 py-2">
        <NavControls canGoBack={navigation.canGoBack} canGoForward={navigation.canGoForward} isLoading={navigation.isLoading} onBack={() => window.browserAPI.goBack().catch(console.error)} onForward={() => window.browserAPI.goForward().catch(console.error)} onReload={() => window.browserAPI.reload().catch(console.error)} onHome={() => window.browserAPI.navigateTo('https://duckduckgo.com').catch(console.error)} />
        <AddressBar value={addressBarValue} isSecure={navigation.isSecure} onChange={setAddressBarValue} onSubmit={() => window.browserAPI.navigateTo(addressBarValue).catch(console.error)} onClear={() => setAddressBarValue('')} inputRef={addressInputRef} />
        <button type="button" onClick={() => addBookmark().catch(console.error)} className="rounded-lg border border-borderColor bg-bgSecondary p-2 hover:bg-bgTertiary" aria-label="Bookmark"><Star size={16} /></button>
        <button type="button" onClick={() => setShowBookmarks((current) => !current)} className="rounded-lg border border-borderColor bg-bgSecondary p-2 hover:bg-bgTertiary" aria-label="Bookmarks"><BookmarkIcon size={16} /></button>
        <button type="button" onClick={() => setShowHistory((current) => !current)} className="rounded-lg border border-borderColor bg-bgSecondary p-2 hover:bg-bgTertiary" aria-label="History"><History size={16} /></button>
        <button type="button" onClick={() => setShowSecurity((current) => !current)} className="rounded-lg border border-borderColor bg-bgSecondary p-2 hover:bg-bgTertiary" aria-label="Security">Sec</button>
        <button type="button" onClick={() => setShowPrivacy((current) => !current)} className="rounded-lg border border-borderColor bg-bgSecondary p-2 hover:bg-bgTertiary" aria-label="Privacy"><Shield size={16} /></button>
        <button type="button" onClick={() => setShowVault((current) => !current)} className="rounded-lg border border-borderColor bg-bgSecondary p-2 hover:bg-bgTertiary" aria-label="Vault"><KeyRound size={16} /></button>
        <button type="button" onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} className="rounded-lg border border-borderColor bg-bgSecondary p-2 hover:bg-bgTertiary" aria-label="Theme">{theme === 'dark' ? <Sun size={16} /> : <MoonStar size={16} />}</button>
      </section>

      <div className="relative flex-1"><WebView />
        {showSecurity ? <aside className="absolute right-3 top-3 z-20 w-[420px]"><SecuritySettings biometricEnabled={securitySettings.biometricEnabled} autoLockMinutes={securitySettings.autoLockMinutes} onToggleBiometric={async () => { if (securitySettings.biometricEnabled) await window.browserAPI.biometricDisable(); else await window.browserAPI.biometricEnable(); const state = await window.browserAPI.authGetState(); setAuthState(state); setSecuritySettings((current) => ({ ...current, biometricEnabled: !current.biometricEnabled })); }} onSetAutoLock={async (minutes) => { await window.browserAPI.sessionSetAutoLock(minutes); setSecuritySettings((current) => ({ ...current, autoLockMinutes: minutes })); }} onLockNow={async () => window.browserAPI.sessionLock()} onChangePassword={window.browserAPI.authChangePassword} /></aside> : null}
        {showPrivacy ? <aside className="absolute left-3 top-3 z-20 grid w-[470px] gap-2"><PrivacyDashboard stats={privacyStats} settings={privacySettings} onSettingChange={(key, value) => { window.browserAPI.privacySetSetting(key, value).then(setPrivacySettings).catch(console.error); }} /><SiteShield report={siteReport} /><CookieViewer cookies={cookies} onDelete={(domain, name) => { window.browserAPI.cookiesDelete(domain, name).then(refreshData).catch(console.error); }} onDeleteAll={() => { window.browserAPI.cookiesDeleteAll().then(refreshData).catch(console.error); }} /><BlockedTracker items={privacyStats.recentBlocked as BlockedItem[]} /></aside> : null}
        {showVault ? <aside className="absolute right-3 bottom-3 z-20 grid w-[420px] gap-2"><PasswordManager entries={vaultEntries} onSave={async (entry) => { await window.browserAPI.vaultSave(entry); setVaultEntries(await window.browserAPI.vaultGetAll()); }} onDelete={async (id) => { await window.browserAPI.vaultDelete(id); setVaultEntries(await window.browserAPI.vaultGetAll()); }} onSearch={async (query) => setVaultEntries(await window.browserAPI.vaultSearch(query))} /><PasswordGenerator onGenerate={(length) => window.browserAPI.vaultGeneratePassword({ length, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: true })} /></aside> : null}

        {showBookmarks ? <aside className="absolute right-3 top-3 z-20 w-80 rounded-lg border border-borderColor bg-bgSecondary p-2 shadow-lg"><h2 className="mb-2 text-sm font-medium">Bookmarks</h2><ul className="max-h-64 overflow-auto text-sm">{bookmarks.map((bookmark) => <li key={bookmark.id}><button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-bgTertiary" onClick={() => { setShowBookmarks(false); window.browserAPI.navigateTo(bookmark.url).catch(console.error); }}>{bookmark.favicon ? <img src={bookmark.favicon} alt="" className="size-4" /> : <Star size={12} />}<span className="truncate">{bookmark.title}</span></button></li>)}</ul></aside> : null}
        {showHistory ? <aside className="absolute right-3 top-3 z-20 w-96 rounded-lg border border-borderColor bg-bgSecondary p-2 shadow-lg"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-medium">History</h2><button type="button" onClick={() => { window.browserAPI.historyClear().catch(console.error); setHistoryEntries([]); }} className="text-xs text-textSecondary hover:text-textPrimary">Clear</button></div><ul className="max-h-72 overflow-auto text-sm">{historyEntries.map((entry) => <li key={entry.id}><button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-bgTertiary" onClick={() => { setShowHistory(false); window.browserAPI.navigateTo(entry.url).catch(console.error); }}>{entry.favicon ? <img src={entry.favicon} alt="" className="size-4" /> : <History size={12} />}<span className="truncate">{entry.title}</span></button></li>)}</ul></aside> : null}
      </div>

      <footer className="h-7 border-t border-borderColor bg-bgSecondary px-3 py-1 text-xs text-textSecondary">{activeTab ? `${activeTab.title} • ${navigation.url}` : 'Ready'}</footer>
      {authState.isFirstRun ? <MasterPasswordSetup strength={passwordStrength} biometricAvailable={authState.biometricAvailable} onStrengthCheck={async (password) => setPasswordStrength(await window.browserAPI.authValidatePasswordStrength(password))} onCreate={async (password, enableBiometric) => { await window.browserAPI.authSetup(password, enableBiometric); setAuthState(await window.browserAPI.authGetState()); await refreshData(); }} /> : !authState.authenticated ? <LoginScreen biometricVisible={authState.biometricEnrolled} onLogin={async (password) => { const ok = await window.browserAPI.authLogin(password); if (ok) { setAuthState(await window.browserAPI.authGetState()); await refreshData(); } return ok; }} onBiometric={async () => { setBiometricPromptVisible(true); const ok = await window.browserAPI.authLoginBiometric(); setBiometricPromptVisible(false); if (ok) { setAuthState(await window.browserAPI.authGetState()); await refreshData(); } return ok; }} /> : authState.sessionLocked ? <LockScreen biometricVisible={authState.biometricEnrolled} onUnlock={(password) => window.browserAPI.authLogin(password)} onBiometricUnlock={() => window.browserAPI.authLoginBiometric()} /> : null}
      <BiometricPrompt visible={biometricPromptVisible} />
    </main>
  );
}
