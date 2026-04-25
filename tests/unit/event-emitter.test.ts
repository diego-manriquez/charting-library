import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "../../src/core/events/event-emitter";

describe("EventEmitter", () => {
  it("notifies subscribed listeners", () => {
    const emitter = new EventEmitter<number>();
    const listener = vi.fn();

    emitter.subscribe(listener);
    emitter.emit(42);

    expect(listener).toHaveBeenCalledWith(42);
  });

  it("stops notifying after unsubscribe", () => {
    const emitter = new EventEmitter<number>();
    const listener = vi.fn();
    const unsubscribe = emitter.subscribe(listener);

    unsubscribe();
    emitter.emit(42);

    expect(listener).not.toHaveBeenCalled();
  });
});
