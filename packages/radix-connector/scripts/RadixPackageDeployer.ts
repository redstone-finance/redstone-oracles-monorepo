import { PackageDeployer, Wallet } from "@atlantis-l/radix-tool";
import { RadixClient } from "../src";

export class RadixPackageDeployer extends RadixClient {
  public async deployPackage(
    wasm: Uint8Array,
    rpd: Uint8Array,
    feeLock: number
  ) {
    const wallet = new Wallet(
      await this.getAccountAddress(),
      this.getPublicKey(),
      this.signer!.getNotarySigner()
    );

    const deployer = new PackageDeployer(this.networkId, wallet);
    deployer.feeLock = `${feeLock}`;

    const result = await deployer.deploy(
      wasm,
      rpd,
      undefined,
      await this.getCurrentEpochNumber()
    );

    console.log(result);

    if (result.status) {
      throw new Error("Deployment failed");
    }

    const transactionId = result.transactionId!;
    await this.waitForCommit(transactionId);

    const output = await this.apiClient.getTransactionDetails(transactionId);
    console.debug(output);

    return (output.values[1] as string[])[0];
  }
}
