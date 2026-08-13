import { Executor } from "./Executor";
import { FnBox } from "./FnBox";

export class UnsupportedMethodExecutor<R> extends Executor<R> {
  constructor(private readonly reason: string) {
    super();
  }

  override execute(functions: FnBox<R>[]): Promise<R> {
    throw new Error(
      `${functions[0].name} must not be executed through the MultiExecutor: ${this.reason}`
    );
  }
}
