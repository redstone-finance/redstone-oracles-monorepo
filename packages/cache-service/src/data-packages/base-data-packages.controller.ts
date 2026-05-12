import {
  Body,
  Get,
  Header,
  HttpException,
  HttpStatus,
  OnModuleDestroy,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ApiKeysUsageTracker } from "@redstone-finance/internal-utils";
import type { Request } from "express";
import config from "../config";
import { BulkPostRequestBody, DataPackagesResponse } from "./data-packages.interface";
import { DataPackagesService } from "./data-packages.service";

@UsePipes(new ValidationPipe({ transform: true }))
export abstract class BaseDataPackagesController implements OnModuleDestroy {
  private readonly apiKeysUsageTracker?: ApiKeysUsageTracker;

  constructor(protected readonly dataPackagesService: DataPackagesService) {
    if (config.influxUrl && config.influxToken) {
      this.apiKeysUsageTracker = new ApiKeysUsageTracker({
        influxUrl: config.influxUrl,
        influxToken: config.influxToken,
        serviceName: `cache-service-${config.env}`,
      });
    }
  }

  async onModuleDestroy() {
    await this.apiKeysUsageTracker?.shutdown();
  }

  protected abstract readonly allowExternalSigners: boolean;

  protected static async validateDataServiceId(dataServiceId: string) {
    const isDataServiceIdValid = await DataPackagesService.isDataServiceIdValid(dataServiceId);
    if (!isDataServiceIdValid) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Data service id is invalid",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get("latest/:DATA_SERVICE_ID")
  @Header("Cache-Control", "max-age=5")
  async getAllLatest(
    @Param("DATA_SERVICE_ID") dataServiceId: string
  ): Promise<DataPackagesResponse> {
    await BaseDataPackagesController.validateDataServiceId(dataServiceId);
    return await this.dataPackagesService.getLatestDataPackagesWithSameTimestampWithCache(
      dataServiceId,
      true,
      this.allowExternalSigners
    );
  }

  @Get("latest-not-aligned-by-time/:DATA_SERVICE_ID")
  @Header("Cache-Control", "max-age=5")
  async getMostRecent(
    @Param("DATA_SERVICE_ID") dataServiceId: string
  ): Promise<DataPackagesResponse> {
    await BaseDataPackagesController.validateDataServiceId(dataServiceId);
    return await this.dataPackagesService.getLatestDataPackagesWithCache(
      dataServiceId,
      true,
      this.allowExternalSigners
    );
  }

  @Get("historical/:DATA_SERVICE_ID/:TIMESTAMP")
  @Header("Cache-Control", "max-age=5")
  async getDataPackagesByTimestamp(
    @Param("DATA_SERVICE_ID") dataServiceId: string,
    @Param("TIMESTAMP") timestamp: string
  ): Promise<DataPackagesResponse> {
    if (!config.enableHistoricalDataServing) {
      throw new ServiceUnavailableException(
        `historical/* routes are not enabled in this cache-service configuration`
      );
    }
    await BaseDataPackagesController.validateDataServiceId(dataServiceId);

    return await DataPackagesService.getDataPackagesByTimestamp(
      dataServiceId,
      Number(timestamp),
      true,
      this.allowExternalSigners
    );
  }

  @Get("latest-by-data-feeds/:DATA_SERVICE_ID")
  @Header("Cache-Control", "max-age=1")
  async getLatestByDataFeedIds(
    @Param("DATA_SERVICE_ID") dataServiceId: string,
    @Query("dataFeedIds") dataFeedIdsParam: string | string[]
  ): Promise<DataPackagesResponse> {
    const dataFeedIds = await this.parseAndValidateRequestParams(dataServiceId, dataFeedIdsParam);
    return await this.dataPackagesService.getLatestDataPackagesByFeedIdsWithCache(
      dataServiceId,
      dataFeedIds,
      true,
      this.allowExternalSigners
    );
  }

  @Get("latest-by-data-feeds/:DATA_SERVICE_ID/show-metadata")
  @Header("Cache-Control", "max-age=1")
  async getLatestByDataFeedIdsWithMetadata(
    @Param("DATA_SERVICE_ID") dataServiceId: string,
    @Query("dataFeedIds") dataFeedIdsParam: string | string[],
    @Req() req: Request
  ): Promise<DataPackagesResponse> {
    BaseDataPackagesController.validateMetadataAccess(req);
    const dataFeedIds = await this.parseAndValidateRequestParams(dataServiceId, dataFeedIdsParam);
    return await this.dataPackagesService.getLatestDataPackagesByFeedIdsWithCache(
      dataServiceId,
      dataFeedIds,
      false,
      this.allowExternalSigners
    );
  }

  @Get("historical-by-data-feeds/:DATA_SERVICE_ID/:TIMESTAMP")
  @Header("Cache-Control", "max-age=5")
  async getHistoricalByDataFeedIds(
    @Param("DATA_SERVICE_ID") dataServiceId: string,
    @Param("TIMESTAMP") timestamp: string,
    @Query("dataFeedIds") dataFeedIdsParam: string | string[]
  ): Promise<DataPackagesResponse> {
    if (!config.enableHistoricalDataServing) {
      throw new ServiceUnavailableException(
        `historical/* routes are not enabled in this cache-service configuration`
      );
    }
    const dataFeedIds = await this.parseAndValidateRequestParams(dataServiceId, dataFeedIdsParam);
    return await this.dataPackagesService.getDataPackagesByTimestampAndFeedIds(
      dataServiceId,
      Number(timestamp),
      dataFeedIds,
      true,
      this.allowExternalSigners
    );
  }

  @Get("historical-by-data-feeds/:DATA_SERVICE_ID/:TIMESTAMP/show-metadata")
  @Header("Cache-Control", "max-age=5")
  async getHistoricalByDataFeedIdsWithMetadata(
    @Param("DATA_SERVICE_ID") dataServiceId: string,
    @Param("TIMESTAMP") timestamp: string,
    @Query("dataFeedIds") dataFeedIdsParam: string | string[],
    @Req() req: Request
  ): Promise<DataPackagesResponse> {
    if (!config.enableHistoricalDataServing) {
      throw new ServiceUnavailableException(
        `historical/* routes are not enabled in this cache-service configuration`
      );
    }
    BaseDataPackagesController.validateMetadataAccess(req);
    const dataFeedIds = await this.parseAndValidateRequestParams(dataServiceId, dataFeedIdsParam);
    return await this.dataPackagesService.getDataPackagesByTimestampAndFeedIds(
      dataServiceId,
      Number(timestamp),
      dataFeedIds,
      false,
      this.allowExternalSigners
    );
  }

  private async parseAndValidateRequestParams(
    dataServiceId: string,
    dataFeedIdsParam: string | string[]
  ): Promise<string[]> {
    if (!dataFeedIdsParam) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: "dataFeedIds query parameter is required" },
        HttpStatus.BAD_REQUEST
      );
    }
    await BaseDataPackagesController.validateDataServiceId(dataServiceId);
    const rawIds = Array.isArray(dataFeedIdsParam) ? dataFeedIdsParam : dataFeedIdsParam.split(",");
    if (rawIds.some((id) => !id || id.trim() !== id)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "dataFeedIds must not contain empty or whitespace-padded values",
        },
        HttpStatus.BAD_REQUEST
      );
    }
    const dataFeedIds = rawIds;
    if (dataFeedIds.length > config.dataFeedsByFeedsEndpointMaxLimit) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Too many dataFeedIds. Maximum allowed: ${config.dataFeedsByFeedsEndpointMaxLimit}`,
        },
        HttpStatus.BAD_REQUEST
      );
    }
    return dataFeedIds;
  }

  protected static validateMetadataAccess(req: Request): void {
    if (!config.enableMetadataApiKeyPrefixCheck) {
      return;
    }
    const apiKey = (req.headers as Record<string, string | undefined>)["x-api-key"];
    if (
      !apiKey ||
      !config.metadataApiKeyPrefix ||
      !apiKey.startsWith(config.metadataApiKeyPrefix)
    ) {
      throw new HttpException(
        { status: HttpStatus.FORBIDDEN, error: "Access to metadata requires a valid API key" },
        HttpStatus.FORBIDDEN
      );
    }
  }

  @Post("bulk")
  async addBulk(@Body() body: BulkPostRequestBody, @Req() req: Request) {
    if (!config.enableDirectPostingRoutes) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Data package posting routes are disabled",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const signerAddress = DataPackagesService.verifyRequester(body);

    // Track metrics with node identification
    const apiKey = req.headers["x-api-key"] as string;
    if (apiKey && this.apiKeysUsageTracker) {
      this.apiKeysUsageTracker.trackBulkRequest(apiKey, signerAddress);
    }

    const dataPackagesToSave = await DataPackagesService.prepareReceivedDataPackagesForBulkSaving(
      body.dataPackages,
      signerAddress
    );

    this.dataPackagesService.broadcast(dataPackagesToSave, signerAddress).catch(() => {}); // ignore errors as they are logged by the service
  }
}
