import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { mockSignedDataPackageObjects } from "../tests-common";

const singedDataPackageObj = mockSignedDataPackageObjects;

const getDataPackageResponse = (dataFeedId: string) =>
  singedDataPackageObj
    .filter((obj) => obj.dataPoints.filter((dp) => dp.dataFeedId === dataFeedId).length > 0)
    .map((obj) => ({
      ...obj,
      dataFeedId,
    }));

const getValidDataPackagesResponse = () => ({
  ETH: getDataPackageResponse("ETH"),
  BTC: getDataPackageResponse("BTC"),
});

const getInvalidDataPackagesResponse = () => ({
  ETH: getDataPackageResponse("ETH").map((obj) => ({
    ...obj,
    dataPoints: [{ ...obj.dataPoints[0], value: 1 }],
  })),
  BTC: getDataPackageResponse("BTC").map((obj) => ({
    ...obj,
    dataPoints: [{ ...obj.dataPoints[0], value: 1 }],
  })),
});

const handlers = [
  "/v2/data-packages/latest/*",
  "/v2/data-packages/latest-by-data-feeds/*",
  "/data-packages/latest/*",
  "/data-packages/latest-by-data-feeds/*",
].flatMap((path) => [
  http.get(`http://valid-cache.com${path}`, () =>
    HttpResponse.json(getValidDataPackagesResponse())
  ),
  http.get(`http://invalid-cache.com${path}`, () =>
    HttpResponse.json(getInvalidDataPackagesResponse())
  ),
  http.get(`http://slower-cache.com${path}`, async () => {
    await delay(200);

    return HttpResponse.json(getValidDataPackagesResponse());
  }),
]);

export const server = setupServer(...handlers);
