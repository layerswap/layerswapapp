import { TokenBalance } from "@/Models/Balance";
import { Network, NetworkWithTokens, Token } from "@/Models/Network";
import { formatUnits } from "viem";
import KnownInternalNames from "@/lib/knownIds";
import retryWithExponentialBackoff from "@/lib/retry";
import tonClient from "@/lib/wallets/ton/client";
import { insertIfNotExists } from "@/lib/balances/helpers";
import { BalanceProvider } from "@/types/balance";

export class TonBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        let balances: TokenBalance[] = []
        const tokens = insertIfNotExists(network.tokens || [], network.token)

        for (const token of tokens) {
            try {
                const balance = await resolveBalance({ network, address, token })

                balances.push(balance)

            }
            catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e, token, network))
            }
        }

        return balances
    }
}



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
    const { Address } = await import("@ton/ton");

    const getBalance = async () => {
        return await tonClient.getBalance(Address.parse(address))
    }
    const tonBalance = await retryWithExponentialBackoff(getBalance)

    return ({
        network: network.name,
        token: token.symbol,
        amount: Number(formatUnits(BigInt(tonBalance.toString()), Number(token?.decimals))),
        request_time: new Date().toJSON(),
        decimals: Number(token?.decimals),
        isNativeCurrency: true,
    })

}

const getJettonBalance = async ({ network, token, address }: { network: Network, token: Token, address: string }) => {

    const { JettonMaster, JettonWallet, Address } = await import("@ton/ton");

    const jettonMasterAddress = Address.parse(token.contract!)
    const userAddress = Address.parse(address)
    const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress))
    const getJettonAddress = async () => {
        return await jettonMaster.getWalletAddress(userAddress)
    }
    const jettonAddress = await retryWithExponentialBackoff(getJettonAddress)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const jettonWallet = JettonWallet.create(jettonAddress)
    const getBalance = async () => {
        return await jettonWallet.getBalance(tonClient.provider(jettonAddress))
    }
    const jettonBalance = await retryWithExponentialBackoff(getBalance)

    const balance = {
        network: network.name,
        token: token.symbol,
        amount: Number(formatUnits(BigInt(jettonBalance), token.decimals)),
        request_time: new Date().toJSON(),
        decimals: token.decimals,
        isNativeCurrency: false,
    }

    return balance

}