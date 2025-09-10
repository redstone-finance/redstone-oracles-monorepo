import { ethers } from "ethers";

export interface FullTestSpec {
  "Pull model": Record<string, Nested<PullModelTestCase>>;
  "Push model": Record<string, Nested<PushModelTestCase>>;
}

export type Nested<T> = T | { [title: string]: Nested<T> };

export interface ContractConfiguration {
  authorisedSigners: ethers.Wallet[];
  requiredSignersCount: number;
}

export interface PullModelTestCase {
  isPullModelTestCase: true;
  payloadGenerator: (timestamp: number) => string;
  contractConfiguration: ContractConfiguration;
  requestedDataFeedIds: string[];
  expectedSuccess: boolean;
  expectedValues: number[];
}

export interface PushModelTestCase {
  isPushModelTestCase: true;
  contractConfiguration: ContractConfiguration;
  instructions: PushModelInstruction[];
}

export type PushModelInstruction =
  | PushModelUpdateInstruction
  | PushModelWaitForNewBlockInstruction
  | PushModelWaitInstruction
  | PushModelReadInstruction;

export interface PushModelUpdateInstruction {
  type: "update";
  payloadGenerator: (context: PushModelTestContext) => string;
  dataFeedIds: string[];
  expectedValues: number[];
  expectedSuccess: boolean;
}

export interface PushModelWaitForNewBlockInstruction {
  type: "waitfornewblock";
}

export interface PushModelWaitInstruction {
  type: "wait";
  durationSeconds: number;
}

export type PushModelReadInstruction = {
  type: "read";
  dataFeedIds: string[];
} & ({ expectedSuccess: false } | { expectedSuccess: true; expectedValues: number[] });

export interface PushModelTestContext {
  timestamp: number;
  instructions: PushModelTestContext[];
}
