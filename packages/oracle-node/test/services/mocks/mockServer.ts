import { rest } from "msw";
import { setupServer } from "msw/node";

const validDenResponse = {
  state: {
    nodes: {
      mockArAddress: {
        dataFeedId: "testDataFeedId",
      },
    },
    dataFeeds: {
      testDataFeedId: {
        manifestTxId: "manifestTxIdByDen",
      },
    },
  },
};

const validArweaveResponse = {
  interval: 1000,
};

const validDenHandlers = [
  rest.get("https://d2rkt3biev1br2.cloudfront.net/state", (_, res, ctx) => {
    return res(ctx.json(validDenResponse));
  }),
  rest.get("https://arweave.net/manifestTxIdByDen", (_, res, ctx) => {
    return res(ctx.json(validArweaveResponse));
  }),
];

export const invalidDenHandlers = [
  rest.get("https://d2rkt3biev1br2.cloudfront.net/state", (_, res, ctx) => {
    return res(ctx.status(400));
  }),
  rest.get("https://arweave.net/manifestTxIdByGateway", (_, res, ctx) => {
    return res(ctx.json(validArweaveResponse));
  }),
];

export const timeoutDenHandlers = [
  rest.get("https://d2rkt3biev1br2.cloudfront.net/state", (_, res, ctx) => {
    return res(ctx.delay(10), ctx.json(validDenResponse));
  }),
  rest.get("https://arweave.net/manifestTxIdByGateway", (_, res, ctx) => {
    return res(ctx.json(validArweaveResponse));
  }),
];

export const invalidArweaveHandlers = [
  rest.get("https://d2rkt3biev1br2.cloudfront.net/state", (_, res, ctx) => {
    return res(ctx.json(validDenResponse));
  }),
  rest.get("https://arweave.net/manifestTxIdByDen", (_, res, ctx) => {
    return res(ctx.status(400));
  }),
];

export const timeoutArweaveHandlers = [
  rest.get("https://d2rkt3biev1br2.cloudfront.net/state", (_, res, ctx) => {
    return res(ctx.json(validDenResponse));
  }),
  rest.get("https://arweave.net/manifestTxIdByDen", (_, res, ctx) => {
    return res(ctx.delay(10), ctx.json(validArweaveResponse));
  }),
];

const streamrHandlers = [
  rest.post("https://streamr.network/api/v1/login/response", (_, res) => {
    return res();
  }),
];

export const server = setupServer(...validDenHandlers, ...streamrHandlers);
