export const resolvePromises = async <T>(
  promises: Promise<T>[]
): Promise<{ errors: Error[]; values: T[] }> => {
  const results = await Promise.allSettled(promises);
  const values = [];
  const errors = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    } else {
      errors.push(result.reason as Error);
    }
  }

  return { errors, values };
};
