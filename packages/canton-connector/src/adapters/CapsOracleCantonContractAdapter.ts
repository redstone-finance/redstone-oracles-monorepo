import { utils } from "@redstone-finance/protocol";
import { ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";
import { keccak256, normalizePrivateKey, UniversalSigner } from "@redstone-finance/signing";
import { MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CantonTrafficMeter } from "../tx/CantonTrafficMeter";
import { CantonFeedId } from "../utils/conversions";
import { makeDefinitionFilter } from "../utils/price-feed-utils";
import { combineIntoId } from "../utils/utils";
import { CantonContractAdapterConfig } from "./CantonContractAdapterConfig";
import { CapsAdapterPlugin } from "./CapsAdapterPlugin";
import { CapsRoundHeadCantonContractAdapter } from "./CapsRoundHeadCantonContractAdapter";
import { CapsStateCantonContractAdapter } from "./CapsStateCantonContractAdapter";
import { PricesCantonContractAdapter } from "./PricesCantonContractAdapter";

interface OracleArgument {
  definition: string;
  license: string;
}

interface PayloadArgument {
  feedIds: CantonFeedId[];
  payloadHex: string;
}

interface PublishArgument extends PayloadArgument {
  roundHead: string;
  license: string;
  attestation?: string;
}

interface PublishResult {
  head: string;
}

export const PUBLISH_CHOICE = "RedStoneCapsOracle_Publish";
export const REDSTONE_CAPS_ORACLE_TEMPLATE = "RedStoneCapsOracle:RedStoneCapsOracle";
const ATTESTATION_DOMAIN = "caps-round-attestation-v1";

export class CapsOracleCantonContractAdapter extends PricesCantonContractAdapter {
  private readonly oracleTemplateId: string;
  private readonly stateAdapter: CapsStateCantonContractAdapter;
  private readonly roundHeadAdapter: CapsRoundHeadCantonContractAdapter;
  private readonly plugins: CapsAdapterPlugin[];

  constructor(
    client: CantonClient,
    protected override readonly config: CantonContractAdapterConfig,
    makePlugins: (trafficMeter: CantonTrafficMeter) => CapsAdapterPlugin[]
  ) {
    super(client, config);

    this.oracleTemplateId = combineIntoId(
      client.getDefs().capsOracleId,
      REDSTONE_CAPS_ORACLE_TEMPLATE
    );
    this.stateAdapter = new CapsStateCantonContractAdapter(
      client,
      config.viewerPartyId,
      config.adapterId,
      config.updaterPartyId
    );
    this.roundHeadAdapter = new CapsRoundHeadCantonContractAdapter(
      client,
      config.viewerPartyId,
      config.adapterId,
      config.updaterPartyId
    );
    this.plugins = makePlugins(this.trafficMeter);
  }

  override async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    const contractId = await super.writePricesFromPayloadToContract(
      options ? paramsProvider.copyForFeedIds(options.allFeedIds) : paramsProvider
    );
    void this.runPlugins();

    return contractId;
  }

  override async exerciseWritePricesChoice(actAs: string, argument: PayloadArgument) {
    const {
      contractId,
      createArgument: { license },
    } = await this.fetchOracle();
    const roundHead = await this.roundHeadAdapter.readRoundHead();
    const attestation = this.attest(roundHead.roundNumber + 1, argument.payloadHex);

    const { result, metadata } = await this.client.exerciseChoice<PublishArgument, PublishResult>(
      actAs,
      {
        templateId: this.oracleTemplateId,
        contractId,
        choice: PUBLISH_CHOICE,
        choiceArgument: { roundHead: roundHead.id, license, ...argument, attestation },
      },
      new Date()
    );

    return { result: result.head, metadata };
  }

  protected override async readFeedData(offset?: number) {
    return await this.stateAdapter.readFeedData(offset);
  }

  protected override getCombinedSignatoryContractFilter(signatory = this.config.updaterPartyId) {
    return super.getCombinedSignatoryContractFilter(signatory);
  }

  private async runPlugins() {
    await this.trafficMeter.measureSpending(async () => {
      const { values, errors } = await RedstoneCommon.resolvePromises(
        this.plugins.map((plugin) => plugin.run())
      );
      errors.forEach((error) =>
        this.logger.error(`Plugin failed: ${RedstoneCommon.stringifyError(error)}`)
      );

      return MathUtils.sumBy(values, (paidTrafficCost) => paidTrafficCost ?? 0);
    });
  }

  private async fetchOracle() {
    return await this.client.getActiveTemplateContractData<OracleArgument>(
      this.config.viewerPartyId,
      this.oracleTemplateId,
      makeDefinitionFilter(this.config.adapterId, this.config.updaterPartyId)
    );
  }

  private attest(roundNumber: number, payloadHex: string) {
    const { privateKey } = this.config;
    if (!privateKey) {
      return undefined;
    }

    const dataHash = utils.hexlifyWithout0xPrefix(keccak256(payloadHex));
    const message = keccak256(
      RedstoneCommon.toUtf8Bytes(`${ATTESTATION_DOMAIN}|${roundNumber}|${dataHash}`)
    );

    return utils.hexlifyWithout0xPrefix(
      UniversalSigner.signDigestDer(message, normalizePrivateKey(privateKey))
    );
  }
}
