import type { PrivacySettings as PrivacySettingsType } from '@/shared/types';

export function PrivacySettings({ settings, onSettingChange }: { settings: PrivacySettingsType; onSettingChange: (key: keyof PrivacySettingsType, value: boolean) => void }) {
  return (
    <section className="rounded-lg border border-borderColor bg-bgSecondary p-3 text-sm">
      <h2 className="mb-2 font-semibold">Privacy Preferences</h2>
      {(Object.keys(settings) as Array<keyof PrivacySettingsType>).map((key) => (
        <label key={key} className="mb-1 flex items-center justify-between rounded bg-bgPrimary px-2 py-1">
          <span>{key}</span>
          <input checked={settings[key]} type="checkbox" onChange={(event) => onSettingChange(key, event.target.checked)} />
        </label>
      ))}
    </section>
  );
}
