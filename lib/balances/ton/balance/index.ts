import { TonClient, JettonMaster, JettonWallet, Address } from "@ton/ton"
import formatAmount from "../../../formatAmount";
import { Network, Token } from "../../../../Models/Network";


export const resolveBalance = async ({ address, network, token }: {
    network: Network,
    token: Token,
    address: string
}
) => {

    const client = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
        apiKey: '9a591e2fc2d679b8ac31c76427d132bc566d0d217c61256ca9cc7ae1e9280806'
    });

    if (token.contract) {
        const res = await getJettonBalance({ network, token, address, client })
        return res
    }
    else {
        const res = await getNativeAssetBalance({ network, token, address, client })
        return res
    }
}


const getNativeAssetBalance = async ({ network, token, address, client }: { network: Network, token: Token, address: string, client: TonClient }) => {
    try {

        const tonBalance = client.getBalance(Address.parse(address))
        return ({
            network: network.name,
            token: token.symbol,
            amount: formatAmount((await tonBalance).toString(), Number(token?.decimals)),
            request_time: new Date().toJSON(),
            decimals: Number(token?.decimals),
            isNativeCurrency: false,
        })
    }
    catch (e) {
        console.log(e)
    }
}

const getJettonBalance = async ({ network, token, address, client }: { network: Network, token: Token, address: string, client: TonClient }) => {
    try {
        const jettonMasterAddress = Address.parse(token.contract!)
        const userAddress = Address.parse(address)
        const jettonMaster = client.open(JettonMaster.create(jettonMasterAddress))
        const jettonAddress = await jettonMaster.getWalletAddress(userAddress)
        const jettonWallet = JettonWallet.create(jettonAddress)
        const JettonBalance = await jettonWallet.getBalance(client.provider(jettonAddress))

        const balance = {
            network: network.name,
            token: token.symbol,
            amount: formatAmount(Number(BigInt(JettonBalance)), token.decimals),
            request_time: new Date().toJSON(),
            decimals: token.decimals,
            isNativeCurrency: false,
        }

        return balance
    }
    catch (e) {
        console.log(e)
    }
}