import { useState } from 'react';

export function PasswordGenerator({ onGenerate }: { onGenerate: (length: number) => Promise<string> }) {
  const [length, setLength] = useState(16);
  const [value, setValue] = useState('');

  return (
    <div className="rounded-lg border border-borderColor bg-bgSecondary p-3 text-sm">
      <h2 className="mb-2 font-semibold">Password Generator</h2>
      <input type="range" min={12} max={64} value={length} onChange={(event) => setLength(Number(event.target.value))} />
      <span className="ml-2">{length}</span>
      <button type="button" className="ml-2 rounded bg-accent px-2 py-1 text-white" onClick={async () => setValue(await onGenerate(length))}>Generate</button>
      {value ? <p className="mt-2 rounded bg-bgPrimary p-2 font-mono text-xs">{value}</p> : null}
    </div>
  );
}
