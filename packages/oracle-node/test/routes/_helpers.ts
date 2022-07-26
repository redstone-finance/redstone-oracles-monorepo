import express from "express";
import { setExpressRoutes } from "../../src/routes/index";
import { MOCK_NODE_CONFIG } from "../helpers";

export function getApp() {
  const app = express();
  setExpressRoutes(app, MOCK_NODE_CONFIG);
  return app;
}
