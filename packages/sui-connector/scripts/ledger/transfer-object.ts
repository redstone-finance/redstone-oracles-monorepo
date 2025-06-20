import { generateTransactionData } from "./generate-transaction-data";

const OBJECT_ID_TO_TRANSFER =
  "0xe6d8c0181883f4892154c8702743c4107933202680be21b2f1a7c8bf0488f38f";
const DESTINATION_ADDRESS =
  "0xf692064687942408782cbd4ca33bee081852a75c1985082daac1cf27c563bfc9";

void generateTransactionData((tx) =>
  tx.transferObjects([OBJECT_ID_TO_TRANSFER], DESTINATION_ADDRESS)
);
