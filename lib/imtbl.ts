import { ERC20TokenType, ETHTokenType, Link, LinkResults } from '@imtbl/imx-sdk'
import { NetworkCurrency } from '../Models/CryptoNetwork'
import KnownInternalNames from './knownIds'
import { SwapItem } from './layerSwapApiClient'
import NetworkSettings from './NetworkSettings'

export default class ImtblClient {
    link: Link

    constructor(network_internal_name: string) {
        const url = NetworkSettings.ImmutableXSettings[network_internal_name].linkUri
        this.link = new Link(url)
    }

    async Sign(): Promise<LinkResults.Sign> {
        let result = await this.link.sign({
            "message": "Your address must be verified once before it can be used for a swap. Signing does not require gas and does not permit us to perform transactions with your wallet.",
            "description": "Your address must be verified once before it can be used for a swap. Signing does not require gas and does not permit us to perform transactions with your wallet."
        })
        return result
    }

    async ConnectWallet(): Promise<LinkResults.Setup> {
        try {
            let result = await this.link.setup({})
            return result
        }
        catch (e) {
            if (e.code === 1003)
                throw new Error("You closed ImmutableX connect wallet window")
            else
                throw e
        }
    }

    async Transfer(swap: SwapItem, currency: NetworkCurrency, deposit_address: string) {

        try {
            if (swap.source_network_asset === KnownInternalNames.Currencies.ETH) {
                const res = await this.link.transfer([
                    {
                        type: ETHTokenType.ETH,
                        amount: swap.requested_amount.toString(),
                        toAddress: deposit_address
                    }
                ])
                return res;
            }
            else {
                const res = await this.link.transfer([
                    {
                        type: ERC20TokenType.ERC20,
                        amount: swap.requested_amount.toString(),
                        toAddress: deposit_address,
                        tokenAddress: currency.contract_address?.toLowerCase(),
                        symbol: swap.source_network_asset
                    }
                ])
                return res;
            }
        }
        catch (e) {
            console.log(e)
        }
    }
}
