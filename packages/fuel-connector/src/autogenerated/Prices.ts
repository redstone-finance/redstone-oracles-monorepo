/* Autogenerated file. Do not edit manually. */

/*
  Fuels version: 0.97.0
*/

import type {
  AbstractAddress,
  Account,
  BigNumberish,
  BN,
  Bytes,
  FunctionFragment,
  InvokeFunction,
  Provider,
  StorageSlot,
} from "fuels";
import { Contract, Interface } from "fuels";

import type { Enum, Option, Vec } from "./common";

export type RedStoneContractErrorInput = Enum<{
  TimestampMustBeGreaterThanBefore: [BigNumberish, BigNumberish];
  UpdaterIsNotTrusted: string;
  MinIntervalBetweenUpdatesHasNotPassedYet: [
    BigNumberish,
    BigNumberish,
    BigNumberish,
  ];
}>;
export type RedStoneContractErrorOutput = Enum<{
  TimestampMustBeGreaterThanBefore: [BN, BN];
  UpdaterIsNotTrusted: string;
  MinIntervalBetweenUpdatesHasNotPassedYet: [BN, BN, BN];
}>;
export type RedStoneErrorInput = Enum<{
  EmptyAllowedSigners: [];
  EmptyFeedIds: [];
  SignerCountThresholdToSmall: [];
  DuplicatedSigner: [];
  DuplicatedFeedId: [];
  DuplicatedValueForSigner: [string, BigNumberish];
  SignerNotRecognized: [string, BigNumberish];
  InsufficientSignerCount: [BigNumberish, BigNumberish];
  TimestampOutOfRange: [boolean, BigNumberish, BigNumberish];
  TimestampDifferentThanOthers: [BigNumberish, BigNumberish, BigNumberish];
}>;
export type RedStoneErrorOutput = Enum<{
  EmptyAllowedSigners: [];
  EmptyFeedIds: [];
  SignerCountThresholdToSmall: [];
  DuplicatedSigner: [];
  DuplicatedFeedId: [];
  DuplicatedValueForSigner: [string, BN];
  SignerNotRecognized: [string, BN];
  InsufficientSignerCount: [BN, BN];
  TimestampOutOfRange: [boolean, BN, BN];
  TimestampDifferentThanOthers: [BN, BN, BN];
}>;

export type PricesConfigurables = Partial<{
  SIGNER_COUNT_THRESHOLD: BigNumberish;
  ALLOWED_SIGNERS: [string, string, string, string, string, string];
}>;

const abi = {
  programType: "contract",
  specVersion: "1",
  encodingVersion: "1",
  concreteTypes: [
    {
      type: "(struct std::vec::Vec<u256>, u64)",
      concreteTypeId:
        "e34c2f53d80f2667116e2b1d557ef6e30cf510868fad2bfd788d50d506cd44e0",
      metadataTypeId: 1,
    },
    {
      type: "[b256; 6]",
      concreteTypeId:
        "ba22e94e8d8f51fff1ffb0b61cd199b2386cc65867c2d2793e5c77fb4adad6db",
      metadataTypeId: 7,
    },
    {
      type: "enum common::check::RedStoneContractError",
      concreteTypeId:
        "0356b29f5ddf4c9e28556be346f1259b84e3f4a3e79b005a499a8a7e39aca851",
      metadataTypeId: 10,
    },
    {
      type: "enum redstone::core::errors::RedStoneError",
      concreteTypeId:
        "c35d5ab61b0f170d72f36b2bc3a2e791d577f09fc0f50a1983096340d59ce09a",
      metadataTypeId: 11,
    },
    {
      type: "enum std::option::Option<u256>",
      concreteTypeId:
        "d601d33973e88992430b8137fe37206cc386110534c47d966d6b54014c4f1356",
      metadataTypeId: 12,
      typeArguments: [
        "1b5759d94094368cfd443019e7ca5ec4074300e544e5ea993a979f5da627261e",
      ],
    },
    {
      type: "enum std::option::Option<u64>",
      concreteTypeId:
        "d852149004cc9ec0bbe7dc4e37bffea1d41469b759512b6136f2e865a4c06e7d",
      metadataTypeId: 12,
      typeArguments: [
        "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
      ],
    },
    {
      type: "struct std::bytes::Bytes",
      concreteTypeId:
        "cdd87b7d12fe505416570c294c884bca819364863efe3bf539245fa18515fbbb",
      metadataTypeId: 15,
    },
    {
      type: "struct std::vec::Vec<enum std::option::Option<u256>>",
      concreteTypeId:
        "c976e1cf37e7eb4e2c7ec52fb45b98828666366f0e64e99c5b8dd1683fcf4585",
      metadataTypeId: 18,
      typeArguments: [
        "d601d33973e88992430b8137fe37206cc386110534c47d966d6b54014c4f1356",
      ],
    },
    {
      type: "struct std::vec::Vec<u256>",
      concreteTypeId:
        "742d7b76206a39cfad7eaec9b457390bbd0a92fe1da596db414daa0e4964bf82",
      metadataTypeId: 18,
      typeArguments: [
        "1b5759d94094368cfd443019e7ca5ec4074300e544e5ea993a979f5da627261e",
      ],
    },
    {
      type: "u256",
      concreteTypeId:
        "1b5759d94094368cfd443019e7ca5ec4074300e544e5ea993a979f5da627261e",
    },
    {
      type: "u64",
      concreteTypeId:
        "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
    },
  ],
  metadataTypes: [
    {
      type: "()",
      metadataTypeId: 0,
    },
    {
      type: "(_, _)",
      metadataTypeId: 1,
      components: [
        {
          name: "__tuple_element",
          typeId: 18,
          typeArguments: [
            {
              name: "",
              typeId:
                "1b5759d94094368cfd443019e7ca5ec4074300e544e5ea993a979f5da627261e",
            },
          ],
        },
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
    },
    {
      type: "(_, _)",
      metadataTypeId: 2,
      components: [
        {
          name: "__tuple_element",
          typeId: 8,
        },
        {
          name: "__tuple_element",
          typeId:
            "1b5759d94094368cfd443019e7ca5ec4074300e544e5ea993a979f5da627261e",
        },
      ],
    },
    {
      type: "(_, _)",
      metadataTypeId: 3,
      components: [
        {
          name: "__tuple_element",
          typeId: 8,
        },
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
    },
    {
      type: "(_, _)",
      metadataTypeId: 4,
      components: [
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
    },
    {
      type: "(_, _, _)",
      metadataTypeId: 5,
      components: [
        {
          name: "__tuple_element",
          typeId: 9,
        },
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
    },
    {
      type: "(_, _, _)",
      metadataTypeId: 6,
      components: [
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
        {
          name: "__tuple_element",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
    },
    {
      type: "[_; 6]",
      metadataTypeId: 7,
      components: [
        {
          name: "__array_element",
          typeId: 8,
        },
      ],
    },
    {
      type: "b256",
      metadataTypeId: 8,
    },
    {
      type: "bool",
      metadataTypeId: 9,
    },
    {
      type: "enum common::check::RedStoneContractError",
      metadataTypeId: 10,
      components: [
        {
          name: "TimestampMustBeGreaterThanBefore",
          typeId: 4,
        },
        {
          name: "UpdaterIsNotTrusted",
          typeId: 8,
        },
        {
          name: "MinIntervalBetweenUpdatesHasNotPassedYet",
          typeId: 6,
        },
      ],
    },
    {
      type: "enum redstone::core::errors::RedStoneError",
      metadataTypeId: 11,
      components: [
        {
          name: "EmptyAllowedSigners",
          typeId: 0,
        },
        {
          name: "EmptyFeedIds",
          typeId: 0,
        },
        {
          name: "SignerCountThresholdToSmall",
          typeId: 0,
        },
        {
          name: "DuplicatedSigner",
          typeId: 0,
        },
        {
          name: "DuplicatedFeedId",
          typeId: 0,
        },
        {
          name: "DuplicatedValueForSigner",
          typeId: 2,
        },
        {
          name: "SignerNotRecognized",
          typeId: 3,
        },
        {
          name: "InsufficientSignerCount",
          typeId: 4,
        },
        {
          name: "TimestampOutOfRange",
          typeId: 5,
        },
        {
          name: "TimestampDifferentThanOthers",
          typeId: 6,
        },
      ],
    },
    {
      type: "enum std::option::Option",
      metadataTypeId: 12,
      components: [
        {
          name: "None",
          typeId: 0,
        },
        {
          name: "Some",
          typeId: 13,
        },
      ],
      typeParameters: [13],
    },
    {
      type: "generic T",
      metadataTypeId: 13,
    },
    {
      type: "raw untyped ptr",
      metadataTypeId: 14,
    },
    {
      type: "struct std::bytes::Bytes",
      metadataTypeId: 15,
      components: [
        {
          name: "buf",
          typeId: 16,
        },
        {
          name: "len",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
    },
    {
      type: "struct std::bytes::RawBytes",
      metadataTypeId: 16,
      components: [
        {
          name: "ptr",
          typeId: 14,
        },
        {
          name: "cap",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
    },
    {
      type: "struct std::vec::RawVec",
      metadataTypeId: 17,
      components: [
        {
          name: "ptr",
          typeId: 14,
        },
        {
          name: "cap",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
      typeParameters: [13],
    },
    {
      type: "struct std::vec::Vec",
      metadataTypeId: 18,
      components: [
        {
          name: "buf",
          typeId: 17,
          typeArguments: [
            {
              name: "",
              typeId: 13,
            },
          ],
        },
        {
          name: "len",
          typeId:
            "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
        },
      ],
      typeParameters: [13],
    },
  ],
  functions: [
    {
      inputs: [],
      name: "get_unique_signer_threshold",
      output:
        "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
      attributes: null,
    },
    {
      inputs: [],
      name: "get_version",
      output:
        "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
      attributes: null,
    },
    {
      inputs: [
        {
          name: "feed_ids",
          concreteTypeId:
            "742d7b76206a39cfad7eaec9b457390bbd0a92fe1da596db414daa0e4964bf82",
        },
        {
          name: "payload",
          concreteTypeId:
            "cdd87b7d12fe505416570c294c884bca819364863efe3bf539245fa18515fbbb",
        },
      ],
      name: "get_prices",
      output:
        "e34c2f53d80f2667116e2b1d557ef6e30cf510868fad2bfd788d50d506cd44e0",
      attributes: [
        {
          name: "storage",
          arguments: ["read"],
        },
      ],
    },
    {
      inputs: [],
      name: "read_last_update_block_timestamp",
      output:
        "d852149004cc9ec0bbe7dc4e37bffea1d41469b759512b6136f2e865a4c06e7d",
      attributes: [
        {
          name: "storage",
          arguments: ["read"],
        },
      ],
    },
    {
      inputs: [
        {
          name: "feed_ids",
          concreteTypeId:
            "742d7b76206a39cfad7eaec9b457390bbd0a92fe1da596db414daa0e4964bf82",
        },
      ],
      name: "read_prices",
      output:
        "c976e1cf37e7eb4e2c7ec52fb45b98828666366f0e64e99c5b8dd1683fcf4585",
      attributes: [
        {
          name: "storage",
          arguments: ["read"],
        },
      ],
    },
    {
      inputs: [],
      name: "read_timestamp",
      output:
        "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
      attributes: [
        {
          name: "storage",
          arguments: ["read"],
        },
      ],
    },
    {
      inputs: [
        {
          name: "feed_ids",
          concreteTypeId:
            "742d7b76206a39cfad7eaec9b457390bbd0a92fe1da596db414daa0e4964bf82",
        },
        {
          name: "payload",
          concreteTypeId:
            "cdd87b7d12fe505416570c294c884bca819364863efe3bf539245fa18515fbbb",
        },
      ],
      name: "write_prices",
      output:
        "742d7b76206a39cfad7eaec9b457390bbd0a92fe1da596db414daa0e4964bf82",
      attributes: [
        {
          name: "storage",
          arguments: ["write"],
        },
      ],
    },
  ],
  loggedTypes: [
    {
      logId: "14077507748414560013",
      concreteTypeId:
        "c35d5ab61b0f170d72f36b2bc3a2e791d577f09fc0f50a1983096340d59ce09a",
    },
    {
      logId: "240576027655359646",
      concreteTypeId:
        "0356b29f5ddf4c9e28556be346f1259b84e3f4a3e79b005a499a8a7e39aca851",
    },
  ],
  messagesTypes: [],
  configurables: [
    {
      name: "SIGNER_COUNT_THRESHOLD",
      concreteTypeId:
        "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
      offset: 43448,
    },
    {
      name: "ALLOWED_SIGNERS",
      concreteTypeId:
        "ba22e94e8d8f51fff1ffb0b61cd199b2386cc65867c2d2793e5c77fb4adad6db",
      offset: 43256,
    },
  ],
};

const storageSlots: StorageSlot[] = [
  {
    key: "f70207fd95bebb96e4a11ad8dcc79ae69597edc049c7457d7c65a8c6a07a7f76",
    value: "0000000000000000000000000000000000000000000000000000000000000000",
  },
];

export class PricesInterface extends Interface {
  constructor() {
    super(abi);
  }

  declare functions: {
    get_unique_signer_threshold: FunctionFragment;
    get_version: FunctionFragment;
    get_prices: FunctionFragment;
    read_last_update_block_timestamp: FunctionFragment;
    read_prices: FunctionFragment;
    read_timestamp: FunctionFragment;
    write_prices: FunctionFragment;
  };
}

export class Prices extends Contract {
  static readonly abi = abi;
  static readonly storageSlots = storageSlots;

  declare interface: PricesInterface;
  declare functions: {
    get_unique_signer_threshold: InvokeFunction<[], BN>;
    get_version: InvokeFunction<[], BN>;
    get_prices: InvokeFunction<
      [feed_ids: Vec<BigNumberish>, payload: Bytes],
      [Vec<BN>, BN]
    >;
    read_last_update_block_timestamp: InvokeFunction<[], Option<BN>>;
    read_prices: InvokeFunction<[feed_ids: Vec<BigNumberish>], Vec<Option<BN>>>;
    read_timestamp: InvokeFunction<[], BN>;
    write_prices: InvokeFunction<
      [feed_ids: Vec<BigNumberish>, payload: Bytes],
      Vec<BN>
    >;
  };

  constructor(
    id: string | AbstractAddress,
    accountOrProvider: Account | Provider
  ) {
    super(id, abi, accountOrProvider);
  }
}
