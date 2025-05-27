import { PublicKey } from "@solana/web3.js";

export const MAINNET_BOOK = {
  zrodelko: new PublicKey("6FVpTBZQ9sYJUYGJvJtucvSxRcxAHY5NJS1yqRTnf2io"),
  multisig: new PublicKey("5khdVsyvPCDfbz1id1VBFVKHABKQWKrhPYEo4sZGnyfh"),
  multisigVaultPda: new PublicKey(
    "4dqCrMWfio5HU2nsNxAhB1MqcJ1grWFbU7juHR4qUpX1"
  ),
  multisigMembers: [
    new PublicKey(
      Buffer.from(
        "b3cf8140d542beba4ac7b492afbc427a5441e643ff6631c9423ba7892dc2cf96",
        "hex"
      )
    ),
    new PublicKey(
      Buffer.from(
        "c31f0e40ec3c164388a270bf0790f8d3da165d53436019663c8d643051edaab2",
        "hex"
      )
    ),
    new PublicKey(
      Buffer.from(
        "dd8c421c0c5753deea9865e51d6c1c52e9fe28265cc2a06bc841b3a6c48058a2",
        "hex"
      )
    ),
    new PublicKey("E3XSRMLWqYaJf8L7WHfvTq5m1DoP7mD8k9zxb9TpZMmP"),
    new PublicKey("7sUFQsjXX28VttZaKsYfE2kpNjEguav649hbtcnPZZCJ"),
  ],
  adapterAddress: new PublicKey("REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr"),
  adapterProgramDataAddress: new PublicKey(
    "DBojaNYj7iaUscLSwUaUtr7r7NVkz8t8TPyJfYDaD4ia"
  ),
  temporaryHotWallet: new PublicKey(
    "jankv2HfKnTipHzVF82Hgvo8UzNVJwDKNV3mEgp9bBF"
  ),
  temporaryBuffer: new PublicKey(
    "AQB25cqtAG6uwg6KqEdtGoV4rfZbaN64xm37fWf1SCeH"
  ),
  nttProgramDataAccount: new PublicKey(
    "7VgjhKXswj2tRy3dCMYCqHjAJVpEF6AR2PyWXqxWqG8x"
  ),
  nttProgram: new PublicKey("NTTLfv5maZDudMfd9gNjn99dcEgRMY3E5johLyE4Pm2"),
};
