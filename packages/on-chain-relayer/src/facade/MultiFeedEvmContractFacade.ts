import { MultiFeedAdapterWithoutRounds } from "../../typechain-types";
import { RelayerConfig } from "../index";
import { getLastRoundParamsFromContractMultiFeed } from "../multi-feed/args/get-last-round-params";
import { getMultiFeedIterationArgs } from "../multi-feed/args/get-multi-feed-iteration-args";
import { addExtraFeedsToUpdateParams } from "../multi-feed/gas-optimization/add-extra-feeds";
import {
  ContractData,
  IterationArgs,
  MultiFeedUpdatePricesArgs,
  ShouldUpdateContext,
} from "../types";
import { EvmContractFacade } from "./EvmContractFacade";

export class MultiFeedEvmContractFacade extends EvmContractFacade<MultiFeedAdapterWithoutRounds> {
  override async getIterationArgs(
    context: ShouldUpdateContext,
    relayerConfig: RelayerConfig
  ) {
    return await getMultiFeedIterationArgs(this, context, relayerConfig);
  }

  async getLastRoundParamsFromContract(
    blockTag: number,
    _relayerConfig: RelayerConfig
  ): Promise<ContractData> {
    return await getLastRoundParamsFromContractMultiFeed(
      this.adapterContract,
      blockTag
    );
  }

  override addExtraFeedsToUpdateParams(
    iterationArgs: IterationArgs
  ): { message: string; args?: unknown[] }[] {
    const messages = super.addExtraFeedsToUpdateParams(iterationArgs);

    messages.push({
      message: "Data feeds that require update:",
      args: [
        (iterationArgs.args as MultiFeedUpdatePricesArgs).dataFeedsToUpdate,
      ],
    });
    const message = addExtraFeedsToUpdateParams(
      iterationArgs.args as MultiFeedUpdatePricesArgs
    );
    messages.push({ message });
    messages.push({
      message: "Data feeds to be updated:",
      args: [
        (iterationArgs.args as MultiFeedUpdatePricesArgs).dataFeedsToUpdate,
      ],
    });

    return messages;
  }
}
