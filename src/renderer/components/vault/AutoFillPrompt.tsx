export function AutoFillPrompt({ visible, onSave }: { visible: boolean; onSave: () => void }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 right-4 rounded-lg border border-borderColor bg-bgSecondary p-3 text-sm">
      <p>Save credentials to vault?</p>
      <button type="button" className="mt-2 rounded bg-accent px-2 py-1 text-white" onClick={onSave}>Save</button>
    </div>
  );
}
