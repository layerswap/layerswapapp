import KnownInternalNames from "../../knownIds";
import { Balance, BalanceProps, BalanceProvider, NetworkBalancesProps } from "../../../Models/Balance";
import { resolveBalance } from "./balance";
import { useSettingsState } from "../../../context/settings";

export default function useTonBalance(): BalanceProvider {
    const { networks } = useSettingsState()

    const supportedNetworks = [KnownInternalNames.Networks.TONMainnet]

    const getNetworkBalances = async ({ network: routeNetwork, address }: NetworkBalancesProps) => {
        const network = networks.find(n => n.name === routeNetwork.name)

        let balances: Balance[] = []

        if (!network?.tokens) return

        for (let i = 0; i < network.tokens.length; i++) {
            try {
                const token = network.tokens[i]
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