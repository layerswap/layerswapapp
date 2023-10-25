import { Context, FC, useState, createContext, useContext, useEffect } from 'react'
import { StarknetWindowObject } from 'get-starknet';
import { useAccount } from 'wagmi';
import { Layer } from '../Models/Layer';
import { Currency } from '../Models/Currency';
import { Balance, Gas, getErc20Balances, getNativeBalance, resolveERC20Balances, resolveGas, resolveNativeBalance } from '../helpers/balanceHelper';
import { createPublicClient, http } from 'viem';
import resolveChain from '../lib/resolveChain';
import { NetworkType } from '../Models/CryptoNetwork';
import { useSettingsState } from './settings';
import { useSwapDataState } from './swap';

export const WalletStateContext = createContext<WalletState>({
    balances: [],
    gases: {},
    imxAccount: null,
    isBalanceLoading: false,
    isGasLoading: false,
    starknetAccount: null
});
const WalletStateUpdateContext = createContext<WalletStateUpdate | null>(null);

export type WalletState = {
    starknetAccount: StarknetWindowObject | undefined | null,
    imxAccount: string | undefined | null,
    balances: Balance[],
    gases: { [network: string]: Gas[] },
    isBalanceLoading: boolean,
    isGasLoading: boolean,
    isContractWallet?: { ready: boolean, value?: boolean }
}

type WalletStateUpdate = {
    setStarknetAccount: (account: StarknetWindowObject | null) => void,
    setImxAccount: (account: string | null) => void;
    getBalance: (from: Layer) => Promise<void>,
    getGas: (from: Layer, currency: Currency, userDestinationAddress: string) => Promise<void>,
}

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const WalletDataProvider: FC<Props> = ({ children }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject | null>()
    const [imxAccount, setImxAccount] = useState<string | null>()
    const [allBalances, setAllBalances] = useState<{ [address: string]: Balance[] }>({})
    const [allGases, setAllGases] = useState<{ [network: string]: Gas[] }>({})
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)
    const [isGasLoading, setIsGasLoading] = useState<boolean>(false)
    const { address: evmAddress } = useAccount()
    const balances = allBalances[evmAddress || '']
    const gases = allGases

    const { swap } = useSwapDataState()
    const { networks } = useSettingsState()

    const [isContractWallet, setIsContractWallet] = useState<{ ready: boolean, value?: boolean }>({ ready: false })

    useEffect(() => {
        (async () => {
            if (!swap) {
                return
            }
            try {
                const source_network = networks?.find(n => n.internal_name === swap?.source_network)
                if (!source_network)
                    return

                if (evmAddress
                    && swap.destination_address! == evmAddress) {
                    const chain = resolveChain(source_network)
                    if (!chain) {
                        return
                    }
                    const publicClient = createPublicClient({
                        chain,
                        transport: http()
                    })

                    const bytecode = await publicClient.getBytecode({
                        address: evmAddress
                    });

                    const isContractWallet = !!bytecode

                    setIsContractWallet({ ready: true, value: isContractWallet })
                }
                else {
                    setIsContractWallet({ ready: true, value: false })
                }
            }
            catch (e) {
                //TODO handle error
                setIsContractWallet({ ready: true })
            }
        })()
    }, [swap?.source_network, swap?.destination_address, evmAddress])

    async function getBalance(from: Layer) {
        const balance = allBalances[evmAddress || '']?.find(b => b?.network === from?.internal_name)
        const isBalanceOutDated = !balance || new Date().getTime() - (new Date(balance.request_time).getTime() || 0) > 10000
        const source_assets = from.assets
        const source_network = source_assets?.[0].network
        if (source_network
            && isBalanceOutDated
            && evmAddress
            && from?.isExchange === false
            && from?.type === NetworkType.EVM) {
            setIsBalanceLoading(true)
            const chain = resolveChain(source_network)
            if (!chain) {
                return
            }
            const publicClient = createPublicClient({
                chain,
                transport: http()
            })
            const erc20BalancesContractRes = await getErc20Balances({
                address: evmAddress,
                chainId: Number(from?.chain_id),
                assets: from.assets,
                publicClient,
                hasMulticall: !!from.metadata?.multicall3
            });

            const erc20Balances = (erc20BalancesContractRes && await resolveERC20Balances(
                erc20BalancesContractRes,
                from
            )) || [];

            const nativeBalanceContractRes = await getNativeBalance(evmAddress, Number(from.chain_id))
            const nativeBalance = (nativeBalanceContractRes
                && await resolveNativeBalance(from, nativeBalanceContractRes)) || []

            const filteredBalances = balances?.some(b => b?.network === from?.internal_name) ? balances?.filter(b => b?.network !== from.internal_name) : balances || []

            setAllBalances((data) => ({ ...data, [evmAddress]: filteredBalances?.concat(erc20Balances, nativeBalance) }))
            setIsBalanceLoading(false)
        }
    }

    async function getGas(from: Layer & { isExchange: false }, currency: Currency, userDestinationAddress: string) {
        if (!from || !evmAddress || from?.isExchange) {
            return
        }
        const chainId = Number(from?.chain_id)
        const nativeToken = from?.assets
            .find(a =>
                a.asset ===
                (from as { native_currency: string }).native_currency)
        const network = from.assets?.[0].network

        if (!nativeToken || !chainId || !network)
            return

        const contract_address = from?.assets?.find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`
        const destination_address = from?.assets?.find(c => c.asset.toLowerCase() === currency?.asset?.toLowerCase())?.network?.managed_accounts?.[0]?.address as `0x${string}`


        const gas = allGases[from.internal_name]?.find(g => g?.token === currency?.asset)
        const isGasOutDated = !gas || new Date().getTime() - (new Date(gas.request_time).getTime() || 0) > 10000

        if (chainId
            && isGasOutDated
            && currency
            && destination_address && from?.type === NetworkType.EVM) {
            setIsGasLoading(true)
            try {

                const publicClient = createPublicClient({
                    chain: resolveChain(network),
                    transport: http(),
                })

                const gas = await resolveGas({
                    publicClient,
                    chainId,
                    contract_address,
                    account: evmAddress,
                    from,
                    currency,
                    destination: destination_address,
                    //TODO fix, this does not consider argent wallet
                    isSweeplessTx: evmAddress !== userDestinationAddress,
                    nativeToken: nativeToken
                })

                if (gas) {
                    const filteredGases = allGases[from.internal_name]?.some(b => b?.token === currency?.asset) ? allGases[from.internal_name].filter(g => g.token !== currency.asset) : allGases[from.internal_name] || []
                    setAllGases((data) => ({ ...data, [from.internal_name]: filteredGases.concat(gas) }))
                }

            }
            catch (e) { console.log(e) }
            finally { setIsGasLoading(false) }
        }
    }

    return (
        <WalletStateContext.Provider value={{
            starknetAccount,
            imxAccount,
            balances,
            gases,
            isBalanceLoading,
            isGasLoading,
            isContractWallet
        }}>
            <WalletStateUpdateContext.Provider value={{
                setStarknetAccount,
                setImxAccount,
                getBalance,
                getGas,
            }}>
                {children}
            </WalletStateUpdateContext.Provider>
        </WalletStateContext.Provider >
    );
}

export function useWalletState<T>() {
    const data = useContext<WalletState>(WalletStateContext as Context<WalletState>);
    if (data === undefined) {
        throw new Error('useWalletStateContext must be used within a WalletStateContext');
    }

    return data;
}

export function useWalletUpdate<T>() {
    const updateFns = useContext<WalletStateUpdate>(WalletStateUpdateContext as Context<WalletStateUpdate>);

    if (updateFns === undefined) {
        throw new Error('useWalletStateUpdateContext must be used within a WalletStateUpdateContext');
    }

    return updateFns;
}

