import type { VaultEntry } from '@/shared/types';

export function PasswordItem({ entry, onDelete }: { entry: VaultEntry; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded bg-bgPrimary px-2 py-1 text-xs">
      <div>
        <div>{entry.domain}</div>
        <div className="text-textSecondary">{entry.username}</div>
      </div>
      <button type="button" onClick={() => onDelete(entry.id)}>Delete</button>
    </div>
  );
}
