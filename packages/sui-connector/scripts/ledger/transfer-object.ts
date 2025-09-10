import { generateTransactionData } from "./generate-transaction-data";

const OBJECT_ID_TO_TRANSFER = "0xe6d8c0181883f4892154c8702743c4107933202680be21b2f1a7c8bf0488f38f";
const DESTINATION_ADDRESS = "0x267476be4ee60b4f93682cd41660d18cac33ef11d4cc50bf1241b707549e4e83";

void generateTransactionData((tx) =>
  tx.transferObjects([OBJECT_ID_TO_TRANSFER], DESTINATION_ADDRESS)
);
