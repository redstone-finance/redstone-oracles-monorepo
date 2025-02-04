import { hexlify } from "ethers/lib/utils";
import { RedstoneCommon } from "../../src";

export type OneOfTypes = string | number;

export class MockClient {
  calledArgs: OneOfTypes[] = [];

  constructor(
    protected ident: number,
    protected execTime: number,
    protected isFailing: boolean = false
  ) {}

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
      throw new Error(`${result}`);
    }

    return result;
  }

  async someHexFunction(arg: string) {
    await this.invoke(arg);

    const result = arg + hexlify(this.ident).substring(2);
    if (this.isFailing) {
      throw new Error(`${result}`);
    }

    return result;
  }

  private async invoke(arg: OneOfTypes) {
    this.calledArgs.push(arg);
    if (this.execTime) {
      await RedstoneCommon.sleep(this.execTime);
    }
  }
}
