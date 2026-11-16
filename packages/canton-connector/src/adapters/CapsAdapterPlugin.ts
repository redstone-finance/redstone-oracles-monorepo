export interface CapsAdapterPlugin {
  run(): Promise<number | undefined>;
}
