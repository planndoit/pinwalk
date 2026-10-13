const listeners = new Set<() => void>();

export function emitHarvestRefresh(): void {
  for (const listener of listeners) listener();
}

export function subscribeHarvestRefresh(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
