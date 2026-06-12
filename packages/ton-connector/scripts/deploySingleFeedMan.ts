import { NetworkProvider } from "@ton/blueprint";
import { Cell } from "@ton/core";
import { TonNetwork } from "../src";
import { deploy } from "../src/deploy";
import { SingleFeedManInitData } from "../src/single-feed-man/SingleFeedManInitData";
import { TonSingleFeedManContractDeployer } from "../src/single-feed-man/TonSingleFeedManContractDeployer";
import { TonSingleFeedMan } from "../wrappers/TonSingleFeedMan";

export async function run(provider: NetworkProvider) {
  await deploy(TonSingleFeedMan.getName(), provider, (network: TonNetwork, code: Cell) => {
    return new TonSingleFeedManContractDeployer(
      network,
      code,
      new SingleFeedManInitData("ETH", 1, [
        "0x8BB8F32Df04c8b654987DAaeD53D6B6091e3B774",
        "0xdEB22f54738d54976C4c0fe5ce6d408E40d88499",
        "0x51Ce04Be4b3E32572C4Ec9135221d0691Ba7d202",
        "0xDD682daEC5A90dD295d14DA4b0bec9281017b5bE",
        "0x9c5AE89C4Af6aA32cE58588DBaF90d18a855B6de",
      ])
    );
  });
}
