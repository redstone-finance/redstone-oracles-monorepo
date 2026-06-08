import { RequestCollector } from "./RequestCollector";

export class CollectorRegistry<Input, Key, Result> {
  private readonly collectors = new Map<string, RequestCollector<Key, Result>>();

  constructor(
    private readonly keyOf: (input: Input) => string,
    private readonly factory: (input: Input) => RequestCollector<Key, Result>
  ) {}

  get(input: Input) {
    const key = this.keyOf(input);
    let collector = this.collectors.get(key);
    if (!collector) {
      collector = this.factory(input);
      this.collectors.set(key, collector);
    }

    return collector;
  }

  delete(input: Input) {
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
