const listeners = new Set<() => void>();

export function emitCrewMapRefresh(): void {
  for (const listener of listeners) listener();
}

export function subscribeCrewMapRefresh(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
