import {
  fetchMetadataFromSeeds,
  mplTokenMetadata,
  updateV1,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  PublicKey,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { clusterApiUrl } from "@solana/web3.js";
import { readCluster } from "../src";
import { readKeypairBytes } from "./utils";

const MINT_ADDRESS = publicKey("token address here");
const NEW_UPDATE_AUTHORITY = publicKey("pda of the multisig here");

async function updateUpdateAuthority(
  mint: PublicKey,
  newUpdateAuthority: PublicKey
) {
  const umi = createUmi(clusterApiUrl(readCluster())).use(mplTokenMetadata());

  const keypairBytes = readKeypairBytes();

  const keypair = umi.eddsa.createKeypairFromSecretKey(keypairBytes);

  const authority = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(authority));

  const initialMetadata = await fetchMetadataFromSeeds(umi, { mint });

  await updateV1(umi, {
    mint,
    authority,
    newUpdateAuthority,
    data: { ...initialMetadata },
  }).sendAndConfirm(umi);
}

void updateUpdateAuthority(MINT_ADDRESS, NEW_UPDATE_AUTHORITY);
