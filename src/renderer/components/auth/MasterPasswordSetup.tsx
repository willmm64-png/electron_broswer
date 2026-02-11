import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PasswordStrength } from '@/shared/types';

interface Props {
  strength: PasswordStrength;
  onStrengthCheck: (password: string) => Promise<void>;
  onCreate: (password: string, enableBiometric: boolean) => Promise<void>;
  biometricAvailable: boolean;
}

export function MasterPasswordSetup({ strength, onStrengthCheck, onCreate, biometricAvailable }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);

  const meterColor = useMemo(() => {
    if (strength.score <= 1) return 'bg-red-500';
    if (strength.score <= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [strength.score]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[500px] rounded-2xl border border-borderColor bg-bgSecondary p-6 shadow-xl">
        <h1 className="text-xl font-semibold">Welcome to Privacy Browser</h1>
        <p className="mt-2 text-sm text-textSecondary">Create a master password to encrypt your browser data.</p>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Master password"
              className="w-full rounded-lg border border-borderColor bg-bgPrimary px-3 py-2 pr-10"
              value={password}
              onChange={async (event) => {
                const value = event.target.value;
                setPassword(value);
                await onStrengthCheck(value);
              }}
            />
            <button type="button" className="absolute right-2 top-2" onClick={() => setShowPassword((current) => !current)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            className="w-full rounded-lg border border-borderColor bg-bgPrimary px-3 py-2"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <div className="h-2 rounded-full bg-bgPrimary">
            <div className={`h-2 rounded-full transition-all ${meterColor}`} style={{ width: `${Math.min(100, (strength.score / 4) * 100)}%` }} />
          </div>

          <ul className="list-disc pl-5 text-xs text-textSecondary">
            {strength.feedback.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {biometricAvailable ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enableBiometric} onChange={(event) => setEnableBiometric(event.target.checked)} />
              Enable biometric unlock (Windows Hello / Touch ID)
            </label>
          ) : null}
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
          disabled={!strength.isStrong || password !== confirmPassword || !password}
          onClick={() => onCreate(password, enableBiometric)}
        >
          Create Secure Profile
        </button>
      </div>
    </div>
  );
}
