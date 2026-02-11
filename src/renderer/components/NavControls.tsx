import { ArrowLeft, ArrowRight, Home, LoaderCircle, RotateCw } from 'lucide-react';

interface NavControlsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
}

const buttonClass = 'rounded-lg border border-borderColor bg-bgSecondary p-2 text-textPrimary transition-all duration-150 hover:bg-bgTertiary disabled:cursor-not-allowed disabled:opacity-40';

export function NavControls({ canGoBack, canGoForward, isLoading, onBack, onForward, onReload, onHome }: NavControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onBack} disabled={!canGoBack} className={buttonClass} aria-label="Back">
        <ArrowLeft size={16} />
      </button>
      <button type="button" onClick={onForward} disabled={!canGoForward} className={buttonClass} aria-label="Forward">
        <ArrowRight size={16} />
      </button>
      <button type="button" onClick={onReload} className={buttonClass} aria-label="Reload">
        {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : <RotateCw size={16} />}
      </button>
      <button type="button" onClick={onHome} className={buttonClass} aria-label="Home">
        <Home size={16} />
      </button>
    </div>
  );
}
