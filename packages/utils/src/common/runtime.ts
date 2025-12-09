export const isNodeRuntime = () =>
  typeof process !== "undefined" &&
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- add reason here, please
  process.versions?.node !== undefined;
