export interface AllManifests {
  standard: Manifests;
  multifeed: Manifests;
  nonEvm: Manifests;
}

export type Manifests = Record<
  string,
  {
    createdAt?: number;
    updatedAt?: number;
    version?: number;
  }
>;
