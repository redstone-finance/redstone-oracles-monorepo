export type UpdatePricesOptions = {
  canOmitFallbackAfterFailing?: boolean;
  allFeedIds: string[];
  feedAddresses: Record<string, string>;
};
