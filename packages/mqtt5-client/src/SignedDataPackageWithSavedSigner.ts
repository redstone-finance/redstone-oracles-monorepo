import {
  deserializeSignedPackage,
  SignedDataPackage,
  SignedDataPackagePlainObj,
} from "@redstone-finance/protocol";

export class SignedDataPackageWithSavedSigner extends SignedDataPackage {
  packageSigner!: string;

  public static override fromObj(
    plainObject: SignedDataPackagePlainObj
  ): SignedDataPackageWithSavedSigner {
    const deserialized = deserializeSignedPackage(plainObject);

    return new SignedDataPackageWithSavedSigner(deserialized.dataPackage, deserialized.signature);
  }
}
