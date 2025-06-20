import { hexlify } from "ethers/lib/utils";
import { MULTI_SIG_PK_HEXES } from "./const";
import { getMultiSigPublicKey } from "./get-multi-sig-address";

function combineSignatures(pkHexes: string[], signatures: string[]) {
  const multiSigPublicKey = getMultiSigPublicKey(pkHexes);

  const multiSigSignature =
    multiSigPublicKey.combinePartialSignatures(signatures);
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

combineSignatures(MULTI_SIG_PK_HEXES, [""]);
