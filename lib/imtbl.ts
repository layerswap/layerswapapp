import { ETHTokenType, Link, LinkResults } from '@imtbl/imx-sdk'

export default class ImtblClient {
    static URL = 'https://link.sandbox.x.immutable.com'

    static async Sign(): Promise<LinkResults.Sign> {
        const link = new Link(ImtblClient.URL)
        let result = await link.sign({
            "message": "Your address must be verified once before it can be used for a swap. Signing does not require gas and does not permit us to perform transactions with your wallet.",
            "description": "Your address must be verified once before it can be used for a swap. Signing does not require gas and does not permit us to perform transactions with your wallet."
        })
        return result
    }

    static async ConnectWallet(): Promise<LinkResults.Setup> {
        let link = new Link(ImtblClient.URL)
        let result = await link.setup({})
        return result
    }

    static async Deposit(amount: string, toAddress: string) {
        let link = new Link(ImtblClient.URL)
        return await link.transfer([
            {
                type: ETHTokenType.ETH,
                amount: amount,
                toAddress: toAddress
            }
        ])

    }
}
