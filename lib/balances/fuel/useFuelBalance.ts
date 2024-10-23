import KnownInternalNames from "../../knownIds";
import { Balance, BalanceProps, BalanceProvider, NetworkBalancesProps } from "../../../Models/Balance";
import { useSettingsState } from "../../../context/settings";
import formatAmount from "../../formatAmount";
import retryWithExponentialBackoff from "../../retryWithExponentialBackoff";

export default function useFuelBalance(): BalanceProvider {
    const { networks } = useSettingsState()

    const supportedNetworks = [
        KnownInternalNames.Networks.FuelMainnet,
        KnownInternalNames.Networks.FuelTestnet
    ]

    const getNetworkBalances = async ({ networkName, address }: NetworkBalancesProps) => {
        const network = networks.find(n => n.name === networkName)
        console.log(network)
        let balances: Balance[] = []

        if (!network?.tokens) return

        const BALANCES_QUERY = `query Balances($filter: BalanceFilterInput) {
            balances(filter: $filter, first: 5) {
              nodes {
                amount
                assetId
              }
            }
          }`;

        const BALANCES_ARGS = {
            filter: {
                owner: address,
            },
        };

        try {
            const response = await retryWithExponentialBackoff(async () => await fetch('https://testnet.fuel.network/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    query: BALANCES_QUERY,
                    variables: BALANCES_ARGS,
                }),
            }));
            const json: {
                data: {
                    balances: {
                        nodes: {
                            amount: string,
                            assetId: string
                        }[]
                    }
                }
            } = await response.json();

            for (let i = 0; i < json.data.balances.nodes.length; i++) {

                const balance = json.data.balances.nodes[i]
                const token = network.tokens.find(t => t.contract === balance.assetId)

                if (!token) return

                const balanceObj: Balance = {
                    network: networkName,
                    amount: formatAmount(Number(balance.amount), token.decimals),
                    decimals: token.decimals,
                    isNativeCurrency: network.token?.symbol === token.symbol,
                    token: token.symbol,
                    request_time: new Date().toJSON()
                }

                balances = [
                    ...balances,
                    balanceObj,
                ]

            }

        } catch (e) {
            console.log(e)
        }

        return balances

    }

    const getBalance = async ({ networkName, token, address }: BalanceProps) => {
        const network = networks.find(n => n.name === networkName)

        if (!network) return

        const BALANCE_QUERY = `query Balance($address: Address, $assetId: AssetId) {
            balance(owner: $address, assetId: $assetId) {
              owner
              amount
              assetId
            }
          }`;

        const BALANCE_ARGS = {
            address: address,
            assetId: token.contract,
        };

        try {
            const response = await retryWithExponentialBackoff(async () => await fetch(network.node_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    query: BALANCE_QUERY,
                    variables: BALANCE_ARGS,
                }),
            }));
            const json: any = await response.json();
            const balanceAmount = Number(json.data.balance.amount)

            if (!balanceAmount) return

            const balance: Balance = {
                network: networkName,
                amount: formatAmount(balanceAmount, token.decimals),
                decimals: token.decimals,
                isNativeCurrency: network.token?.symbol === token.symbol,
                token: token.symbol,
                request_time: new Date().toJSON()
            }

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