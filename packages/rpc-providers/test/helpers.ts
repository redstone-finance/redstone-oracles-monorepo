import { BigNumber, Contract, Wallet, providers } from "ethers";
import hardhat from "hardhat";
import Sinon from "sinon";
import { DEFAULT_TX_DELIVERY_OPTS, Eip1559GasEstimator, TxDeliveryOpts } from "../src";
import { Counter } from "../typechain-types";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

type JsonRpcProviderKeys = keyof providers.JsonRpcProvider;
type ToMock = Partial<Record<JsonRpcProviderKeys, providers.JsonRpcProvider[JsonRpcProviderKeys]>>;

export class HardhatProviderMocker {
  constructor(
    public provider: providers.JsonRpcProvider,
    public toMock: ToMock = {}
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- add reason here, please
    const self = this;
    this.provider = new Proxy(provider, {
      get: function (target: providers.JsonRpcProvider, property, receiver) {
        const originalValue = Reflect.get(target, property, receiver) as unknown;
        if (typeof originalValue === "function" && Reflect.has(self.toMock, property)) {
          return function (...args: unknown[]) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any -- add reason here, please
            return (self.toMock as any)[property](...args);
          };
        }
        return originalValue;
      },
      set(_target: providers.JsonRpcProvider, p, newValue) {
        if (p.toString() === "call") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- add reason here, please
          self.set({ ...toMock, call: newValue });
          return true;
        }
        return false;
      },
    });
  }

  reset() {
    this.toMock = {};
  }

  set(toMock: ToMock) {
    this.toMock = toMock;
  }
}

export async function deployCounter(
  provider: providers.Provider,
  multicall3Address = "0x" + "0".repeat(40)
): Promise<Counter> {
  let contractFactory = await hardhat.ethers.getContractFactory("Counter");

  const wallet = new Wallet(TEST_PRIVATE_KEY).connect(provider);
  contractFactory = contractFactory.connect(wallet);
  const contract = await contractFactory.deploy(multicall3Address);
  await contract.deployed();

  return new Contract(contract.address, contract.interface, wallet) as Counter;
}

export function createEip1559TestOpts(
  overrides: Partial<TxDeliveryOpts> = {}
): Required<TxDeliveryOpts> {
  return {
    ...DEFAULT_TX_DELIVERY_OPTS,
    logger: () => undefined,
    ...overrides,
  } as unknown as Required<TxDeliveryOpts>;
}

/**
 * Creates a basic provider mock with eth_feeHistory support
 */
export function createBasicProviderMock(
  baseFee: number,
  priorityFeeHex: string
): HardhatProviderMocker {
  return new HardhatProviderMocker(hardhat.ethers.provider, {
    getBlock: Sinon.stub().resolves({ baseFeePerGas: BigNumber.from(baseFee) }),
    send: Sinon.stub().callsFake((method: string) => {
      if (method === "eth_feeHistory") {
        return { reward: [[priorityFeeHex]] };
      }
      throw new Error(`Unexpected method: ${method}`);
    }),
  });
}

/**
 * Creates a provider mock with eth_feeHistory and eth_maxPriorityFeePerGas fallback support
 */
export function createFallbackProviderMock(
  baseFee: number,
  rewardHex: string,
  fallbackHex: string | null
): HardhatProviderMocker {
  return new HardhatProviderMocker(hardhat.ethers.provider, {
    getBlock: Sinon.stub().resolves({ baseFeePerGas: BigNumber.from(baseFee) }),
    send: Sinon.stub().callsFake((method: string) => {
      if (method === "eth_feeHistory") {
        return { reward: [[rewardHex]] };
      }
      if (method === "eth_maxPriorityFeePerGas") {
        if (fallbackHex === null) {
          throw new Error("Should not call eth_maxPriorityFeePerGas");
        }
        return fallbackHex;
      }
      throw new Error(`Unexpected method: ${method}`);
    }),
  });
}

/**
 * Creates a provider mock that captures percentiles as they are requested
 */
export function createPercentileCaptureProviderMock(
  baseFee: number,
  rewardHex: string,
  captureArray: number[]
): HardhatProviderMocker {
  return new HardhatProviderMocker(hardhat.ethers.provider, {
    getBlock: Sinon.stub().resolves({ baseFeePerGas: BigNumber.from(baseFee) }),
    send: Sinon.stub().callsFake((method: string, params: unknown[]) => {
      if (method === "eth_feeHistory") {
        captureArray.push((params[2] as number[])[0]);
        return { reward: [[rewardHex]] };
      }
      throw new Error(`Unexpected method: ${method}`);
    }),
  });
}

/**
 * Creates an Eip1559GasEstimator with the given options
 */
export function createEip1559Estimator(opts: Partial<TxDeliveryOpts> = {}): Eip1559GasEstimator {
  return new Eip1559GasEstimator(createEip1559TestOpts(opts));
}
