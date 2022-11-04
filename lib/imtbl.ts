import { Link } from '@imtbl/imx-sdk'

const IMTBL_URL = 'https://link.sandbox.x.immutable.com'

export const ConnectWallet = async (): Promise<WalletConnectResult> => {
    let link = new Link(IMTBL_URL)
    let result = await link.setup({})
    return result
}


type WalletConnectResult = {
    address: string,
    starkPublicKey: string,
    providerPreference: string,
    ethNetwork: string
}