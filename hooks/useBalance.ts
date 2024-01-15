import { Layer } from "../Models/Layer"
import useEVMBalance from "../lib/balances/evm/useEVMBalance"
import useLoopringBalance from "../lib/balances/loopring/useLoopringBalance"
import useOptimismBalance from "../lib/balances/evm/optimism/useOptimismBalance"
import useStarknetBalance from "../lib/balances/starknet/useStarknetBalance"
import useZkSyncBalance from "../lib/balances/zksync/useZkSyncBalance"
import useSolanaBalance from "../lib/balances/solana/useSolanaBalance"
import { BalanceProvider } from "../Models/Balance"
import useWallet from "./useWallet"
import { useBalancesState, useBalancesUpdate } from "../context/balances"
import { Currency } from "../Models/Currency"
import useImxBalance from "../lib/balances/immutableX/useImmutableXBalances"


export default function useBalanceProvider() {

    const BalanceProviders: BalanceProvider[] = [
        useEVMBalance(),
        useOptimismBalance(),
        useStarknetBalance(),
        useLoopringBalance(),
        useZkSyncBalance(),
        useSolanaBalance(),
        useImxBalance()
    ]

    const { balances, gases } = useBalancesState()

    const {
        setIsBalanceLoading,
        setAllBalances,
        setIsGasLoading,
        setAllGases
    } = useBalancesUpdate()

    const { getAutofillProvider } = useWallet()

    const fetchBalance = async (from: Layer) => {
        const provider = getAutofillProvider(from)
        const wallet = provider?.getConnectedWallet()

        const balance = balances[wallet?.address || '']?.find(b => b?.network === from?.internal_name)
        const isBalanceOutDated = !balance || new Date().getTime() - (new Date(balance.request_time).getTime() || 0) > 10000
        const source_assets = from.assets
        const source_network = source_assets?.[0].network
        if (source_network
            && isBalanceOutDated
            && wallet?.address
            && from?.isExchange === false) {
            setIsBalanceLoading(true)

            const walletBalances = balances[wallet.address]
            const filteredBalances = walletBalances?.some(b => b?.network === from?.internal_name) ? walletBalances?.filter(b => b?.network !== from.internal_name) : walletBalances || []

            const provider = getBalanceProvider(from)
            const ercAndNativeBalances = await provider?.getBalance({
                layer: from,
                address: wallet?.address
            }) || []

            setAllBalances((data) => ({ ...data, [wallet?.address]: filteredBalances?.concat(ercAndNativeBalances) }))
            setIsBalanceLoading(false)
        }
    }

    const fetchGas = async (from: Layer, currency: Currency, userDestinationAddress: string) => {

        if (!from || from?.isExchange) {
            return
        }
        const network = from.assets?.[0].network

        if (!network)
            return

        const destination_address = from?.assets?.find(c => c.asset.toLowerCase() === currency?.asset?.toLowerCase())?.network?.managed_accounts?.[0]?.address as `0x${string}`
        const gas = gases[from.internal_name]?.find(g => g?.token === currency?.asset)
        const isGasOutDated = !gas || new Date().getTime() - (new Date(gas.request_time).getTime() || 0) > 10000

        const provider = getAutofillProvider(from)
        const wallet = provider?.getConnectedWallet()

        if (isGasOutDated
            && currency
            && wallet?.address
            && destination_address) {
            setIsGasLoading(true)
            try {
                const provider = getBalanceProvider(from)
                const gas = await provider?.getGas({
                    layer: from,
                    address: wallet?.address as `0x${string}`,
                    currency,
                    userDestinationAddress,
                    wallet
                }) || []

                if (gas) {
                    const filteredGases = gases[from.internal_name]?.some(b => b?.token === currency?.asset) ? gases[from.internal_name].filter(g => g?.token !== currency.asset) : gases[from.internal_name] || []
                    setAllGases((data) => ({ ...data, [from.internal_name]: filteredGases.concat(gas) }))
                }
            }
            catch (e) { console.log(e) }
            finally { setIsGasLoading(false) }
        }
    }

    const getBalanceProvider = (network: Layer) => {
        const provider = BalanceProviders.find(provider => provider.supportedNetworks.includes(network.internal_name))
        return provider
    }

    return {
        fetchGas,
        fetchBalance
    }
}
