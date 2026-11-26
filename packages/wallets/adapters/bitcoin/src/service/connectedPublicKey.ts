import { getAccount } from '@bigmi/client'
import { getBitcoinConfig, hasBitcoinConfig } from './getBitcoinConfig'

export function connectedPublicKey(address: string): string | undefined {
    if (!hasBitcoinConfig()) return undefined
    return getAccount(getBitcoinConfig()).accounts?.find(account => account.address === address)?.publicKey
}
