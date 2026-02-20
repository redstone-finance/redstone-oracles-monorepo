import type { Signature } from "ethers";
import {
  arrayify,
  base64,
  computeAddress,
  concat,
  hexlify,
  joinSignature,
  keccak256,
  SigningKey,
  splitSignature,
} from "ethers/lib/utils";
import {
  DATA_POINT_VALUE_BYTE_SIZE_BS,
  DATA_POINTS_COUNT_BS,
  TIMESTAMP_BS,
} from "../common/redstone-constants";
import { Serializable } from "../common/Serializable";
import { assert, convertIntegerNumberToBytes } from "../common/utils";
import { deserializeDataPointFromObj } from "../data-point/data-point-deserializer";
import { DataPoint, DataPointPlainObj } from "../data-point/DataPoint";
import { UniversalSigner } from "../UniversalSigner";

export interface DataPackagePlainObj {
  dataPoints: DataPointPlainObj[];
  timestampMilliseconds: number;
  dataPackageId: string;
}

const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env ?? {};
const allowUnsafeEmptyDataPackages = env.REDSTONE_ALLOW_UNSAFE_EMPTY_DATA_PACKAGES === "true";
const allowUnsafeDataPackagesWithDuplications =
  env.REDSTONE_ALLOW_UNSAFE_DATA_PACKAGES_WITH_DUPLICATIONS === "true";

export class DataPackage extends Serializable {
  constructor(
    public readonly dataPoints: DataPoint[],
    public readonly timestampMilliseconds: number,
    public readonly dataPackageId: string
  ) {
    super();

    if (dataPoints.length === 0) {
      assert(allowUnsafeEmptyDataPackages, "Empty data packages are not allowed");
    } else {
      const expectedDataPointByteSize = dataPoints[0].getValueByteSize();
      for (const dataPoint of dataPoints) {
        assert(
          dataPoint.getValueByteSize() === expectedDataPointByteSize,
          "Values of all data points in a DataPackage must have the same number of bytes"
        );
      }
    }
  }

  getEachDataPointByteSize() {
    if (this.dataPoints.length === 0) {
      assert(allowUnsafeEmptyDataPackages, "Empty data packages are not allowed");
      return 32;
    }

    return this.dataPoints[0].getValueByteSize();
  }

  toBytes(): Uint8Array {
    return concat([
      this.serializeDataPoints(),
      this.serializeTimestamp(),
      this.serializeDefaultDataPointByteSize(),
      this.serializeDataPointsCount(),
    ]);
  }

  toObj(): DataPackagePlainObj {
    return {
      dataPoints: this.dataPoints.map((dataPoint) => dataPoint.toObj()),
      timestampMilliseconds: this.timestampMilliseconds,
      dataPackageId: this.dataPackageId,
    };
  }

  public static fromObj(plainObject: DataPackagePlainObj): DataPackage {
    const dataPoints = plainObject.dataPoints.map(deserializeDataPointFromObj);
    return new DataPackage(
      dataPoints,
      plainObject.timestampMilliseconds,
      plainObject.dataPackageId
    );
  }

  getSignableHash(): Uint8Array {
    const serializedDataPackage = this.toBytes();
    const signableHashHex = keccak256(serializedDataPackage);
    return arrayify(signableHashHex);
  }

  sign(privateKey: string): SignedDataPackage {
    // Prepare hash for signing
    const signableHashBytes = this.getSignableHash();

    // Generating a signature
    const signingKey = new SigningKey(privateKey);
    const fullSignature = signingKey.signDigest(signableHashBytes);
    // Return a signed data package
    return new SignedDataPackage(this, fullSignature);
  }

  protected serializeDataPoints(): Uint8Array {
    // Sorting dataPoints by bytes32 representation of dataFeedIds lexicographically
    this.dataPoints.sort((dp1, dp2) => {
      const bytes32dataFeedId1Hexlified = hexlify(dp1.serializeDataFeedId());
      const bytes32dataFeedId2Hexlified = hexlify(dp2.serializeDataFeedId());
      const comparisonResult = bytes32dataFeedId1Hexlified.localeCompare(
        bytes32dataFeedId2Hexlified
      );
      assert(
        comparisonResult !== 0 || allowUnsafeDataPackagesWithDuplications,
        `Duplicated dataFeedId found: ${dp1.dataFeedId}`
      );
      return comparisonResult;
    });
    return concat(this.dataPoints.map((dp) => dp.toBytes()));
  }

  protected serializeTimestamp(): Uint8Array {
    return convertIntegerNumberToBytes(this.timestampMilliseconds, TIMESTAMP_BS);
  }

  protected serializeDataPointsCount(): Uint8Array {
    return convertIntegerNumberToBytes(this.dataPoints.length, DATA_POINTS_COUNT_BS);
  }

  protected serializeDefaultDataPointByteSize(): Uint8Array {
    return convertIntegerNumberToBytes(
      this.getEachDataPointByteSize(),
      DATA_POINT_VALUE_BYTE_SIZE_BS
    );
  }
}

export interface SignedDataPackagePlainObj extends DataPackagePlainObj {
  signature: string; // base64-encoded joined signature
}

/**
 * represents data package created by RedStone oracle-node and returned from DDL
 */
export class SignedDataPackage extends Serializable implements SignedDataPackageLike {
  public readonly signature: Signature;

  constructor(
    public readonly dataPackage: DataPackage,
    signature: Signature | string
  ) {
    super();
    if (typeof signature === "string") {
      this.signature = splitSignature(signature);
    } else {
      this.signature = signature;
    }
  }

  serializeSignatureToBytes(): Uint8Array {
    return arrayify(this.serializeSignatureToHex());
  }

  serializeSignatureToHex(): string {
    return joinSignature(this.signature);
  }

  recoverSignerPublicKey(): Uint8Array {
    return recoverSignerPublicKey(this);
  }

  recoverSignerAddress(): string {
    return recoverSignerAddress(this);
  }

  toBytes(): Uint8Array {
    return concat([this.dataPackage.toBytes(), this.serializeSignatureToBytes()]);
  }

  toObj(): SignedDataPackagePlainObj {
    const signatureHex = this.serializeSignatureToHex();

    return {
      ...this.dataPackage.toObj(),
      signature: base64.encode(signatureHex),
    };
  }

  public static fromObj(plainObject: SignedDataPackagePlainObj): SignedDataPackage {
    return SignedDataPackage.fromObjLikeThis(deserializeSignedPackage(plainObject));
  }

  public static fromObjLazy(plainObject: SignedDataPackagePlainObj): SignedDataPackage {
    const dp = new SignedDataPackage(null as unknown as DataPackage, null as unknown as string);
    let decoded: SignedDataPackageLike | undefined;

    Object.defineProperty(dp, "dataPackage", {
      get() {
        decoded ??= SignedDataPackage.fromObj(plainObject);
        return decoded.dataPackage;
      },
    });

    Object.defineProperty(dp, "signature", {
      get() {
        decoded ??= SignedDataPackage.fromObj(plainObject);
        return decoded.signature;
      },
    });

    return dp;
  }

  private static fromObjLikeThis(object: SignedDataPackageLike) {
    return new SignedDataPackage(object.dataPackage, object.signature);
  }
}

export interface SignedDataPackageLike {
  signature: Signature;
  dataPackage: DataPackage;
}

export function deserializeSignedPackage(
  plainObject: SignedDataPackagePlainObj
): SignedDataPackageLike {
  const signatureBase64 = plainObject.signature;
  if (!signatureBase64) {
    throw new Error("Signature can not be empty");
  }
  const signatureBytes: Uint8Array = base64.decode(signatureBase64);
  const parsedSignature = splitSignature(signatureBytes);

  const { signature: _, ...unsignedDataPackagePlainObj } = plainObject;
  const unsignedDataPackage = DataPackage.fromObj(unsignedDataPackagePlainObj);

  return { signature: parsedSignature, dataPackage: unsignedDataPackage };
}

export function recoverSignerPublicKey(object: SignedDataPackageLike): Uint8Array {
  return UniversalSigner.recoverPublicKey(object.dataPackage.getSignableHash(), object.signature);
}

export function recoverSignerAddress(object: SignedDataPackageLike): string {
  const signerPublicKeyBytes = recoverSignerPublicKey(object);

  return computeAddress(signerPublicKeyBytes);
}

export function recoverDeserializedSignerAddress(plainObj: SignedDataPackagePlainObj): string {
  return recoverSignerAddress(deserializeSignedPackage(plainObj));
}
