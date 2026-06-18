import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonApi } from "./CantonApi";

const DEFAULT_HEADERS = { "Content-Type": "application/json" };
const MAX_RETRIES = 3;

type UserStatusResponse = {
  party_id: string;
  user_onboarded: boolean;
  user_wallet_feature_app_right: boolean;
};

type SetupProposalResponse = {
  contract_id: string;
};

type SetupProposalListItem = {
  contract_id: string;
  user_party_id: string;
};

type PrepareAcceptResponse = {
  transaction: string;
  tx_hash: string;
};

type SubmitAcceptResponse = {
  update_id: string;
};

export class CantonValidatorClient {
  constructor(private readonly api: ValidatorCantonApi) {}

  async getWalletPartyId(): Promise<string> {
    const { party_id } = await this.api.get<UserStatusResponse>("/v0/wallet/user-status");

    return party_id;
  }

  async createWalletTransferPreapproval() {
    return await this.api.post<{ contract_id: string }>("/v0/wallet/transfer-preapproval", {});
  }

  async lookupTransferPreapproval(receiverPartyId: string): Promise<string | undefined> {
    try {
      const { transfer_preapproval } = await this.api.get<{
        transfer_preapproval: { contract: { contract_id: string } };
      }>(`/v0/admin/transfer-preapprovals/by-party/${encodeURIComponent(receiverPartyId)}`);

      return transfer_preapproval.contract.contract_id;
    } catch (e) {
      const inner: unknown = e instanceof AggregateError ? e.errors[0] : e;
      const status = (inner as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        return undefined;
      }

      throw e;
    }
  }

  async listSetupProposals(): Promise<SetupProposalListItem[]> {
    const { contracts } = await this.api.get<{
      contracts: { contract: { contract_id: string; payload: { user: string } } }[];
    }>("/v0/admin/external-party/setup-proposal");

    return contracts.map(({ contract }) => ({
      contract_id: contract.contract_id,
      user_party_id: contract.payload.user,
    }));
  }

  async setupProposal(userPartyId: string): Promise<SetupProposalResponse> {
    return await this.api.post<SetupProposalResponse>("/v0/admin/external-party/setup-proposal", {
      user_party_id: userPartyId,
    });
  }

  async prepareAccept(contractId: string, userPartyId: string): Promise<PrepareAcceptResponse> {
    return await this.api.post<PrepareAcceptResponse>(
      "/v0/admin/external-party/setup-proposal/prepare-accept",
      { contract_id: contractId, user_party_id: userPartyId }
    );
  }

  async submitAccept(
    partyId: string,
    transaction: string,
    signedTxHash: string,
    publicKey: string
  ): Promise<SubmitAcceptResponse> {
    return await this.api.post<SubmitAcceptResponse>(
      "/v0/admin/external-party/setup-proposal/submit-accept",
      {
        submission: {
          party_id: partyId,
          transaction,
          signed_tx_hash: signedTxHash,
          public_key: publicKey,
        },
      }
    );
  }
}

export class ValidatorCantonApi extends CantonApi {
  async get<T>(path: string) {
    const { data } = await RedstoneCommon.axiosGetWithRetries<T>(`${this.baseUrl}${path}`, {
      maxRetries: MAX_RETRIES,
      headers: await this.authHeaders(),
    });

    return data;
  }

  async post<T>(path: string, body: object) {
    const { data } = await RedstoneCommon.axiosPostWithRetries<T>(`${this.baseUrl}${path}`, body, {
      maxRetries: MAX_RETRIES,
      headers: await this.authHeaders(),
    });

    return data;
  }

  private async authHeaders() {
    if (!this.tokenProvider) {
      return DEFAULT_HEADERS;
    }

    const token = await this.tokenProvider();

    return { ...DEFAULT_HEADERS, Authorization: `Bearer ${token}` };
  }
}
