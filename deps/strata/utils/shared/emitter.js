// shared/emitter.js
// The canonical Emitter — the single shared copy of the project's minimal typed
// publish/subscribe. Previously duplicated inline (gestures) and in the media
// engine's utils.js; consolidated here so exactly one definition exists. This is
// the superset of the former copies (it keeps `once`/`has`), so every previous
// consumer's behavior is preserved unchanged. Bottom layer: imports nothing.
//
// Deliberately tiny — no wildcards, no priorities, no async. Handlers fire
// synchronously in subscription order. `emit` iterates a *copy* of the handler
// list so a handler may subscribe/unsubscribe (including itself) mid-dispatch
// without corrupting the walk or skipping a sibling.
//
// `on` returns an unsubscribe function so callers never need to retain the
// handler reference to detach it.

export class Emitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._handlersByEventName = new Map();
  }

  /**
   * Subscribe to a named event.
   * @param {string} eventName
   * @param {(payload: any) => void} handler
   * @returns {() => void} unsubscribe
   */
  on(eventName, handler) {
    let handlers = this._handlersByEventName.get(eventName);
    if (!handlers) {
      handlers = new Set();
      this._handlersByEventName.set(eventName, handlers);
    }
    handlers.add(handler);
    return () => this.off(eventName, handler);
  }

  /**
   * Subscribe for a single dispatch, then auto-unsubscribe.
   * @param {string} eventName
   * @param {(payload: any) => void} handler
   * @returns {() => void} unsubscribe (in case you want to cancel before it fires)
   */
  once(eventName, handler) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  /** Remove a previously-added handler. Safe if it was never added. */
  off(eventName, handler) {
    const handlers = this._handlersByEventName.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) this._handlersByEventName.delete(eventName);
  }

  /**
   * Dispatch `payload` to every handler of `eventName`.
   * @param {string} eventName
   * @param {any} [payload]
   */
  emit(eventName, payload) {
    const handlers = this._handlersByEventName.get(eventName);
    if (!handlers || handlers.size === 0) return;
    // Copy first: a handler may add/remove handlers (or destroy the emitter)
    // while we walk. Without the copy that mutates the live Set mid-iteration.
    for (const handler of [...handlers]) handler(payload);
  }

  /** True if anyone is listening for `eventName` (lets callers skip building a payload). */
  has(eventName) {
    const handlers = this._handlersByEventName.get(eventName);
    return !!handlers && handlers.size > 0;
  }

  /** Drop all handlers (call from destroy()). */
  clear() {
    this._handlersByEventName.clear();
  }
}
