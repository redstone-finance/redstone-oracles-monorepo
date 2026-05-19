import { RequestCollector } from "./RequestCollector";

export class CollectorRegistry<TInput, TKey, TResult> {
  private readonly collectors = new Map<string, RequestCollector<TKey, TResult>>();

  constructor(
    private readonly keyOf: (input: TInput) => string,
    private readonly factory: (input: TInput) => RequestCollector<TKey, TResult>
  ) {}

  get(input: TInput) {
    const key = this.keyOf(input);
    let collector = this.collectors.get(key);
    if (!collector) {
      collector = this.factory(input);
      this.collectors.set(key, collector);
    }

    return collector;
  }

  delete(input: TInput) {
    const key = this.keyOf(input);
    this.collectors.get(key)?.dispose();
    this.collectors.delete(key);
  }

  disposeAll() {
    for (const collector of this.collectors.values()) {
      collector.dispose();
    }
    this.collectors.clear();
  }
}
