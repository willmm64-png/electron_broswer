import { useState } from 'react';
import type { VaultEntry } from '@/shared/types';
import { PasswordItem } from './PasswordItem';

interface Props {
  entries: VaultEntry[];
  onSave: (entry: VaultEntry) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSearch: (query: string) => Promise<void>;
}

export function PasswordManager({ entries, onSave, onDelete, onSearch }: Props) {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <section className="rounded-lg border border-borderColor bg-bgSecondary p-3">
      <h2 className="mb-2 text-sm font-semibold">Password Vault</h2>
      <div className="mb-2 grid gap-1">
        <input className="rounded bg-bgPrimary px-2 py-1 text-xs" placeholder="URL" value={url} onChange={(event) => setUrl(event.target.value)} />
        <input className="rounded bg-bgPrimary px-2 py-1 text-xs" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
        <input className="rounded bg-bgPrimary px-2 py-1 text-xs" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button type="button" className="rounded bg-accent px-2 py-1 text-xs text-white" onClick={async () => {
          await onSave({ id: crypto.randomUUID(), url, domain: new URL(url).hostname, username, password, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          setUrl(''); setUsername(''); setPassword('');
        }}>Save</button>
      </div>

      <input className="mb-2 w-full rounded bg-bgPrimary px-2 py-1 text-xs" placeholder="Search" onChange={(event) => onSearch(event.target.value)} />
      <div className="max-h-40 space-y-1 overflow-auto">
        {entries.map((entry) => <PasswordItem key={entry.id} entry={entry} onDelete={(id) => onDelete(id).catch(console.error)} />)}
      </div>
    </section>
  );
}
