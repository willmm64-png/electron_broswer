import { Lock } from 'lucide-react';
import { LoginScreen } from './LoginScreen';

interface Props {
  biometricVisible: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onBiometricUnlock: () => Promise<boolean>;
}

export function LockScreen({ biometricVisible, onUnlock, onBiometricUnlock }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md">
      <div className="absolute left-1/2 top-24 flex -translate-x-1/2 items-center gap-2 rounded-full border border-borderColor bg-bgSecondary px-4 py-2">
        <Lock size={16} /> Browser Locked
      </div>
      <LoginScreen biometricVisible={biometricVisible} onLogin={onUnlock} onBiometric={onBiometricUnlock} />
    </div>
  );
}
