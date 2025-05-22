import { hexlify } from "ethers/lib/utils";
import { RedstoneCommon } from "../../src";

export type OneOfTypes = string | number;

export class MockClient {
  calledArgs: OneOfTypes[] = [];

  public property = 12;

  public that: MockClient;

  constructor(
    public ident: number,
    public execTime: number,
    public isFailing: boolean = false
  ) {
    this.that = this;
  }

  async someAsyncFunction(arg: OneOfTypes) {
    this.calledArgs.push(arg);
    await RedstoneCommon.sleep(this.execTime);

    const result = `${this.ident}#${arg}`;
    if (this.isFailing) {
      throw new Error(result);
    }

    return result;
  }

  async someNumberFunction(arg: number) {
    await this.invoke(arg);

    const result = 1000 * arg + this.ident;
    if (this.isFailing) {
      throw new Error(`ERROR: ${result}`);
    }

    return result;
  }

  async someHexFunction(arg: string) {
    await this.invoke(arg);

    const result = arg + hexlify(this.ident).substring(2);
    if (this.isFailing) {
      throw new Error(`ERROR: ${result}`);
    }

    return result;
  }

  protected async invoke(arg: OneOfTypes) {
    this.calledArgs.push(arg);
    if (this.execTime) {
      await RedstoneCommon.sleep(this.execTime);
    }
  }
}
