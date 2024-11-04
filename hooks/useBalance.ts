import useEVMBalance from "../lib/balances/evm/useEVMBalance"
import useLoopringBalance from "../lib/balances/loopring/useLoopringBalance"
import useStarknetBalance from "../lib/balances/starknet/useStarknetBalance"
import useZkSyncBalance from "../lib/balances/zksync/useZkSyncBalance"
import useSolanaBalance from "../lib/balances/solana/useSolanaBalance"
import useImxBalance from "../lib/balances/immutableX/useIMXBalances"
import { BalanceProvider } from "../Models/Balance"
import useWallet from "./useWallet"
import { useBalancesState, useBalancesUpdate } from "../context/balances"
import { Network, NetworkWithTokens, Token } from "../Models/Network"
import { useQueryState } from "../context/query"
import useTonBalance from "../lib/balances/ton/useTonBalance"
import useIsWindowVisible from "./useIsWindowVisible"

export default function useBalanceProvider() {

    const BalanceProviders: BalanceProvider[] = [
        useEVMBalance(),
        useStarknetBalance(),
        useLoopringBalance(),
        useZkSyncBalance(),
        useSolanaBalance(),
        useImxBalance(),
        useTonBalance()
    ]

    const { balances, gases, isBalanceLoading } = useBalancesState()
    const query = useQueryState()

    const {
        setIsBalanceLoading,
        setAllBalances,
        setIsGasLoading,
        setAllGases
    } = useBalancesUpdate()

    const { getAutofillProvider } = useWallet()
    const isWindowVisible = useIsWindowVisible()

    const fetchNetworkBalances = async (network: NetworkWithTokens, address?: string) => {
        if (!isWindowVisible) return

        const provider = getAutofillProvider(network)
        const wallet = provider?.getConnectedWallet(network)
        address = address || query.account || wallet?.address

        const balance = address ? balances[address]?.find(b => b?.network === network?.name) : undefined
        const isBalanceOutDated = !balance || (balance.request_time ? (new Date().getTime() - new Date(balance.request_time).getTime() > 15000) : true)

        if (network
            && isBalanceOutDated
            && address) {
            try {
                setIsBalanceLoading(true)

                const provider = getBalanceProvider(network)
                const networkBalances = await provider?.getNetworkBalances({
                    networkName: network.name,
                    address: address,
                })

                if (networkBalances) {
                    setAllBalances((data) => {
                        const walletBalances = data[address]
                        const otherNetworkBalances = walletBalances?.filter(b => b?.network !== network.name) || []
                        return { ...data, [address]: [...otherNetworkBalances, ...networkBalances] }
                    })
                }

            }
            catch (e) { console.log(e) }
            finally { setIsBalanceLoading(false) }
        }
    }

    const fetchBalance = async (network: Network, token: Token, address?: string) => {
        if (!isWindowVisible) return

        const provider = getAutofillProvider(network)
        const wallet = provider?.getConnectedWallet(network)
        address = address || query.account || wallet?.address

        const balance = balances[address || '']?.find(b => b?.network === network?.name && b?.token === token?.symbol)
        const isBalanceOutDated = !balance || (balance.request_time ? (new Date().getTime() - new Date(balance.request_time).getTime() > 15000) : true)

        if (network
            && isBalanceOutDated
            && address) {
            try {
                setIsBalanceLoading(true)

                const provider = getBalanceProvider(network)
                const newBalance = await provider?.getBalance({
                    networkName: network.name,
                    address: address,
                    token
                })

                setAllBalances((data) => {
                    const walletBalances = data[address]
                    const filteredBalances = walletBalances?.filter(b => !(b?.network === network?.name && b?.token === token?.symbol)) || []
                    return { ...data, [address]: filteredBalances?.concat(newBalance || []) }
                })

                return newBalance


            }
            catch (e) { console.log(e) }
            finally { setIsBalanceLoading(false) }
        }

        return balance
    }

    const fetchGas = async (network: Network, token: Token, userDestinationAddress: string, recipientAddress?: string) => {
        if (!network || !isWindowVisible) {
            return
        }

        const destination_address = userDestinationAddress as `0x${string}`
        const gas = gases[network.name]?.find(g => g?.token === token?.symbol)
        const isGasOutDated = !gas || (gas.request_time ? (new Date().getTime() - new Date(gas.request_time).getTime() > 15000) : true)

        const provider = getAutofillProvider(network)
        const wallet = provider?.getConnectedWallet(network)

        if (
            isGasOutDated
            && token
            && wallet?.address
            && destination_address
        ) {
            try {
                setIsGasLoading(true)

                const gasProvider = getBalanceProvider(network)
                const gas = gasProvider?.getGas && await gasProvider?.getGas({
                    address: wallet?.address as `0x${string}`,
                    network,
                    token,
                    recipientAddress,
                    isSweeplessTx: wallet.address !== userDestinationAddress,
                    wallet
                })

                if (gas) {
                    setAllGases((data) => {
                        const networkGases = data[network.name]
                        const filteredGases = networkGases?.filter(g => g && g.token !== token.symbol) || []
                        return { ...data, [network.name]: filteredGases.concat(gas) }
                    })
                }
            }
            catch (e) { console.log(e) }
            finally { setIsGasLoading(false) }
        }
    }

    const getBalanceProvider = (network: Network) => {
        const provider = BalanceProviders.find(provider => provider.supportedNetworks.includes(network.name))
        return provider
    }

    return {
        fetchGas,
        fetchNetworkBalances,
        fetchBalance
    }
}
