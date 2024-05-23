import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, NetworkBalancesProps } from "../../../Models/Balance";
import { TonClient, JettonMaster, JettonWallet, Address } from "@ton/ton"
import { resolveBalance } from "./balance";

export default function useTonBalance(): BalanceProvider {
    const supportedNetworks = [KnownInternalNames.Networks.TONMainnet]

    const getNetworkBalances = async ({ network, address }: NetworkBalancesProps) => {

        let balances: Balance[] = []

        if (!network.tokens) return

        for (let i = 0; i < network.tokens.length; i++) {
            try {
                const token = network.tokens[i]
                debugger
                const balance = await resolveBalance({ network, address, token })

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

    const getBalance = async ({ network, token, address }: BalanceProps) => {

        try {
            const balance = await resolveBalance({ network, address, token })
            return balance
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