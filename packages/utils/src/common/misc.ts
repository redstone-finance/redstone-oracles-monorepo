export function roundToSignificantDigits(num: number, number = 2): number {
  if (num === 0) return 0;

  const d = Math.ceil(Math.log10(num < 0 ? -num : num));
  const power = number - d;
  const magnitude = Math.pow(10, power);
  const shifted = Math.round(num * magnitude);

  return shifted / magnitude;
}

export function getFilenameWithoutExtension(url: string) {
  const filenameWithExtension = url.substring(url.lastIndexOf("/") + 1);

  return filenameWithExtension.split(".").slice(0, -1).join(".");
}

export function getS(value: number, s = "s") {
  return value !== 1 ? s : "";
}

export function stringify<R>(result: R) {
  try {
    return JSON.stringify(result);
  } catch (e) {
    return result !== undefined &&
      result !== null &&
      typeof result.toString === "function"
      ? result.toString()
      : "[Unable to stringify value]";
  }
}
