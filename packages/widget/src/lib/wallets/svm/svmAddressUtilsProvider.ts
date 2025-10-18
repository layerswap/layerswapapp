import { PublicKey } from '@solana/web3.js'
import { Network, NetworkType } from "@/Models/Network";
import { AddressUtilsProvider } from "@/types";

export class SolanaAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.Solana
    }

    isValidAddress(address?: string) {
        if (!address) {
            return false
        }
        try {
            let pubkey = new PublicKey(address)
            let isSolana = PublicKey.isOnCurve(pubkey.toBuffer())
            return isSolana
        } catch (error) {
            return false
        }
    }

    addressFormat(address: string) {
        return address;
    }
}