import useEVMBalance from "../lib/balances/evm/useEVMBalance"
import useLoopringBalance from "../lib/balances/loopring/useLoopringBalance"
import useOptimismBalance from "../lib/balances/evm/optimism/useOptimismBalance"
import useStarknetBalance from "../lib/balances/starknet/useStarknetBalance"
import useZkSyncBalance from "../lib/balances/zksync/useZkSyncBalance"
import useSolanaBalance from "../lib/balances/solana/useSolanaBalance"
import useImxBalance from "../lib/balances/immutableX/useIMXBalances"
import { BalanceProvider } from "../Models/Balance"
import useWallet from "./useWallet"
import { useBalancesState, useBalancesUpdate } from "../context/balances"
import { CryptoNetwork, Token } from "../Models/Network"
import useQueryBalances from "../lib/balances/query/useQueryBalances"
import { useQueryState } from "../context/query"
import LayerSwapApiClient, { GetQuoteParams } from "../lib/layerSwapApiClient"


export default function useBalanceProvider() {

    const BalanceProviders: BalanceProvider[] = [
        useQueryBalances(),
        useEVMBalance(),
        useOptimismBalance(),
        useStarknetBalance(),
        useLoopringBalance(),
        useZkSyncBalance(),
        useSolanaBalance(),
        useImxBalance()
    ]

    const { balances, gases } = useBalancesState()
    const query = useQueryState()

    const {
        setIsBalanceLoading,
        setAllBalances,
        setIsGasLoading,
        setAllGases
    } = useBalancesUpdate()

    const { getAutofillProvider } = useWallet()

    const fetchBalance = async (network: CryptoNetwork) => {
        const provider = getAutofillProvider(network)
        const wallet = provider?.getConnectedWallet()
        const address = query.account || wallet?.address

        const balance = balances[address || '']?.find(b => b?.network === network?.name)
        const isBalanceOutDated = !balance || new Date().getTime() - (new Date(balance.request_time).getTime() || 0) > 10000

        if (network
            && isBalanceOutDated
            && address) {
            setIsBalanceLoading(true)

            const walletBalances = balances[address]
            const filteredBalances = walletBalances?.some(b => b?.network === network?.name) ? walletBalances?.filter(b => b?.network !== network.name) : walletBalances || []

            const provider = getBalanceProvider(network)
            const ercAndNativeBalances = await provider?.getBalance({
                network: network,
                address: address
            }) || []

            setAllBalances((data) => ({ ...data, [address]: filteredBalances?.concat(ercAndNativeBalances) }))
            setIsBalanceLoading(false)
        }
    }

    const fetchGas = async (source_network: CryptoNetwork, source_token: Token, destination_network: CryptoNetwork, destination_token: Token, userDestinationAddress: string, amount: string) => {

        if (!source_network) {
            return
        }

        const gas = gases[source_network.name]?.find(g => g?.token === source_token?.symbol)
        const isGasOutDated = !gas || new Date().getTime() - (new Date(gas.request_time).getTime() || 0) > 10000

        const provider = getAutofillProvider(source_network)
        const wallet = provider?.getConnectedWallet()

        const params: GetQuoteParams = {
            source_network: source_network.name,
            source_token: source_token.symbol,
            source_address: wallet?.address,
            destination_network: destination_network.name,
            destination_token: destination_token.symbol,
            destination_address: userDestinationAddress,
            deposit_mode: 'wallet',
            include_gas: true,
            amount: Number(amount),
        }

        if (isGasOutDated
            && source_token
            && wallet?.address) {
            setIsGasLoading(true)
            try {
                const apiClient = new LayerSwapApiClient()

                const response = await apiClient.GetQuote({ params })

                // const provider = getBalanceProvider(source_network)
                // const gas = provider?.getGas && await provider?.getGas({
                //     network: source_network,
                //     address: wallet?.address as `0x${string}`,
                //     currency: source_token,
                //     userDestinationAddress,
                //     wallet
                // }) || []

                const gas = {
                    token: source_token.symbol,
                    gas: Number(response?.data?.quote?.deposit_gas_fee),
                    request_time: String(response?.data?.quote?.avg_completion_time)
                }

                if (gas) {
                    const filteredGases = gases[source_network.name]?.some(b => b?.token === source_token?.symbol) ? gases[source_network.name].filter(g => g.token !== source_token.symbol) : gases[source_network.name] || []
                    setAllGases((data) => ({ ...data, [source_network.name]: filteredGases.concat(gas) }))
                }
            }
            catch (e) { console.log(e) }
            finally { setIsGasLoading(false) }
        }
    }

    const getBalanceProvider = (network: CryptoNetwork) => {
        const provider = BalanceProviders.find(provider => provider.supportedNetworks.includes(network.name))
        return provider
    }

    return {
        fetchGas,
        fetchBalance
    }
}
