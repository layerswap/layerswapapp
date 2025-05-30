import { datadogRum } from "@datadog/browser-rum";
import { Balance } from "../../../Models/Balance";
import { Network, NetworkWithTokens, Token } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import { TronWeb } from 'tronweb'
import { insertIfNotExists } from "./helpers";

export class TronBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return KnownInternalNames.Networks.TronMainnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        let balances: Balance[] = []
        const provider = new TronWeb({ fullNode: network.node_url, solidityNode: network.node_url, privateKey: '01' });
        const tokens = insertIfNotExists(network.tokens, network.token)

        for (const token of tokens) {
            try {
                const balance = await resolveBalance({ network, address, token, provider })

                if (!balance) return

                balances = [
                    ...balances,
                    balance,
                ]

            }
            catch (e) {
                console.log(e)
            }
        }

        return balances
    }
}

type GetBalanceProps = {
    network: Network,
    token: Token,
    address: string,
    provider: TronWeb
}

export const resolveBalance = async ({ address, network, token, provider }: GetBalanceProps) => {

    if (token.contract) {
        const res = await getTRC20Balance({ network, token, address, provider })
        return res
    }
    else {
        const res = await getNativeAssetBalance({ network, token, address, provider })
        return res
    }
}

const getNativeAssetBalance = async ({ network, token, address, provider }: GetBalanceProps) => {
    try {

        const balance = await provider.trx.getBalance(address);

        return ({
            network: network.name,
            token: token.symbol,
            amount: formatAmount(balance.toString(), Number(token?.decimals)),
            request_time: new Date().toJSON(),
            decimals: Number(token?.decimals),
            isNativeCurrency: true,
        })
    }
    catch (e) {
        const error = new Error(e)
        error.name = "TronNativeAssetBalanceError"
        error.cause = e
        datadogRum.addError(error);
        return null;
    }
}

const getTRC20Balance = async ({ network, token, address, provider }: GetBalanceProps) => {
    try {
        if (!token.contract) throw new Error("Token contract address is missing")

        const tokenContractAddress = token.contract;
        const contract = await provider.contract().at(tokenContractAddress);

        const balanceResponse = await contract.methods.balanceOf(address).call();

        const balance = {
            network: network.name,
            token: token.symbol,
            amount: formatAmount(BigInt(balanceResponse as any), token.decimals),
            request_time: new Date().toJSON(),
            decimals: token.decimals,
            isNativeCurrency: false,
        }

        return balance
    }
    catch (e) {
        console.log(e)
        const error = new Error(e)
        error.name = "TronTRC20BalanceError"
        error.cause = e
        datadogRum.addError(error);
        return null;
    }
}