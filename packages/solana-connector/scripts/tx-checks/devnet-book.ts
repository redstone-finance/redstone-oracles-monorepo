import { PublicKey } from "@solana/web3.js";

export const DEVNET_BOOK = {
  multisig: new PublicKey("J7KrpqfQdP9tD2PRceoHvzkH6YE9cCbSgYWoSe98APqC"),
  multisigVaultPda: new PublicKey(
    "Hfg9jQyDFwd1XK2bfkSf8wJnChTKJgKuWpHRn3Cbak4g"
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
  nttProgram: new PublicKey("NTtmvKU9dYM3hvKJq4tnrAkSRCqb82R6uTGkLUqY66K"),
};
