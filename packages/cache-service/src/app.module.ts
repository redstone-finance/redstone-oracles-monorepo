import { Module, Provider } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import { MongoBroadcaster } from "./broadcasters/mongo-broadcaster";
import config from "./config";
import { DataFeedsMetadataController } from "./data-feeds-metadata/data-feeds-metadata.controller";
import { DataPackagesControllerV1 } from "./data-packages/data-packages.controller.v1";
import { DataPackagesControllerV2 } from "./data-packages/data-packages.controller.v2";
import { DataPackagesService } from "./data-packages/data-packages.service";
import { OracleRegistryStateController } from "./oracle-registry-state/oracle-registry-state.controller";

const providers: Provider[] = [DataPackagesService];
const imports = [LoggerModule.forRoot()];

if (config.mongoDbUrl) {
  providers.push(MongoBroadcaster);
  if (config.mongoDbUrl !== "MOCK_MONGO_URL") {
    void mongoose.connect(config.mongoDbUrl);
    imports.push(MongooseModule.forRoot(config.mongoDbUrl));
  }
}

@Module({
  imports,
  controllers: [
    AppController,
    DataPackagesControllerV1,
    DataPackagesControllerV2,
    OracleRegistryStateController,
    DataFeedsMetadataController,
  ],
  providers,
})
export class AppModule {}
