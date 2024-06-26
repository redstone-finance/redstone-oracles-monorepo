import {
  ContractErrorType,
  CreateDataServiceInputData,
  RedstoneOraclesAction,
  RedstoneOraclesState,
} from "../../types";

declare const ContractError: ContractErrorType;

export const createDataService = (
  state: RedstoneOraclesState,
  action: RedstoneOraclesAction
): { state: RedstoneOraclesState } => {
  const data = action.input.data as CreateDataServiceInputData;

  const isValidData =
    data.id && data.name && data.logo && data.description && data.manifestTxId;

  if (!isValidData) {
    throw new ContractError("Invalid data feed data");
  }

  const { id, ...restData } = data;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (state.dataServices[id]) {
    throw new ContractError(`Data feed with id ${id} already exists`);
  }

  state.dataServices[id] = {
    ...restData,
    admin: action.caller,
  };

  return { state };
};
