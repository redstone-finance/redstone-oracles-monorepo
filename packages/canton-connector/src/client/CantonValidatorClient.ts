import { RedstoneCommon } from "@redstone-finance/utils";

const HEADERS = { "Content-Type": "application/json" };
const MAX_RETRIES = 3;

type SendCCResponse = Record<string, unknown>;

type PrepareSendResponse = {
  transaction: string;
  tx_hash: string;
  transfer_command_contract_id_prefix: string;
  hashing_details?: string;
};

type SubmitSendResponse = {
  update_id: string;
};

type SetupProposalResponse = {
  contract_id: string;
};

type PrepareAcceptResponse = {
  transaction: string;
  tx_hash: string;
};

type SubmitAcceptResponse = {
  update_id: string;
};

export class CantonValidatorClient {
  constructor(
    private readonly validatorApiUrl: string,
    private readonly tokenProvider: () => Promise<string>
  ) {}

  async sendCC(receiverPartyId: string, amount: number, deduplicationId?: string) {
    return await this.post<SendCCResponse>("/v0/wallet/transfer-preapproval/send", {
      receiver_party_id: receiverPartyId,
      amount: amount.toString(),
      deduplication_id: deduplicationId ?? `send-cc-${Date.now()}`,
    });
  }

  async prepareSend(
    senderPartyId: string,
    receiverPartyId: string,
    amount: number,
    expiresAt: Date,
    nonce: number
  ): Promise<PrepareSendResponse> {
    return await this.post<PrepareSendResponse>(
      "/v0/admin/external-party/transfer-preapproval/prepare-send",
      {
        sender_party_id: senderPartyId,
        receiver_party_id: receiverPartyId,
        amount: amount.toString(),
        expires_at: expiresAt.toISOString(),
        nonce,
      }
    );
  }

  async submitSend(
    partyId: string,
    transaction: string,
    signedTxHash: string,
    publicKey: string
  ): Promise<SubmitSendResponse> {
    return await this.post<SubmitSendResponse>(
      "/v0/admin/external-party/transfer-preapproval/submit-send",
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

  async setupProposal(userPartyId: string): Promise<SetupProposalResponse> {
    return await this.post<SetupProposalResponse>("/v0/admin/external-party/setup-proposal", {
      user_party_id: userPartyId,
    });
  }

  async prepareAccept(contractId: string, userPartyId: string): Promise<PrepareAcceptResponse> {
    return await this.post<PrepareAcceptResponse>(
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
    return await this.post<SubmitAcceptResponse>(
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

  private async authHeaders() {
    const token = await this.tokenProvider();

    return { ...HEADERS, Authorization: `Bearer ${token}` };
  }

  private async post<T>(path: string, body: object) {
    const { data } = await RedstoneCommon.axiosPostWithRetries<T>(
      `${this.validatorApiUrl}${path}`,
      body,
      { maxRetries: MAX_RETRIES, headers: await this.authHeaders() }
    );

    return data;
  }
}
