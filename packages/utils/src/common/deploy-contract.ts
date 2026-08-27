export type Deployable = DeployedV5 | DeployedV6;
export type DeployableFactory<
  ContractSigner,
  Deployed extends Deployable,
  Args extends unknown[],
> = new (signer?: ContractSigner) => { deploy: (...args: Args) => Promise<Deployed> };

type DeployedV5 = { deployed: () => Promise<unknown>; address: string };
type DeployedV6 = { waitForDeployment: () => Promise<unknown>; getAddress: () => Promise<string> };

export async function deployContractWithSigner<
  ContractSigner,
  Deployed extends Deployable,
  Args extends unknown[],
>(
  Factory: DeployableFactory<ContractSigner, Deployed, Args>,
  signer: ContractSigner | undefined,
  ...args: Args
) {
  return await awaitDeployment(await new Factory(signer).deploy(...args));
}

export async function awaitDeployment<Deployed extends Deployable>(
  contract: Deployed
): Promise<{ contract: Deployed; address: string }> {
  if ("waitForDeployment" in contract) {
    await contract.waitForDeployment();

    return { contract, address: await contract.getAddress() };
  }

  await contract.deployed();

  return { contract, address: contract.address };
}
