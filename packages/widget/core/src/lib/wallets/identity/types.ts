export type WalletId = string & { readonly __brand?: 'WalletId' }

export type EcosystemId =
    | 'evm'
    | 'svm'
    | 'starknet'
    | 'ton'
    | 'tron'
    | 'fuel'
    | 'bitcoin'
    | 'paradex'

export type IdentityHints = {
    rdns?: string
    registryId?: string
    nativeId?: string
    name?: string
    ecosystem?: EcosystemId
}
