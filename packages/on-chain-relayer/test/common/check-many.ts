export function checkMany<R extends string, E>(
  checkName: string,
  testName: string,
  resourceNames: R[],
  checkFn: (resource: R) => Promise<E>
) {
  describe(checkName, () => {
    for (const resourceName of resourceNames) {
      it(`${resourceName} ${testName}`, async () => {
        await checkFn(resourceName);
      });
    }
  });
}
