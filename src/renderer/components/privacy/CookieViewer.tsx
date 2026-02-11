interface CookieItem {
  domain: string;
  name: string;
  value: string;
  path: string;
  expires: number;
  size: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

interface Props {
  cookies: CookieItem[];
  onDelete: (domain: string, name: string) => void;
  onDeleteAll: () => void;
}

export function CookieViewer({ cookies, onDelete, onDeleteAll }: Props) {
  return (
    <section className="rounded-lg border border-borderColor bg-bgSecondary p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Cookie Viewer</h2>
        <button type="button" className="rounded-md border border-borderColor px-2 py-1 text-xs" onClick={onDeleteAll}>Delete All</button>
      </div>
      <div className="max-h-40 overflow-auto text-xs">
        {cookies.map((cookie) => (
          <div key={`${cookie.domain}-${cookie.name}`} className="mb-1 flex items-center justify-between rounded bg-bgPrimary px-2 py-1">
            <span className="truncate">{cookie.domain} / {cookie.name}</span>
            <button type="button" className="ml-2" onClick={() => onDelete(cookie.domain, cookie.name)}>✕</button>
          </div>
        ))}
      </div>
    </section>
  );
}
