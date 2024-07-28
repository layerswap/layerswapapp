import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../../../context/swap';
import WalletIcon from '../../../../icons/WalletIcon';
import useWallet from '../../../../../hooks/useWallet';
import { useBalancesState } from '../../../../../context/balances';
import useBalance from '../../../../../hooks/useBalance';
import AddressWithIcon from '../../../../Input/Address/AddressPicker/AddressWithIcon';
import { AddressGroup } from '../../../../Input/Address/AddressPicker';
import { RefreshCw } from 'lucide-react';
import { truncateDecimals } from '../../../../utils/RoundDecimals';
import { useSettingsState } from '../../../../../context/settings';
import KnownInternalNames from '../../../../../lib/knownIds';
import { NetworkWithTokens } from '../../../../../Models/Network';
import { useWalletStore } from '../../../../../stores/walletStore';
import { ConnectWalletButton } from './buttons';
import { ResolveConnectorIcon } from '../../../../icons/ConnectorIcons';

const WalletTransferContent: FC = () => {
    const { getWithdrawalProvider, disconnectWallet } = useWallet()
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_exchange, source_network } = swap || {}
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()
    const select = useWalletStore((state) => state.selectProvider)
    const selectedProvider = useWalletStore((state) => state.selectedProveder)

    const { networks } = useSettingsState();

    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);

    const evmProvider = useMemo(() => {
        return l1Network && getWithdrawalProvider(l1Network)
    }, [l1Network, getWithdrawalProvider])

    const starknetProvider = useMemo(() => {
        return starknet && getWithdrawalProvider(starknet)
    }, [l1Network, getWithdrawalProvider])

    const evmWallet = evmProvider?.getConnectedWallet()

    const handleEvmDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!evmWallet) return
        setIsloading(true);
        if (evmProvider?.reconnectWallet) await evmProvider.reconnectWallet(source_network?.chain_id)
        else await disconnectWallet(evmWallet.providerName, swap)
        if (source_exchange) await mutateSwap()
        setIsloading(false);
    }, [source_network?.type, swap?.source_exchange, disconnectWallet, setIsloading, isLoading])

    let evmAccountAddress: string | undefined = ""
    if (swap?.source_exchange) {
        evmAccountAddress = swap.exchange_account_name || ""
    }
    else if (evmWallet) {
        evmAccountAddress = evmWallet.address || "";
    }
    const starknetWallet = starknetProvider?.getConnectedWallet()

    useEffect(() => {
        if (!selectedProvider) {
            if (evmWallet && evmProvider) select(evmProvider.name)
            else if (starknetWallet && starknetProvider) select(starknetProvider.name)
        }
    }, [evmAccountAddress, starknetWallet, selectedProvider])

    const handleStarknetDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!starknetWallet) return
        setIsloading(true);
        if (evmProvider?.reconnectWallet) await evmProvider.reconnectWallet(source_network?.chain_id)
        else await disconnectWallet(starknetWallet.providerName, swap)
        if (source_exchange) await mutateSwap()
        setIsloading(false);
    }, [source_network?.type, swap?.source_exchange, disconnectWallet, setIsloading, isLoading])

    let starknetAccountAddress: string | undefined = ""
    if (swap?.source_exchange) {
        starknetAccountAddress = swap.exchange_account_name || ""
    }
    else if (starknetWallet) {
        starknetAccountAddress = starknetWallet.address || "";
    }


    if (!evmAccountAddress && !starknetAccountAddress) {
        return <>
            <div className='flex justify-center'>
                <WalletIcon className='w-12 text-secondary-800/70' />
            </div>
        </>
    }

    return <>
        <div className="grid content-end space-y-2">
            <span>
                <span className='ml-1'>{swap?.source_exchange ? "Connected account" : "Send from"}</span>
            </span>
            <Content network={l1Network} />
            <Content network={starknet} />
            {
                !evmAccountAddress && evmProvider &&
                <ConnectWalletButton
                    secondary={true}
                    network={l1Network}
                    text='Connect EVM'
                    onConnect={() => select(evmProvider?.name)}
                    icon={<ResolveConnectorIcon
                        connector={evmProvider?.name}
                        iconClassName="w-7 h-7 p-0.5 rounded-full bg-secondary-800 border border-secondary-400"
                    />}
                />
            }
            {
                !starknetAccountAddress && starknetProvider &&
                <ConnectWalletButton
                    secondary={true}
                    network={starknet}
                    text='Connect Starknet'
                    onConnect={() => select(starknetProvider?.name)}
                    icon={<ResolveConnectorIcon
                        connector={starknetProvider?.name}
                        iconClassName="w-7 h-7 p-0.5 rounded-full bg-secondary-800 border border-secondary-400"
                    />}
                />
            }
        </div>
    </>
}


const Content: FC<{ network: NetworkWithTokens | undefined }> = ({ network }) => {

    const { getWithdrawalProvider, disconnectWallet } = useWallet()
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_exchange, source_network } = swap || {}
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()
    const selectedProvider = useWalletStore((state) => state.selectedProveder)
    const select = useWalletStore((state) => state.selectProvider)


    const provider = useMemo(() => {
        return network && getWithdrawalProvider(network)
    }, [network, getWithdrawalProvider])

    const isSelected = selectedProvider === provider?.name


    const wallet = provider?.getConnectedWallet()

    const handleDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!wallet) return
        setIsloading(true);
        if (provider?.reconnectWallet) await provider.reconnectWallet(source_network?.chain_id)
        else await disconnectWallet(wallet.providerName, swap)
        if (source_exchange) await mutateSwap()
        setIsloading(false);
    }, [source_network?.type, swap?.source_exchange, disconnectWallet, setIsloading, isLoading])

    let accountAddress: string | undefined = ""
    if (swap?.source_exchange) {
        accountAddress = swap.exchange_account_name || ""
    }
    else if (wallet) {
        accountAddress = wallet.address || "";
    }

    if (!accountAddress || (swap?.source_exchange && !swap.exchange_account_connected)) {
        return <></>
    }

    return <>
        {provider &&
            wallet &&
            source_network &&
            <>
                {/* <div onClick={handleDisconnect} className={"text-secondary-text justify-end hover:text-primary-text text-xs rounded-lg flex items-center gap-1.5 transition-colors duration-200 hover:cursor-pointer"}>
                    {
                        isLoading ?
                            <RefreshCw className="h-3 w-auto animate-spin" />
                            :
                            <RefreshCw className="h-3 w-auto" />
                    }
                    <p>Switch Wallet</p>
                </div> */}
                <div
                    onClick={() => select(provider?.name)}
                    className={`${isSelected ? 'bg-secondary-700 border-secondary-500 text-primary-text' : 'bg-secondary-900 border-secondary-700 text-secondary-text cursor-pointer hover:text-primary-text hover:border-secondary-500'} group/addressItem flex rounded-lg justify-between space-x-3 items-center shadow-sm mt-1.5 border disabled:cursor-not-allowed h-12 leading-4 font-medium w-full px-3 py-7`}>
                    <AddressWithIcon addressItem={{ address: wallet?.address, group: AddressGroup.ConnectedWallet }} connectedWallet={wallet} network={source_network} />
                    {
                        !isSelected &&
                        <div className='font-light text-sm'>
                            Select
                        </div>
                    }
                </div>
            </>
        }
    </>
}


export default WalletTransferContent