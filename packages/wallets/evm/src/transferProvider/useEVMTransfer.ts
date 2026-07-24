// Deprecated: kept as a re-export shim for backward compatibility. The function
// no longer relies on the wagmi React context — it reads the config from the
// module-level singleton instead. Prefer importing `createEvmTransfer` directly.
export { createEvmTransfer as useEVMTransfer } from './createEvmTransfer'
