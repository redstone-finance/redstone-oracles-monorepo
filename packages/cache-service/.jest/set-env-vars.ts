process.env.ENABLE_DIRECT_POSTING_ROUTES = "true";
process.env.API_KEY_FOR_ACCESS_TO_ADMIN_ROUTES = "test-api-key";
// don't remove prevent from passing prod/test mongodburl to test env
process.env.MONGO_DB_URL = "MOCK_MONGO_URL";
process.env.ENABLE_HISTORICAL_DATA_SERVING = "true";
process.env.MONGO_DB_TTL_SECONDS = "1000000";

process.env.MONGOMS_RUNTIME_DOWNLOAD = "false"; // fail on misconfiguration instead of fetching binaries during tests
// help automatic finding of mongodb binaries: in monorepo top-level node_modules is used by postinstall script of mongodb-memory-server
if (process.env.PROJECT_CWD) {
  process.env.MONGOMS_DOWNLOAD_DIR = `${process.env.PROJECT_CWD}/node_modules/.cache/mongodb-memory-server`;
}
