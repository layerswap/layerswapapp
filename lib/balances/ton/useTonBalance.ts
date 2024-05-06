import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, NetworkBalancesProps } from "../../../Models/Balance";
import { TonClient, JettonMaster, JettonWallet, Address } from "@ton/ton"

export default function useTonBalance(): BalanceProvider {
    const supportedNetworks = [KnownInternalNames.Networks.TONMainnet]

    const getNetworkBalances = async ({ network, address }: NetworkBalancesProps) => {

        let balances: Balance[] = []

        if (!network.tokens) return

        for (let i = 0; i < network.tokens.length; i++) {
            try {
                const token = network.tokens[i]
                const client = new TonClient({
                    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
                    apiKey: '9a591e2fc2d679b8ac31c76427d132bc566d0d217c61256ca9cc7ae1e9280806'
                });

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

                balances = [
                    ...balances,
                    balance
                ]
            }
            catch (e) {
                console.log(e)
            }
        }

        return balances

    }

    const getBalance = async ({ network, token, address }: BalanceProps) => {

        try {

            return ({
                network: network.name,
                token: token.symbol,
                amount: formatAmount(0, Number(token?.decimals)),
                request_time: new Date().toJSON(),
                decimals: Number(token?.decimals),
                isNativeCurrency: false
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    return {
        getNetworkBalances,
        getBalance,
        supportedNetworks
    }
}