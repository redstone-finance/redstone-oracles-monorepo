import { hexlify } from "ethers/lib/utils";
import { MULTI_SIG_PK_HEXES } from "./const";
import { getMultiSigPublicKey } from "./get-multi-sig-address";

function combineSignatures(pkHexes: string[], signatures: string[]) {
  const multiSigPublicKey = getMultiSigPublicKey(pkHexes);

  const multiSigSignature = multiSigPublicKey.combinePartialSignatures(signatures);
  const multiSigAddress = multiSigPublicKey.toSuiAddress();

  const multiSigPublicKeyHex = hexlify(multiSigPublicKey.toRawBytes());
  console.log(multiSigAddress);

  console.log({
    multiSigSignature,
    multiSigAddress,
    multiSigPublicKeyHex,
  });

  console.log(
    `Then run 'sui client execute-signed-tx --tx-bytes $(cat TRANSACTION_DATA) --signatures ${multiSigSignature}'`
  );

  return multiSigAddress;
}

// Remember that the signatures order should match order of multi-sig-pk-hexes.
// For example:
// MULTI_SIG_PK_HEXES = [pk_0, ..., pk_5] and we have signature from pk_2, pk_4 and pk_5.
// The order of signatures here should be ["sig_2", "sig_4", "sig_5"].
combineSignatures(MULTI_SIG_PK_HEXES, [""]);
