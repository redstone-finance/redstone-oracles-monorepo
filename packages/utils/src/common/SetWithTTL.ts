export class SetWithTTL {
  state = new Map<string, number>();

  get size(): number {
    return this.state.size;
  }

  add(item: string, timestamp: number) {
    if (!this.state.has(item)) {
      this.state.set(item, timestamp);
    }
  }

  has(item: string): boolean {
    return this.state.has(item);
  }

  removeOlderThan(olderThan: number) {
    for (const [key, value] of this.state.entries()) {
      if (value < olderThan) {
        this.state.delete(key);
      }
    }
  }
}
