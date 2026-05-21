// Deprecated: kept as a re-export shim for backward compatibility with
// external consumers. New code should import `useStarknetConnection` from
// `./service/useStarknetConnection`.
export { useStarknetConnection as default } from './service/useStarknetConnection'
export { resolveStarknetWallet } from './service/StarknetConnectionService'
