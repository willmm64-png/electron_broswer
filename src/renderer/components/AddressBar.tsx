import { Lock, Search, TriangleAlert, X } from 'lucide-react';
import { useMemo } from 'react';

import { RefObject } from 'react';

interface AddressBarProps {
  value: string;
  isSecure: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  inputRef?: RefObject<HTMLInputElement>;
}

const isLikelyUrl = (value: string) => value.includes('.') && !value.includes(' ');

export function AddressBar({ value, isSecure, onChange, onSubmit, onClear, inputRef }: AddressBarProps) {
  const suggestion = useMemo(() => {
    if (!value || isLikelyUrl(value)) {
      return null;
    }
    return `Search DuckDuckGo for \"${value}\"`;
  }, [value]);

  return (
    <div className="relative flex-1">
      <div className="flex h-11 items-center gap-2 rounded-xl border border-borderColor bg-bgSecondary px-3 text-textPrimary transition-all duration-150 focus-within:border-accent">
        {isSecure ? <Lock size={16} className="text-success" /> : <TriangleAlert size={16} className="text-warning" />}
        <input
          ref={inputRef}
          className="h-full flex-1 bg-transparent text-sm outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSubmit();
            }
          }}
          placeholder="Search or enter address"
        />
        {value ? (
          <button type="button" onClick={onClear} aria-label="Clear" className="rounded-md p-1 hover:bg-bgTertiary">
            <X size={14} />
          </button>
        ) : null}
      </div>
      {suggestion ? (
        <div className="absolute left-2 right-2 top-12 rounded-lg border border-borderColor bg-bgSecondary px-3 py-2 text-xs text-textSecondary">
          <div className="flex items-center gap-2">
            <Search size={12} />
            {suggestion}
          </div>
        </div>
      ) : null}
    </div>
  );
}
