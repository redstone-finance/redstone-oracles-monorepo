import {
  getCurrent,
  getEntityDetailsVaultAggregated,
  transactionCommittedDetails,
  transactionStatus,
  transactionSubmit,
} from "./__mocks__/transactions";
import STATE_MOCK from "./mock_data/state_mock.json";

const TRANSACTION_STATUS_MOCK = { intent_status: "CommittedSuccess" };
const TRANSACTION_SUBMIT_MOCK = { duplicate: false };
const TRANSACTION_COMMITTED_DETAILS_MOCK = transactionCommittedDetailsMock([
  "5c2100",
  "5c21020aa07a1f6b9501000020210201200720000000000000000000000000000000000000000000000000000000353c482368012007200000000000000000000000000000000000000000000000000000084721beb603",
  "5c2100",
]);

export function mockDefaultValues() {
  getEntityDetailsVaultAggregated.mockResolvedValue(STATE_MOCK);
  getCurrent.mockResolvedValue({
    ledger_state: { epoch: 100, state_version: 12345678 },
  });
  transactionSubmit.mockResolvedValue(TRANSACTION_SUBMIT_MOCK);
  transactionStatus.mockResolvedValue(TRANSACTION_STATUS_MOCK);
  transactionCommittedDetails.mockResolvedValue(
    TRANSACTION_COMMITTED_DETAILS_MOCK
  );
}

export function transactionCommittedDetailsMock(values: string[]) {
  return {
    transaction: {
      transaction_status: "CommittedSuccess",
      fee_paid: "1.23",
      receipt: {
        output: values.map((hex) => ({
          hex,
        })),
      },
    },
  };
}
