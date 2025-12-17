/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FieldMask } from './FieldMask';
import type { IdentityProviderConfig } from './IdentityProviderConfig';
export type UpdateIdentityProviderConfigRequest = {
    /**
     * The identity provider config to update.
     * Required,
     * Modifiable
     */
    identityProviderConfig?: IdentityProviderConfig;
    /**
     * An update mask specifies how and which properties of the ``IdentityProviderConfig`` message are to be updated.
     * An update mask consists of a set of update paths.
     * A valid update path points to a field or a subfield relative to the ``IdentityProviderConfig`` message.
     * A valid update mask must:
     *
     * 1. contain at least one update path,
     * 2. contain only valid update paths.
     *
     * Fields that can be updated are marked as ``Modifiable``.
     * For additional information see the documentation for standard protobuf3's ``google.protobuf.FieldMask``.
     * Required
     */
    updateMask?: FieldMask;
};

