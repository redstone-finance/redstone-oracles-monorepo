import { Manifest } from "../../../src/types";

const validSmartweaveMock = {
  smartweave: {
    contract: (_contractId: string) => ({
      readState: () => Promise.resolve({
        state: {
          nodes: {
            mockArAddress: {
              dataFeedId: "testDataFeedId"
            }
          },
          dataFeeds: {
            testDataFeedId: {
              manifestTxId: "manifestTxIdByGateway"
            }
          }
        }
      })
    })
  }
};

const invalidSmartweaveMock = {
  smartweave: {
    contract: (_contractId: string) => ({
      readState: () => Promise.reject()
    })
  }
};

export const validMockArProxy = {
  getAddress: () => Promise.resolve("mockArAddress"),
  ...validSmartweaveMock,
};

export const invalidMockArProxy = {
  getAddress: () => Promise.resolve("mockArAddress"),
  ...invalidSmartweaveMock,
};

export const oldManifestMock = { txId: "oldManifestTxId" } as Manifest;

export const manifestUsingDenMock = { txId: "manifestTxIdByDen", interval: 1000 };

export const manifestUsingGatewayMock = { txId: "manifestTxIdByGateway", interval: 1000 };
