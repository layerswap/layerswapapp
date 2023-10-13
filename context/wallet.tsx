import React, { FC, useCallback, useState } from 'react'
import { StarknetWindowObject, connect, disconnect } from 'get-starknet';
import { useAccount } from 'wagmi';
import { Layer } from '../Models/Layer';
import { Currency } from '../Models/Currency';
import { Balance, Gas, getErc20Balances, getNativeBalance, resolveERC20Balances, resolveGas, resolveNativeBalance } from '../helpers/balanceHelper';
import { createPublicClient, http } from 'viem';
import resolveChain from '../lib/resolveChain';
import { CryptoNetwork, NetworkType } from '../Models/CryptoNetwork';
import ImtblClient from '../lib/imtbl';
import LayerSwapApiClient, { SwapItem } from '../lib/layerSwapApiClient';
import { GetDefaultNetwork } from '../helpers/settingsHelper';
import KnownInternalNames from '../lib/knownIds';
import toast from 'react-hot-toast';
import { disconnect as wagmiDisconnect } from '@wagmi/core'
import { useSwapDataUpdate } from './swap';

export const WalletStateContext = React.createContext<WalletState>(null);
const WalletStateUpdateContext = React.createContext<WalletStateUpdate>(null);

export type WalletState = {
    starknetAccount: StarknetWindowObject,
    imxAccount: string,
    balances: Balance[],
    gases: { [network: string]: Gas[] },
    isBalanceLoading: boolean,
    isGasLoading: boolean
}

type WalletStateUpdate = {
    connectImx: (source_network: CryptoNetwork) => Promise<void>
    connectStarknet: () => Promise<void>
    disconnectWallet: (swap: SwapItem, source_network: Layer) => Promise<void>
    getBalance: (from: Layer) => Promise<void>,
    getGas: (from: Layer, currency: Currency, userDestinationAddress: string) => Promise<void>,
}

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const WalletDataProvider: FC<Props> = ({ children }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [imxAccount, setImxAccount] = useState<string>()
    const [allBalances, setAllBalances] = useState<{ [address: string]: Balance[] }>({})
    const [allGases, setAllGases] = useState<{ [network: string]: Gas[] }>({})
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)
    const [isGasLoading, setIsGasLoading] = useState<boolean>(false)
    const { address } = useAccount()
    const { mutateSwap } = useSwapDataUpdate()
    const balances = allBalances[address]
    const gases = allGases

    async function getBalance(from: Layer) {
        const isBalanceOutDated = new Date().getTime() - (new Date(allBalances[address]?.find(b => b?.network === from?.internal_name)?.request_time).getTime() || 0) > 10000
        if (from && isBalanceOutDated && address && from?.isExchange === false && from?.type === NetworkType.EVM) {
            setIsBalanceLoading(true)
            const publicClient = createPublicClient({
                chain: resolveChain(from.assets?.[0].network),
                transport: http()
            })
            const erc20BalancesContractRes = await getErc20Balances({
                address,
                chainId: Number(from?.chain_id),
                assets: from.assets,
                publicClient,
                hasMulticall: !!from.metadata?.multicall3
            });

            const erc20Balances = await resolveERC20Balances(
                erc20BalancesContractRes,
                from
            );

            const nativeBalanceContractRes = await getNativeBalance(address, Number(from.chain_id))
            const nativeBalance = await resolveNativeBalance(from, nativeBalanceContractRes)

            const filteredBalances = balances?.some(b => b?.network === from?.internal_name) ? balances?.filter(b => b?.network !== from.internal_name) : balances || []

            setAllBalances((data) => ({ ...data, [address]: filteredBalances?.concat(erc20Balances, nativeBalance) }))
            setIsBalanceLoading(false)
        }
    }

    async function getGas(from: Layer, currency: Currency, userDestinationAddress: string) {
        if (!!!from) {
            return
        }

        const contract_address = from?.assets?.find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`
        const chainId = from?.isExchange === false && Number(from?.chain_id)
        const destination_address = from?.assets?.find(c => c.asset.toLowerCase() === currency?.asset?.toLowerCase())?.network?.managed_accounts?.[0]?.address as `0x${string}`
        const nativeToken = from.isExchange === false && from?.assets.find(a => a.asset === (from as { native_currency: string }).native_currency)
        const isGasOutDated = new Date().getTime() - (new Date(allGases[from.internal_name]?.find(g => g?.token === currency?.asset)?.request_time).getTime() || 0) > 10000

        if (chainId && isGasOutDated && currency && destination_address && from?.isExchange === false && from?.type === NetworkType.EVM) {
            setIsGasLoading(true)
            try {
                const publicClient = createPublicClient({
                    chain: resolveChain(from.assets?.[0].network),
                    transport: http(),
                });

                const gas = await resolveGas({
                    publicClient,
                    chainId,
                    contract_address,
                    account: address,
                    from,
                    currency,
                    destination: destination_address,
                    isSweeplessTx: address !== userDestinationAddress,
                    nativeToken: nativeToken
                })
                const filteredGases = allGases[from.internal_name]?.some(b => b?.token === currency?.asset) ? allGases[from.internal_name].filter(g => g.token !== currency.asset) : allGases[from.internal_name] || []
                if (gas) {
                    setAllGases((data) => ({ ...data, [from.internal_name]: filteredGases.concat(gas) }))
                }
            }
            catch (e) { console.log(e) }
            finally { setIsGasLoading(false) }
        }
    }

    async function connectStarknet() {
        try {
            const res = await connect()
            setStarknetAccount(res)
        }
        catch (e) {
            throw new Error(e)
        }
    }

    async function disconnectStarknet() {
        try {
            disconnect({ clearLastWallet: true })
            setStarknetAccount(null)
        }
        catch (e) {
            throw new Error(e)
        }
    }

    async function connectImx(source_network: CryptoNetwork) {
        try {

            const imtblClient = new ImtblClient(source_network?.internal_name)
            const res = await imtblClient.ConnectWallet();
            setImxAccount(res.address);
        }
        catch (e) {
            throw new Error(e)
        }
    }

    function disconnectImx() {
        setImxAccount(null)
    }

    const handleDisconnectCoinbase = useCallback(async (swap: SwapItem) => {
        const apiClient = new LayerSwapApiClient()
        await apiClient.DisconnectExchangeAsync(swap.id, "coinbase")
        await mutateSwap()
    }, [])

    const disconnectWallet = async (swap: SwapItem, source_network: Layer) => {
        const sourceNetworkType = GetDefaultNetwork(source_network, swap.source_network_asset)?.type
        const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
            || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
        try {
            if (swap.source_exchange) {
                await handleDisconnectCoinbase(swap)
            }
            else if (sourceNetworkType === NetworkType.EVM) {
                await wagmiDisconnect()
            }
            else if (sourceNetworkType === NetworkType.Starknet) {
                await disconnectStarknet()
            }
            else if (sourceIsImmutableX) {
                disconnectImx()
            }
        }
        catch {
            toast.error("Couldn't disconnect the account")
        }
    }

    return (
        <WalletStateContext.Provider value={{
            starknetAccount,
            imxAccount,
            balances,
            gases,
            isBalanceLoading,
            isGasLoading
        }}>
            <WalletStateUpdateContext.Provider value={{
                connectImx,
                connectStarknet,
                disconnectWallet,
                getBalance,
                getGas,
            }}>
                {children}
            </WalletStateUpdateContext.Provider>
        </WalletStateContext.Provider >
    );
}

export function useWalletState<T>() {
    const data = React.useContext<WalletState>(WalletStateContext);
    if (data === undefined) {
        throw new Error('useWalletStateContext must be used within a WalletStateContext');
    }

    return data;
}

export function useWalletUpdate<T>() {
    const updateFns = React.useContext<WalletStateUpdate>(WalletStateUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useWalletStateUpdateContext must be used within a WalletStateUpdateContext');
    }

    return updateFns;
}

