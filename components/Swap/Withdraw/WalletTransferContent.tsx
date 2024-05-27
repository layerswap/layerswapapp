import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import WalletIcon from '../../icons/WalletIcon';
import { useAccountModal } from '@rainbow-me/rainbowkit';
import { NetworkType } from '../../../Models/Network';
import useWallet from '../../../hooks/useWallet';
import { useBalancesState } from '../../../context/balances';
import useBalance from '../../../hooks/useBalance';
import SpinIcon from '../../icons/spinIcon';
import AddressWithIcon from '../../Input/Address/AddressPicker/AddressWithIcon';
import { AddressGroup } from '../../Input/Address/AddressPicker';
import { RefreshCw } from 'lucide-react';

const WalletTransferContent: FC = () => {
    const { openAccountModal } = useAccountModal();
    const { getWithdrawalProvider: getProvider, disconnectWallet } = useWallet()
    const { swapResponse } = useSwapDataState()
    const { swap, deposit_actions } = swapResponse || {}
    const { source_exchange, source_token, destination_token, destination_address, requested_amount, source_network, destination_network } = swap || {}
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()
    const provider = useMemo(() => {
        return source_network && getProvider(source_network)
    }, [source_network, getProvider])

    const wallet = provider?.getConnectedWallet()
    const depositAddress = deposit_actions?.find(da => true)?.to_address

    const { balances, isBalanceLoading } = useBalancesState()
    const { fetchBalance, fetchGas } = useBalance()

    const sourceNetworkWallet = provider?.getConnectedWallet()
    const walletBalance = sourceNetworkWallet && balances[sourceNetworkWallet.address]?.find(b => b?.network === source_network?.name && b?.token === source_token?.symbol)
    // const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, source_token?.precision)

    // useEffect(() => {
    //     source_network && source_token && fetchBalance(source_network, source_token);
    // }, [source_network, source_token, sourceNetworkWallet?.address])

    useEffect(() => {
        sourceNetworkWallet?.address && source_network && source_token && destination_token && destination_network && requested_amount && depositAddress && fetchGas(source_network, source_token, destination_address || sourceNetworkWallet.address)
    }, [source_network, source_token, sourceNetworkWallet?.address])

    const handleDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!wallet) return
        setIsloading(true);
        if (provider?.reconnectWallet) await provider.reconnectWallet(source_network?.chain_id)
        else await disconnectWallet(wallet.providerName, swap)
        if (source_exchange) await mutateSwap()
        setIsloading(false);
        e?.stopPropagation();
    }, [source_network?.type, swap?.source_exchange, disconnectWallet])

    let accountAddress: string | undefined = ""
    if (swap?.source_exchange) {
        accountAddress = swap.exchange_account_name || ""
    }
    else if (wallet) {
        accountAddress = wallet.address || "";
    }

    const canOpenAccount = source_network?.type === NetworkType.EVM && !swap?.source_exchange

    const handleOpenAccount = useCallback(() => {
        if (canOpenAccount && openAccountModal)
            openAccountModal()
    }, [canOpenAccount, openAccountModal])

    if (!accountAddress || (swap?.source_exchange && !swap.exchange_account_connected)) {
        return <>
            <div className='flex justify-center'>
                <WalletIcon className='w-12 text-secondary-800/70' />
            </div>
        </>
    }

    return <div className="grid content-end">
        <div className='flex w-full items-center text-sm justify-between'>
            <span className='ml-1'>{swap?.source_exchange ? "Connected account" : "Send from"}</span>
            <div onClick={handleDisconnect} className="text-secondary-text hover:text-primary-text text-xs rounded-lg flex items-center gap-1.5 transition-colors duration-200 hover:cursor-pointer">
                {
                    isLoading ?
                        <SpinIcon className="animate-spin h-3 w-3" />
                        :
                        <>
                            <RefreshCw className="h-3 w-auto" />
                            <p>Switch Wallet</p>
                        </>
                }
            </div>
        </div>
        {
            provider &&
            wallet &&
            destination_network &&
            <button type="button" onClick={handleOpenAccount} className="group/addressItem flex rounded-lg justify-between space-x-3 items-center cursor-pointer shadow-sm mt-1.5 text-primary-text bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 font-medium w-full px-3 py-7">
                <AddressWithIcon addressItem={{ address: wallet?.address, group: AddressGroup.ConnectedWallet }} connectedWallet={wallet} destination={destination_network} />
            </button>
        }
    </div>
}

export default WalletTransferContent