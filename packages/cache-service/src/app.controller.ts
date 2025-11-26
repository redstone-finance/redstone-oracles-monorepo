import { Controller, Get } from "@nestjs/common";
import { loggerFactory } from "@redstone-finance/utils";

@Controller()
export class AppController {
  private readonly logger = loggerFactory(AppController.name);

  @Get()
  getRootRouteResponse(): string {
    this.logger.info("Received a request to the root route");
    return `Hello! I am working correctly`;
  }
}
