/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IdentityProviderConfig = {
    /**
     * The identity provider identifier
     * Must be a valid LedgerString (as describe in ``value.proto``).
     *
     * Required
     */
    identityProviderId: string;
    /**
     * When set, the callers using JWT tokens issued by this identity provider are denied all access
     * to the Ledger API.
     * Modifiable
     *
     * Optional
     */
    isDeactivated?: boolean;
    /**
     * Specifies the issuer of the JWT token.
     * The issuer value is a case sensitive URL using the https scheme that contains scheme, host,
     * and optionally, port number and path components and no query or fragment components.
     * Modifiable
     *
     * Can be left empty when used in `UpdateIdentityProviderConfigRequest` if the issuer is not being updated.
     *
     * Required
     */
    issuer: string;
    /**
     * The JWKS (JSON Web Key Set) URL.
     * The Ledger API uses JWKs (JSON Web Keys) from the provided URL to verify that the JWT has been
     * signed with the loaded JWK. Only RS256 (RSA Signature with SHA-256) signing algorithm is supported.
     * Modifiable
     *
     * Required
     */
    jwksUrl: string;
    /**
     * Specifies the audience of the JWT token.
     * When set, the callers using JWT tokens issued by this identity provider are allowed to get an access
     * only if the "aud" claim includes the string specified here
     * Modifiable
     *
     * Optional
     */
    audience?: string;
};

