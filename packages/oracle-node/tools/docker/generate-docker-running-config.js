const REDSTONE_NODE_PUBLIC_IMAGE_URI =
  "public.ecr.aws/y7v2w8b2/redstone-node:latest";

module.exports = function (configFile, envVarName = "REDSTONE_NODE_CONFIG") {
  console.log("\n=== Environment variables ===");
  const stringifiedConfig = JSON.stringify(require(configFile));
  console.log(`${envVarName}='${stringifiedConfig}'`);

  console.log(
    "\n\n=== Node running command (locally) after creating env variables folder ==="
  );
  console.log(`${envVarName}='${stringifiedConfig}' yarn start`);

  console.log("\n\n=== Docker running command ===");
  console.log(
    `docker run -it -p 8080:8080 --env ${envVarName}='${stringifiedConfig}' ${REDSTONE_NODE_PUBLIC_IMAGE_URI}`
  );
};
