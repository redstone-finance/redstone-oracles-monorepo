import { generateTransactionData } from "./generate-transaction-data";

const OBJECT_ID_TO_TRANSFER =
  "0xe6d8c0181883f4892154c8702743c4107933202680be21b2f1a7c8bf0488f38f";
const DESTINATION_ADDRESS =
  "0xab1bf56ae7e13625027ee67e028deda37669b9f77f65465db2286c87a6166bcd";

void generateTransactionData((tx) =>
  tx.transferObjects([OBJECT_ID_TO_TRANSFER], DESTINATION_ADDRESS)
);
