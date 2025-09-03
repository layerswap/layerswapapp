import { BalanceFetchError, TokenBalance } from "../../../Models/Balance";
import { Network, NetworkWithTokens, Token } from "../../../Models/Network";
import formatAmount from "../../formatAmount";

import KnownInternalNames from "../../knownIds";
import retryWithExponentialBackoff from "../../retry";
import tonClient from "../../wallets/ton/client";
import { insertIfNotExists } from "./helpers";

export class TonBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const balances: TokenBalance[] = [];
        const errors: BalanceFetchError[] = [];

        const tokens = insertIfNotExists(network.tokens || [], network.token)

        for (const token of tokens) {
            try {
                const balance = await resolveBalance({ network, address, token });
                if (!balance) continue

                balances.push(balance);
            } catch (e: any) {
                errors.push({
                    network: network.name,
                    token: token?.symbol ?? null,
                    message: e?.message ?? "Failed to fetch balance",
                    code: e?.code ?? e?.response?.status,
                    cause: e,
                });
            }
        }

        return { balances, errors };
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
    try {

        const { Address } = await import("@ton/ton");

        const getBalance = async () => {
            return await tonClient.getBalance(Address.parse(address))
        }
        const tonBalance = await retryWithExponentialBackoff(getBalance)

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
        return null;
    }
}

const getJettonBalance = async ({ network, token, address }: { network: Network, token: Token, address: string }) => {
    try {

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
            amount: formatAmount(Number(BigInt(jettonBalance)), token.decimals),
            request_time: new Date().toJSON(),
            decimals: token.decimals,
            isNativeCurrency: false,
        }

        return balance
    }
    catch (e) {
        return null;
    }
}