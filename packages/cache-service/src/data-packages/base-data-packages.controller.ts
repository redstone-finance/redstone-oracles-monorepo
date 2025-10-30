import {
  Body,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Param,
  Post,
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
export abstract class BaseDataPackagesController {
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
