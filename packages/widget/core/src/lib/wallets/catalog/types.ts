import type { EcosystemId, WalletId } from '../identity/types'

export type WalletCatalogEntry = {
    id: WalletId
    displayName?: string
    rdns?: string[]
    registryIds?: string[]
    nativeIds?: Partial<Record<EcosystemId, string[]>>
    nameAliases?: string[]
    featuredRank?: number
    deepLink?: (uri: string, ctx: { isIOS: boolean }) => string
    iconKey?: string
    installUrls?: Partial<Record<'chrome' | 'ios' | 'android', string>>
    flags?: {
        svmTreatLoadableAsInstalled?: boolean
    }
}
