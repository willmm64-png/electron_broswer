import { useState } from 'react';

interface Props {
  onChange: (oldPassword: string, newPassword: string) => Promise<void>;
}

export function PasswordChange({ onChange }: Props) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');

  return (
    <div className="rounded-lg border border-borderColor bg-bgSecondary p-3">
      <h3 className="font-medium">Change Master Password</h3>
      <div className="mt-2 grid gap-2">
        <input className="rounded-md border border-borderColor bg-bgPrimary px-2 py-1" type="password" placeholder="Current password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} />
        <input className="rounded-md border border-borderColor bg-bgPrimary px-2 py-1" type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      </div>
      <button
        type="button"
        className="mt-2 rounded-md bg-accent px-3 py-1 text-white"
        onClick={async () => {
          try {
            await onChange(oldPassword, newPassword);
            setStatus('Password updated');
            setOldPassword('');
            setNewPassword('');
          } catch {
            setStatus('Unable to change password');
          }
        }}
      >
        Update
      </button>
      {status ? <p className="mt-1 text-xs text-textSecondary">{status}</p> : null}
    </div>
  );
}
