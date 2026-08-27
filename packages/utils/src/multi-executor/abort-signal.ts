type AbortSignalAware = { [ACCEPTS_ABORT_SIGNAL]?: Set<string> };

const ACCEPTS_ABORT_SIGNAL = Symbol.for("redstone.multi-executor.acceptsAbortSignal");

export function withAbortSignal<T extends object>(instance: T, ...methodNames: string[]) {
  const aware = instance as AbortSignalAware;
  aware[ACCEPTS_ABORT_SIGNAL] = new Set([...(aware[ACCEPTS_ABORT_SIGNAL] ?? []), ...methodNames]);

  return instance;
}

export function acceptsAbortSignal(instance: unknown, methodName: string) {
  return (instance as AbortSignalAware)[ACCEPTS_ABORT_SIGNAL]?.has(methodName) ?? false;
}
