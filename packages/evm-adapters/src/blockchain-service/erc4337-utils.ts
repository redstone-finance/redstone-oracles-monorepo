import { Interface } from "@ethersproject/abi";
import { Log, TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider";
import { BigNumber } from "@ethersproject/bignumber";
import { hexDataSlice } from "@ethersproject/bytes";
import * as constants from "@ethersproject/constants";
import { consts } from "@redstone-finance/protocol";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";

export type UserOpTx = TransactionResponse & { userOp: { occurrence: number } };

interface DecodedUserOp {
  sender: string;
  callData: string;
  accountGasLimits?: string; // v0.7+ packed verificationGasLimit | callGasLimit
  callGasLimit?: BigNumber; // v0.6
}

interface UserOpEvent {
  sender: string;
  success: boolean;
  actualGasCost: BigNumber;
  actualGasUsed: BigNumber;
}

const ENTRY_POINT_ADDRESSES = new Set([
  "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789", // v0.6
  "0x0000000071727de22e5e9d8baf0edac6f37da032", // v0.7
  "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", // v0.8
]);

const ENTRY_POINT_INTERFACE = new Interface([
  "function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address beneficiary)", // v0.7+
  "function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] ops, address beneficiary)", // v0.6
  "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
]);

const ACCOUNT_INTERFACE = new Interface([
  "function execute(address target, uint256 value, bytes data)",
]);

// accountGasLimits packs verificationGasLimit (first 16 bytes) and callGasLimit (last 16 bytes)
const CALL_GAS_LIMIT_OFFSET_BYTES = 16;

const logger = loggerFactory("erc4337-utils");

export function expandUserOpTxs(tx: TransactionResponse) {
  if (!isEntryPointTx(tx) || !tx.data.includes(consts.REDSTONE_MARKER_HEX_PURE)) {
    return [tx];
  }

  return decodeUserOps(tx)
    .map((op, index, ops) => toUserOpTx(tx, op, countEarlierSenderOps(ops, index)))
    .filter(RedstoneCommon.isDefined);
}

export function isUserOpTx(tx: TransactionResponse): tx is UserOpTx {
  return "userOp" in tx;
}

export function extractUserOpReceipt(tx: UserOpTx, receipt: TransactionReceipt) {
  const sender = tx.from.toLowerCase();
  const result = splitUserOpResults(receipt.logs)
    .filter((op) => op.sender === sender)
    .at(tx.userOp.occurrence);
  if (!result) {
    logger.warn(`Missing UserOperationEvent for ${tx.from} in tx ${tx.hash}; skipping the userOp`);

    return undefined;
  }

  return <TransactionReceipt>{
    ...receipt,
    status: result.success ? 1 : 0,
    gasUsed: result.actualGasUsed,
    effectiveGasPrice: result.actualGasCost.div(result.actualGasUsed),
    logs: result.logs,
  };
}

function isEntryPointTx(tx: TransactionResponse) {
  return !!tx.to && ENTRY_POINT_ADDRESSES.has(tx.to.toLowerCase());
}

function decodeUserOps(tx: { hash: string; data: string }) {
  try {
    const fragment = ENTRY_POINT_INTERFACE.getFunction(hexDataSlice(tx.data, 0, 4));
    const [ops] = ENTRY_POINT_INTERFACE.decodeFunctionData(fragment, tx.data) as [DecodedUserOp[]];

    return ops;
  } catch (e) {
    logger.warn(
      `Failed to decode handleOps calldata of ${tx.hash}: ${RedstoneCommon.stringifyError(e)}`
    );

    return [];
  }
}

function toUserOpTx(tx: TransactionResponse, op: DecodedUserOp, occurrence: number) {
  try {
    const [target, , data] = ACCOUNT_INTERFACE.decodeFunctionData("execute", op.callData) as [
      string,
      unknown,
      string,
    ];

    return <UserOpTx>{
      ...tx,
      from: op.sender,
      to: target,
      data,
      gasLimit: getCallGasLimit(op),
      gasPrice: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
      userOp: { occurrence },
    };
  } catch (e) {
    logger.warn(
      `Failed to decode userOp callData of ${op.sender} in ${tx.hash}: ${RedstoneCommon.stringifyError(e)}`
    );

    return undefined;
  }
}

function getCallGasLimit(op: DecodedUserOp) {
  return (
    op.callGasLimit ??
    BigNumber.from(
      hexDataSlice(op.accountGasLimits ?? constants.HashZero, CALL_GAS_LIMIT_OFFSET_BYTES)
    )
  );
}

function countEarlierSenderOps(ops: DecodedUserOp[], index: number) {
  return ops.slice(0, index).filter((op) => op.sender === ops[index].sender).length;
}

function splitUserOpResults(logs: Log[]) {
  const boundaries = logs
    .map((log, index) => ({ event: tryParseUserOperationEvent(log), index }))
    .filter(isUserOpBoundary);

  return boundaries.map(({ event, index }, i) => ({
    ...event,
    logs: logs
      .slice(i > 0 ? boundaries[i - 1].index + 1 : 0, index)
      .filter((log) => !ENTRY_POINT_ADDRESSES.has(log.address.toLowerCase())),
  }));
}

function isUserOpBoundary(entry: {
  event?: UserOpEvent;
  index: number;
}): entry is { event: UserOpEvent; index: number } {
  return RedstoneCommon.isDefined(entry.event);
}

function tryParseUserOperationEvent(log: Log) {
  if (!ENTRY_POINT_ADDRESSES.has(log.address.toLowerCase())) {
    return undefined;
  }

  try {
    const parsed = ENTRY_POINT_INTERFACE.parseLog(log);
    if (parsed.name !== "UserOperationEvent") {
      return undefined;
    }
    const { sender, success, actualGasCost, actualGasUsed } = parsed.args as unknown as UserOpEvent;

    return { sender: sender.toLowerCase(), success, actualGasCost, actualGasUsed };
  } catch {
    return undefined;
  }
}
