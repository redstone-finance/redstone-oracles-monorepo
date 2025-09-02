import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { BaseDataPackagesController } from "../src/data-packages/base-data-packages.controller";
import { DataPackagesService } from "../src/data-packages/data-packages.service";

jest.mock("../src/config", () => ({
  influxUrl:
    "https://influx-test.example.com/api/v2/write?org=test&bucket=metrics",
  influxToken: "test-token-123",
  env: "dev",
  enableDirectPostingRoutes: true,
}));

const mockTrackBulkRequest = jest.fn();
jest.mock("@redstone-finance/internal-utils", () => ({
  ApiKeysUsageTracker: jest.fn().mockImplementation(() => ({
    trackBulkRequest: mockTrackBulkRequest,
    shutdown: jest.fn(),
  })),
}));

jest.mock("../src/data-packages/data-packages.service", () => {
  const MockedDataPackagesService = jest.fn().mockImplementation(() => ({
    broadcast: jest.fn().mockResolvedValue([]),
  }));

  Object.assign(MockedDataPackagesService, {
    verifyRequester: jest.fn().mockReturnValue("mock-signer-address"),
    prepareReceivedDataPackagesForBulkSaving: jest.fn().mockResolvedValue([]),
  });

  return {
    DataPackagesService: MockedDataPackagesService,
  };
});

class TestDataPackagesController extends BaseDataPackagesController {
  protected readonly allowExternalSigners = false;
}

const createMockRequest = (headers: Record<string, string>): Request =>
  ({
    headers,
    method: "POST",
    url: "/bulk",
    params: {},
    query: {},
    body: {},
  }) as Request;

describe("BaseDataPackagesController API Keys Integration", () => {
  let controller: TestDataPackagesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTrackBulkRequest.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestDataPackagesController],
      providers: [
        {
          provide: DataPackagesService,
          useClass: DataPackagesService,
        },
      ],
    }).compile();

    controller = module.get<TestDataPackagesController>(
      TestDataPackagesController
    );
  });

  describe("API Key Tracking in /bulk endpoint", () => {
    it("should track API key when x-api-key header is present", async () => {
      const mockRequest = createMockRequest({
        "x-api-key": "test-api-key-123",
      });

      const mockBody = {
        dataPackages: [],
        requestSignature: "mock-signature",
      };

      await controller.addBulk(mockBody, mockRequest);

      expect(mockTrackBulkRequest).toHaveBeenCalledWith(
        "test-api-key-123",
        "mock-signer-address"
      );
    });

    it("should not track when x-api-key header is missing", async () => {
      const mockRequest = createMockRequest({});

      const mockBody = {
        dataPackages: [],
        requestSignature: "mock-signature",
      };

      await controller.addBulk(mockBody, mockRequest);

      expect(mockTrackBulkRequest).not.toHaveBeenCalled();
    });

    it("should not track when x-api-key header is empty", async () => {
      const mockRequest = createMockRequest({ "x-api-key": "" });

      const mockBody = {
        dataPackages: [],
        requestSignature: "mock-signature",
      };

      await controller.addBulk(mockBody, mockRequest);

      expect(mockTrackBulkRequest).not.toHaveBeenCalled();
    });

    it("should track different API keys", async () => {
      const mockBody = {
        dataPackages: [],
        requestSignature: "mock-signature",
      };

      const apiKeys = ["api-key-1", "api-key-2", "api-key-3"];

      for (const apiKey of apiKeys) {
        const mockRequest = createMockRequest({ "x-api-key": apiKey });
        await controller.addBulk(mockBody, mockRequest);
      }

      expect(mockTrackBulkRequest).toHaveBeenCalledTimes(3);
      expect(mockTrackBulkRequest).toHaveBeenCalledWith(
        "api-key-1",
        "mock-signer-address"
      );
      expect(mockTrackBulkRequest).toHaveBeenCalledWith(
        "api-key-2",
        "mock-signer-address"
      );
      expect(mockTrackBulkRequest).toHaveBeenCalledWith(
        "api-key-3",
        "mock-signer-address"
      );
    });
  });
});
