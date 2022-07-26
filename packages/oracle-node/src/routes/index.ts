import express from "express";
import { NodeConfig } from "../types";
import setCustomUrlRequestsRoute from "./custom-url-requests.route";
import setHomeRoute from "./home.route";

export function setExpressRoutes(
  app: express.Application,
  nodeConfig: NodeConfig
) {
  setCustomUrlRequestsRoute(app, nodeConfig);
  setHomeRoute(app);
}
