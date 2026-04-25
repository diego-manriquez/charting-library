export type Unsubscribe = () => void;

export class EventEmitter<TPayload> {
  private readonly listeners = new Set<(payload: TPayload) => void>();

  subscribe(listener: (payload: TPayload) => void): Unsubscribe {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(payload: TPayload): void {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
