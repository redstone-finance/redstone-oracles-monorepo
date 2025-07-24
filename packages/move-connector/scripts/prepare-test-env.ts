import { TestHelper } from "../test/helpers";

async function main() {
  const helper = TestHelper.makeLocal();

  await helper.prepare();
}

void main();
