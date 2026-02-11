import type { BlockedItem } from '@/shared/types';

export function BlockedTracker({ items }: { items: BlockedItem[] }) {
  return (
    <section className="rounded-lg border border-borderColor bg-bgSecondary p-3 text-xs">
      <h2 className="mb-2 text-sm font-semibold">Blocked Items</h2>
      <ul className="max-h-36 overflow-auto">
        {items.slice(0, 20).map((item) => (
          <li key={item.id} className="truncate">{item.domain} • {item.type} • {item.reason}</li>
        ))}
      </ul>
    </section>
  );
}
