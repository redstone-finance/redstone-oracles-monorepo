const { ethers } = require("ethers");

main();

function main() {
  const myArgs = process.argv.slice(2);
  const privateKey = myArgs[0];
  const publicKey = new ethers.Wallet(privateKey).publicKey;
  console.log(`Public key for priate key "${privateKey}" is: ${publicKey}`);
}
