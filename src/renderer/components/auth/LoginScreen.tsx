import { Fingerprint, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

interface Props {
  biometricVisible: boolean;
  onLogin: (password: string) => Promise<boolean>;
  onBiometric: () => Promise<boolean>;
}

export function LoginScreen({ biometricVisible, onLogin, onBiometric }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[400px] rounded-2xl border border-borderColor bg-bgSecondary p-6 shadow-xl">
        <h1 className="text-center text-2xl font-bold">Privacy Browser</h1>
        <p className="mt-2 text-center text-sm text-textSecondary">Unlock your encrypted profile</p>

        <input
          type="password"
          autoFocus
          className="mt-4 w-full rounded-lg border border-borderColor bg-bgPrimary px-3 py-2"
          placeholder="Master password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={async (event) => {
            if (event.key === 'Enter') {
              setLoading(true);
              const ok = await onLogin(password);
              setLoading(false);
              setError(ok ? '' : 'Authentication failed');
            }
          }}
        />

        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 font-medium text-white"
          onClick={async () => {
            setLoading(true);
            const ok = await onLogin(password);
            setLoading(false);
            setError(ok ? '' : 'Authentication failed');
          }}
        >
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : null}
          Login
        </button>

        {biometricVisible ? (
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-borderColor bg-bgPrimary px-4 py-2"
            onClick={async () => {
              setLoading(true);
              const ok = await onBiometric();
              setLoading(false);
              setError(ok ? '' : 'Biometric authentication failed');
            }}
          >
            <Fingerprint size={16} />
            Use Windows Hello / Touch ID
          </button>
        ) : null}
      </div>
    </div>
  );
}
