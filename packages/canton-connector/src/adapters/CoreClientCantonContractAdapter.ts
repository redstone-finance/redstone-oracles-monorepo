import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { ICORE_CLIENT_TEMPLATE_NAME } from "../defs";
import { ActiveContractData, DamlTuple2 } from "../utils";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

const CORE_ACTIVE_CONTRACT_DATA: ActiveContractData = {
  synchronizerId:
    "global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a",
  contractId:
    "002245212e67425ba9e207c5352cb171d7f745fd62fe28ba4e839fba30e6716f9eca12122049a1b0002941486e0cee5408bae362cbd84616ff538ddf778fbcd371ee77f4f4",
  createdEventBlob:
    "CgMyLjEShwUKRQAiRSEuZ0JbqeIHxTUssXHX90X9Yv4ouk6Dn7ow5nFvnsoSEiBJobAAKUFIbgzuVAi642LL2EYW/1ON33ePvNNx7nf09BIQcmVkc3RvbmUtY29yZS12NRpeCkAxOTg2MTllM2NlMTczNTI5MmQxNjhlY2JmMjI3MDcyMGI3YzE3MWJhZjQzYzEwNjdiZGI1OTI5Y2I0NWIyYjIxEgxSZWRTdG9uZUNvcmUaDFJlZFN0b25lQ29yZSLfAWrcAQoXChVCE1JlZFN0b25lQWRhcHRlci0wNDAKXQpbOllSZWRTdG9uZU9yYWNsZU93bmVyOjoxMjIwYTAyNDI3OTdhODRlMWQ4YzQ5MmYxMjU5YjNmODdkNTYxZmNiZGUyZTRiMmNlYmM0NTcyZGRmYzUxNWI0NGMyOApiCmBaXgpcOlpSZWRTdG9uZU9yYWNsZVZpZXdlcjo6MTIyMGEwMjQyNzk3YTg0ZTFkOGM0OTJmMTI1OWIzZjg3ZDU2MWZjYmRlMmU0YjJjZWJjNDU3MmRkZmM1MTViNDRjMjgqWVJlZFN0b25lT3JhY2xlT3duZXI6OjEyMjBhMDI0Mjc5N2E4NGUxZDhjNDkyZjEyNTliM2Y4N2Q1NjFmY2JkZTJlNGIyY2ViYzQ1NzJkZGZjNTE1YjQ0YzI4MlpSZWRTdG9uZU9yYWNsZVZpZXdlcjo6MTIyMGEwMjQyNzk3YTg0ZTFkOGM0OTJmMTI1OWIzZjg3ZDU2MWZjYmRlMmU0YjJjZWJjNDU3MmRkZmM1MTViNDRjMjg5pCFdY3JFBgBCKgomCiQIARIgSPLocvlXCe2ydUyOVcXK0nPOnHPdCZqhEYzTN5mj+wYQHg==",
};
const GET_PRICES_DISCLOSED_CHOICE = "GetPricesDisclosed";

export class CoreClientCantonContractAdapter extends CoreCantonContractAdapter {
  constructor(
    client: CantonClient,
    contractId: string,
    templateId: string,
    private coreActiveContractData = CORE_ACTIVE_CONTRACT_DATA,
    templateName = ICORE_CLIENT_TEMPLATE_NAME
  ) {
    super(client, "", templateId, templateName);

    this.activeContractData = {
      contractId,
      synchronizerId: CORE_ACTIVE_CONTRACT_DATA.synchronizerId,
    };
  }

  override async getPricesFromPayload(paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    const result: DamlTuple2<string[]> = await this.exerciseChoice(
      GET_PRICES_DISCLOSED_CHOICE,
      {
        ...(await CoreCantonContractAdapter.getPayloadArgument(paramsProvider)),
        adapterCid: this.coreActiveContractData.contractId,
      },
      true,
      this.client,
      this.coreActiveContractData
    );

    return result._1.map(CoreCantonContractAdapter.convertDecimalValue);
  }
}
