const { ethers } = require("ethers");

main();

function main() {
  const myArgs = process.argv.slice(2);
  const privateKey = myArgs[0];
  const wallet = new ethers.Wallet(privateKey);
  const publicKey = wallet.publicKey;
  const address = wallet.address;
  console.log({
    privateKey,
    publicKey,
    address,
  });
}
