import { stringify } from "../common";
import { OperationQueue, QueueEntry } from "./OperationQueue";

export class SetOperationQueue extends OperationQueue<Set<string>> {
  protected override conforms(oldId: Set<string>, newId: Set<string>, strict = false) {
    return newId.isSupersetOf(oldId) && (!strict || oldId.isSupersetOf(newId));
  }

  override purge(replacedOperationIndex: number, id: Set<string>) {
    for (let i = this.queue.length - 1; i > replacedOperationIndex; i--) {
      const idToRemove = this.queue[i].id;
      if (this.conforms(idToRemove, id)) {
        this.queue.splice(i, 1);
        this.logger.debug(`Removed operation #${i} [${stringify(idToRemove)} from the queue`);
      }
    }
  }

  protected override expandQueueEntry(entry: QueueEntry<Set<string>>, now: number = Date.now()) {
    return {
      ...super.expandQueueEntry(entry, now),
      keys: Array.from(entry.id.keys()),
      size: entry.id.size,
    };
  }
}
