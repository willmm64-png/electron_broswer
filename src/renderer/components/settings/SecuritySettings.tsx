import { PasswordChange } from './PasswordChange';

interface Props {
  biometricEnabled: boolean;
  autoLockMinutes: number;
  onToggleBiometric: () => Promise<void>;
  onSetAutoLock: (minutes: number) => Promise<void>;
  onLockNow: () => Promise<void>;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export function SecuritySettings({ biometricEnabled, autoLockMinutes, onToggleBiometric, onSetAutoLock, onLockNow, onChangePassword }: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-borderColor bg-bgSecondary p-3">
      <h2 className="text-sm font-semibold">Security Settings</h2>

      <div className="flex items-center justify-between rounded-md border border-borderColor bg-bgPrimary p-2">
        <span>Biometric unlock</span>
        <button type="button" className="rounded-md border border-borderColor px-2 py-1" onClick={onToggleBiometric}>
          {biometricEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-md border border-borderColor bg-bgPrimary p-2">
        <span>Auto-lock timeout</span>
        <select
          className="rounded-md border border-borderColor bg-bgSecondary px-2 py-1"
          value={autoLockMinutes}
          onChange={(event) => onSetAutoLock(Number(event.target.value))}
        >
          {[0, 5, 10, 15, 30, 60].map((value) => (
            <option key={value} value={value}>
              {value === 0 ? 'Never' : `${value} min`}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="rounded-md border border-borderColor bg-bgPrimary px-3 py-1" onClick={onLockNow}>
        Lock Now
      </button>

      <PasswordChange onChange={onChangePassword} />
    </div>
  );
}
