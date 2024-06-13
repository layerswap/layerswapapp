import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import WalletIcon from '../../icons/WalletIcon';
import useWallet from '../../../hooks/useWallet';
import { useBalancesState } from '../../../context/balances';
import useBalance from '../../../hooks/useBalance';
import AddressWithIcon from '../../Input/Address/AddressPicker/AddressWithIcon';
import { AddressGroup } from '../../Input/Address/AddressPicker';
import { RefreshCw } from 'lucide-react';
import { truncateDecimals } from '../../utils/RoundDecimals';

const WalletTransferContent: FC = () => {
    const { getWithdrawalProvider: getProvider, disconnectWallet } = useWallet()
    const { swapResponse, depositActionsResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_exchange, source_token, destination_token, destination_address, requested_amount, source_network, destination_network } = swap || {}
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()
    const provider = useMemo(() => {
        return source_network && getProvider(source_network)
    }, [source_network, getProvider])

    const wallet = provider?.getConnectedWallet()
    const depositAddress = depositActionsResponse?.find(da => true)?.to_address

    const { balances, isBalanceLoading } = useBalancesState()
    const { fetchBalance, fetchGas } = useBalance()

    const sourceNetworkWallet = provider?.getConnectedWallet()
    const walletBalance = sourceNetworkWallet && balances[sourceNetworkWallet.address]?.find(b => b?.network === source_network?.name && b?.token === source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, source_token?.precision)

    useEffect(() => {
        source_network && source_token && fetchBalance(source_network, source_token);
    }, [source_network, source_token, sourceNetworkWallet?.address])

    useEffect(() => {
        sourceNetworkWallet?.address && source_network && source_token && destination_token && destination_network && requested_amount && depositAddress && fetchGas(source_network, source_token, destination_address || sourceNetworkWallet.address)
    }, [source_network, source_token, sourceNetworkWallet?.address, destination_token, destination_network, requested_amount, depositAddress])

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
                        <RefreshCw className="h-3 w-auto animate-spin" />
                        :
                        <RefreshCw className="h-3 w-auto" />
                }
                <p>Switch Wallet</p>
            </div>
        </div>
        {
            provider &&
            wallet &&
            destination_network &&
            <div className="group/addressItem flex rounded-lg justify-between space-x-3 items-center shadow-sm mt-1.5 text-primary-text bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 font-medium w-full px-3 py-7">
                <AddressWithIcon addressItem={{ address: wallet?.address, group: AddressGroup.ConnectedWallet }} connectedWallet={wallet} destination={destination_network} />
                <div>
                    {
                        walletBalanceAmount != undefined && !isNaN(walletBalanceAmount) ?
                            <div className="text-right text-secondary-text font-normal text-sm">
                                {
                                    isBalanceLoading ?
                                        <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                                        :
                                        <>
                                            <span>{walletBalanceAmount}</span> <span>{source_token?.symbol}</span>
                                        </>
                                }
                            </div>
                            :
                            <></>
                    }
                </div>
            </div>
        }
    </div>
}

export default WalletTransferContent