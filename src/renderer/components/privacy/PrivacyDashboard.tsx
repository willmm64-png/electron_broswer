import type { PrivacySettings, PrivacyStats } from '@/shared/types';

interface Props {
  stats: PrivacyStats;
  settings: PrivacySettings;
  onSettingChange: (key: keyof PrivacySettings, value: boolean) => void;
}

export function PrivacyDashboard({ stats, settings, onSettingChange }: Props) {
  const toggles: Array<{ key: keyof PrivacySettings; label: string }> = [
    { key: 'adBlockerEnabled', label: 'Block ads and trackers' },
    { key: 'blockThirdPartyCookies', label: 'Block third-party cookies' },
    { key: 'httpsOnlyMode', label: 'HTTPS-only mode' },
    { key: 'dnsOverHttpsEnabled', label: 'DNS-over-HTTPS' },
    { key: 'doNotTrackEnabled', label: 'Do Not Track' },
    { key: 'webRtcLeakProtection', label: 'WebRTC leak protection' },
    { key: 'fingerprintProtection', label: 'Fingerprinting defense' }
  ];

  return (
    <section className="space-y-3 rounded-lg border border-borderColor bg-bgSecondary p-3">
      <h2 className="text-sm font-semibold">Privacy Dashboard</h2>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-bgPrimary p-2">Ads Blocked: {stats.today.adsBlocked}</div>
        <div className="rounded-md bg-bgPrimary p-2">Trackers Blocked: {stats.today.trackersBlocked}</div>
        <div className="rounded-md bg-bgPrimary p-2">Total Today: {stats.today.totalBlocked}</div>
        <div className="rounded-md bg-bgPrimary p-2">Total All Time: {stats.allTime.totalBlocked}</div>
      </div>

      <div className="space-y-2">
        {toggles.map((toggle) => (
          <label key={toggle.key} className="flex items-center justify-between rounded-md bg-bgPrimary px-2 py-1 text-sm">
            {toggle.label}
            <input type="checkbox" checked={settings[toggle.key]} onChange={(event) => onSettingChange(toggle.key, event.target.checked)} />
          </label>
        ))}
      </div>

      <div>
        <h3 className="mb-1 text-xs text-textSecondary">Recent blocked</h3>
        <ul className="max-h-32 overflow-auto text-xs">
          {stats.recentBlocked.slice(0, 10).map((item) => (
            <li key={item.id} className="truncate">{item.domain} — {item.reason}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
