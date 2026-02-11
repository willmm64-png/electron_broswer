interface Props {
  visible: boolean;
}

export function BiometricPrompt({ visible }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="rounded-xl border border-borderColor bg-bgSecondary p-4 text-center">
        <h2 className="text-lg font-medium">Authenticating…</h2>
        <p className="mt-1 text-sm text-textSecondary">Complete biometric verification on your device.</p>
      </div>
    </div>
  );
}
