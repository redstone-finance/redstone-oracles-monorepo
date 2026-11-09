export function toReadableNumber(number: number | string | bigint, decimals: number = 18) {
  return Number(number) / 10 ** decimals;
}
