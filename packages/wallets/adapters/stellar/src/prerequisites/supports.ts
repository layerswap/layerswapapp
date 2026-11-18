import { NetworkType, type SwapPrerequisiteContext } from '@layerswap/widget-types'

/** Native XLM needs no trustline; every issued asset on a Stellar destination is checked. */
export function supportsStellarRecipient(context: SwapPrerequisiteContext): boolean {
    const { network, token } = context.destination
    return network.type === NetworkType.Stellar && (token.symbol !== 'XLM' || !!token.contract)
}
