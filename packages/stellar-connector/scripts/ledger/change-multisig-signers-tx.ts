import { RedstoneCommon } from "@redstone-finance/utils";
import { BASE_FEE, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { MULTISIG_ADDRESS } from "../consts";
import { makeServer } from "../utils";

const OLD_SIGNERS: string[] = ["GC3SPTXTBBHJ3VSKTBDLFU72D5E3X6JNDXIRUHDF5UQGE3XCWEHQDTYA"];
const NEW_SIGNERS: string[] = ["GBNEE26DABY5N325YQTO7LGK3CLLY7QS2OW5HC3J55FI5SN45WUCAJ35"];
const TIMEOUT_SEC = RedstoneCommon.hourToSecs(24);

async function changeMultisigSignersTx(
  multisigAddress: string,
  oldSigners: string[],
  newSigners: string[]
) {
  const server = makeServer();
  const multisigAccount = await server.getAccount(multisigAddress);

  const txBuilder = new TransactionBuilder(multisigAccount, {
    fee: BASE_FEE,
    networkPassphrase: (await server.getNetwork()).passphrase,
  });

  newSigners.forEach((signerKey) => {
    txBuilder.addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: signerKey,
          weight: 1,
        },
      })
    );
  });

  oldSigners.forEach((signerKey) => {
    txBuilder.addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: signerKey,
          weight: 0, // weight 0 removes the signer
        },
      })
    );
  });

  const tx = txBuilder.setTimeout(TIMEOUT_SEC).build();

  console.log(tx.toEnvelope().toXDR("hex"));
}

void changeMultisigSignersTx(MULTISIG_ADDRESS, OLD_SIGNERS, NEW_SIGNERS);
