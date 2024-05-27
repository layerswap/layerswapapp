import { JettonMaster, JettonWallet, Address } from "@ton/ton"
import formatAmount from "../../../formatAmount";
import { Network, Token } from "../../../../Models/Network";
import { datadogRum } from "@datadog/browser-rum";
import tonClient from "../../../wallets/ton/client";

export const resolveBalance = async ({ address, network, token }: {
    network: Network,
    token: Token,
    address: string
}
) => {

    if (token.contract) {
        const res = await getJettonBalance({ network, token, address })
        return res
    }
    else {
        const res = await getNativeAssetBalance({ network, token, address })
        return res
    }
}


const getNativeAssetBalance = async ({ network, token, address }: { network: Network, token: Token, address: string }) => {
    try {

        const tonBalance = await tonClient.getBalance(Address.parse(address))
        return ({
            network: network.name,
            token: token.symbol,
            amount: formatAmount(tonBalance.toString(), Number(token?.decimals)),
            request_time: new Date().toJSON(),
            decimals: Number(token?.decimals),
            isNativeCurrency: false,
        })
    }
    catch (e) {
        if (e.response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
            return getNativeAssetBalance({ network, token, address }); // Retry getting balance
        }
        const error = new Error(e)
        error.name = "TonNativeAssetBalanceError"
        error.cause = e
        datadogRum.addError(error);
        return null;
    }
}

const getJettonBalance = async ({ network, token, address }: { network: Network, token: Token, address: string }) => {
    try {
        const jettonMasterAddress = Address.parse(token.contract!)
        const userAddress = Address.parse(address)
        const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress))
        const jettonAddress = await jettonMaster.getWalletAddress(userAddress)
        const jettonWallet = JettonWallet.create(jettonAddress)
        const JettonBalance = await jettonWallet.getBalance(tonClient.provider(jettonAddress))

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
        if (e.response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
            return getJettonBalance({ network, token, address }); // Retry getting balance
        }
        const error = new Error(e)
        error.name = "TonJettonBalanceError"
        error.cause = e
        datadogRum.addError(error);
        return null;
    }
}