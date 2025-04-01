/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/price_adapter.json`.
 */
export type PriceAdapter = {
  address: "CvFXyHhjA5QBm1BVMibkZXT12rCq78GZPMzK5tWSagB";
  metadata: {
    name: "priceAdapter";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "price";
      discriminator: [129, 85, 239, 229, 61, 225, 218, 20];
      accounts: [
        {
          name: "priceAccount";
        },
      ];
      args: [
        {
          name: "feedId";
          type: {
            array: ["u8", 32];
          };
        },
      ];
      returns: {
        array: ["u8", 32];
      };
    },
    {
      name: "priceAndTimestamp";
      discriminator: [230, 155, 166, 78, 30, 69, 210, 82];
      accounts: [
        {
          name: "priceAccount";
        },
      ];
      args: [
        {
          name: "feedId";
          type: {
            array: ["u8", 32];
          };
        },
      ];
    },
    {
      name: "timestamp";
      discriminator: [254, 134, 231, 242, 239, 5, 62, 108];
      accounts: [
        {
          name: "priceAccount";
        },
      ];
      args: [
        {
          name: "feedId";
          type: {
            array: ["u8", 32];
          };
        },
      ];
      returns: "u64";
    },
    {
      name: "uniqueSignersCount";
      discriminator: [101, 24, 86, 157, 116, 46, 226, 31];
      accounts: [];
      args: [];
      returns: "u8";
    },
    {
      name: "writePrice";
      discriminator: [16, 186, 120, 224, 118, 178, 161, 152];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "priceAccount";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "feedId";
          type: {
            array: ["u8", 32];
          };
        },
        {
          name: "payload";
          type: "bytes";
        },
      ];
    },
  ];
  accounts: [
    {
      name: "priceData";
      discriminator: [232, 113, 193, 231, 133, 209, 206, 154];
    },
  ];
  types: [
    {
      name: "priceData";
      type: {
        kind: "struct";
        fields: [
          {
            name: "feedId";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "value";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "timestamp";
            type: "u64";
          },
          {
            name: "writeTimestamp";
            type: {
              option: "u64";
            };
          },
        ];
      };
    },
  ];
};
