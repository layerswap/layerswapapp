// Eager re-exports of Immutable Passport. Importing this subpath pulls
// `@imtbl/sdk` (~993 KB Brotli) into your bundle eagerly — only do this
// from chunks that genuinely need it (e.g. the OAuth callback page).
//
// For the common case, use the lazy descriptor instead via
// `getDefaultProviders({ immutablePassport })` from the main entry of
// `@layerswap/wallets`.
export {
    createImmutablePassportProvider,
    imtblPassportLoginCallback,
} from "@layerswap/wallet-imtbl-passport";
export type {
    ImmutablePassportProviderConfig,
    ImtblPassportConfig,
} from "@layerswap/wallet-imtbl-passport";
