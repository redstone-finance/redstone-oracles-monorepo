import { stringify } from "../common";
import { loggerFactory } from "../logger";

export type Operation = () => Promise<void>;
export type QueueEntry<T = string> = { id: T; operation: Operation; timestamp: number };

export class OperationQueue<T = string> {
  protected queue: QueueEntry<T>[] = [];
  private isProcessing = false;
  private activeOperations = new Set<T>();

  constructor(protected logger = loggerFactory("operation-queue")) {}

  enqueue(newId: T, operation: Operation, canAddWhenIsRunning = false) {
    const existingOperationIndex = this.queue.findIndex((op) => this.conforms(op.id, newId));
    const stringifiedNewId = stringify(newId);

    if (existingOperationIndex !== -1) {
      const currentEntry = this.queue[existingOperationIndex];
      const previousEntry = { ...currentEntry };
      const previousId = stringify(previousEntry.id);

      currentEntry.operation = operation;
      currentEntry.id = newId;

      const suffix = previousId === stringifiedNewId ? "" : ` with [${stringifiedNewId}]`;
      this.logger.debug(
        `Replaced operation #${existingOperationIndex} [${previousId}]${suffix} in the queue.`,
        {
          previousEntry: this.expandQueueEntry(previousEntry),
          currentEntry: this.expandQueueEntry(currentEntry),
        }
      );
      this.purge(existingOperationIndex, newId);

      return true;
    } else if (
      !canAddWhenIsRunning &&
      this.activeOperations.keys().some((opId) => this.conforms(opId, newId, true))
    ) {
      this.logger.debug(
        `Operation for [${stringifiedNewId}] is currently processing and cannot be replaced.`
      );

      return false;
    } else {
      this.queue.push({ id: newId, operation, timestamp: Date.now() });
      this.logger.debug(
        `Added operation #${this.queue.length - 1} for [${stringifiedNewId}] to the queue.`
      );

      void this.processQueue();

      return true;
    }
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  protected expandQueueEntry(entry: QueueEntry<T>, now = Date.now()) {
    return { id: stringify(entry.id), age: now - entry.timestamp };
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  protected conforms(oldId: T, newId: T, _strict = false) {
    return oldId === newId;
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  protected purge(_replacedOperationIndex: number, _id: T) {
    // nop
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      this.logger.debug(
        `Queue length: ${this.queue.length}`,
        {
          ids: this.queue.map((q) => `${stringify(q.id)}`).join(", "),
        },
        {
          length: this.queue.length,
          entries: this.queue.map((entry) => this.expandQueueEntry(entry, now)),
        }
      );
      const entry = this.queue.shift()!;
      const { id, operation } = entry;
      const stringifiedId = stringify(id);
      this.activeOperations.add(id);
      try {
        this.logger.debug(`Running for [${stringifiedId}]`, {
          entry: this.expandQueueEntry(entry),
        });
        await operation();
      } catch (error) {
        this.logger.error(`Operation for [${stringifiedId}] failed:`, error);
      } finally {
        this.activeOperations.delete(id);
      }
    }

    this.isProcessing = false;
  }
}
