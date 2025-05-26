import { PublicKey } from "@solana/web3.js";

export const DEVNET_BOOK = {
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
  ],
  adapterAddress: new PublicKey("REDuYsnEucMweattdv4xQCYdU1i8Q2W92kdayrpY9rA"),
};
