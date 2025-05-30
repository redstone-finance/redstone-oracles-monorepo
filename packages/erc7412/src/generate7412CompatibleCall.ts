import { EIP7412 } from "erc7412";
import {
  encodeFunctionData,
  parseAbi,
  type Hex,
  type PublicClient,
  type TransactionRequest,
} from "viem";
import { RedstoneAdapter } from "../src/RedstoneERC7412Adapter";

const multicall3Abi = parseAbi([
  "struct Call { address target; bytes callData; }",
  "struct Call3 { address target; bool allowFailure; bytes callData; }",
  "struct Call3Value { address target; bool allowFailure; uint256 value; bytes callData; }",
  "struct Result { bool success; bytes returnData; }",
  "function aggregate(Call[] calldata calls) public payable returns (uint256 blockNumber, bytes[] memory returnData)",
  "function aggregate3(Call3[] calldata calls) public payable returns (Result[] memory returnData)",
  "function aggregate3Value(Call3Value[] calldata calls) public payable returns (Result[] memory returnData)",
]);

// taken from erc7412 package
type ERC7412TransactionRequest = Pick<
  TransactionRequest,
  "to" | "data" | "value"
>;

export async function generate7412CompatibleCall(
  client: PublicClient,
  to: Hex,
  from: Hex,
  callData: Hex,
  multicallAddress: Hex
): Promise<ERC7412TransactionRequest> {
  // function which instructs how to build multicall tx if needed
  function makeMulticall(calls: ERC7412TransactionRequest[]) {
    const ret = encodeFunctionData({
      abi: multicall3Abi,
      functionName: "aggregate3Value",
      args: [
        calls.map((call) => ({
          target: call.to as Hex,
          callData: call.data as Hex,
          allowFailure: false,
          value: call.value ?? 0n,
        })),
      ],
    });

    let totalValue = 0n;
    for (const call of calls) {
      totalValue += call.value ?? 0n;
    }

    return {
      account: from,
      to: multicallAddress,
      data: ret,
      value: totalValue,
    };
  }

  const converter = new EIP7412([new RedstoneAdapter()], makeMulticall);

  // will call static code and pack original tx with price feed update call in single multicall if price is stale
  // do nothing if price is fresh
  return await converter.enableERC7412(client, {
    to,
    data: callData,
  });
}
