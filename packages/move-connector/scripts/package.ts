import {
  AccountAddress,
  Aptos,
  generateTransactionPayload,
  HexInput,
  MoveAbility,
  MoveFunctionId,
  MoveVector,
  TypeTagAddress,
  TypeTagVector,
} from "@aptos-labs/ts-sdk";

function objectCodeDeploymentCall(call: string): MoveFunctionId {
  return `0x1::object_code_deployment::${call}`;
}

export class MovePackageTxBuilder {
  constructor(private readonly aptos: Aptos) {}

  public async objectPublishTx(
    sender: AccountAddress,
    metadata: HexInput,
    code: Array<HexInput>
  ) {
    const moveCode = new MoveVector(code.map(MoveVector.U8));

    return await this.aptos.transaction.build.simple({
      sender: sender,
      data: {
        function: objectCodeDeploymentCall("publish"),
        functionArguments: [MoveVector.U8(metadata), moveCode],
        abi: {
          typeParameters: [],
          parameters: [
            TypeTagVector.u8(),
            new TypeTagVector(TypeTagVector.u8()),
          ],
        },
      },
    });
  }

  public async objectUpgradeTx(
    sender: AccountAddress,
    objectAddress: AccountAddress,
    metadata: HexInput,
    code: Array<HexInput>
  ) {
    const moveCode = new MoveVector(code.map(MoveVector.U8));

    return await this.aptos.transaction.build.simple({
      sender: sender,
      data: {
        function: objectCodeDeploymentCall("upgrade"),
        functionArguments: [MoveVector.U8(metadata), moveCode, objectAddress],
        abi: {
          typeParameters: [],
          parameters: [
            TypeTagVector.u8(),
            new TypeTagVector(TypeTagVector.u8()),
            new TypeTagAddress(),
          ],
        },
      },
    });
  }

  public async objectUpgradeTxPayload(
    multiSigAddress: AccountAddress,
    objectAddress: AccountAddress,
    metadata: HexInput,
    code: Array<HexInput>
  ) {
    const moveCode = new MoveVector(code.map(MoveVector.U8));

    return await generateTransactionPayload({
      multisigAddress: multiSigAddress,
      function: objectCodeDeploymentCall("upgrade"),
      functionArguments: [MoveVector.U8(metadata), moveCode, objectAddress],
      abi: {
        typeParameters: [],
        parameters: [
          TypeTagVector.u8(),
          new TypeTagVector(TypeTagVector.u8()),
          new TypeTagAddress(),
        ],
      },
      aptosConfig: this.aptos.transaction.config,
    });
  }

  public async objectTransferFunction(
    sender: AccountAddress,
    objectAddress: AccountAddress,
    newOwner: AccountAddress
  ) {
    return await this.aptos.transaction.build.simple({
      sender: sender,
      data: {
        function: "0x1::object::transfer",
        functionArguments: [objectAddress, newOwner],
        typeArguments: ["0x1::object::ObjectCore"],
        abi: {
          typeParameters: [{ constraints: [MoveAbility.KEY] }],
          parameters: [new TypeTagAddress(), new TypeTagAddress()],
        },
      },
    });
  }
}
