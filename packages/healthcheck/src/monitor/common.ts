export enum HealthStatus {
  healthy = "healthy",
  unhealthy = "unhealthy",
  unknown = "unknown",
}

export type HealthCheckResult = {
  errors: string[];
  status: HealthStatus;
};

export type HealthCheckResults = {
  status: HealthStatus;
  results: Record<string, HealthCheckResult>;
};

export interface HealthCheck {
  check(fireDate: Date): Promise<HealthCheckResult>;
}

export function healthy(): Promise<HealthCheckResult> {
  return Promise.resolve({
    errors: [],
    status: HealthStatus.healthy,
  });
}

export function unhealthy(errors: string[]): Promise<HealthCheckResult> {
  return Promise.resolve({
    errors,
    status: HealthStatus.unhealthy,
  });
}
