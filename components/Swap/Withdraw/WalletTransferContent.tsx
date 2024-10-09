import { FC, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import WalletIcon from '../../icons/WalletIcon';
import useWallet from '../../../hooks/useWallet';
import { useBalancesState } from '../../../context/balances';
import useBalance from '../../../hooks/useBalance';
import AddressWithIcon from '../../Input/Address/AddressPicker/AddressWithIcon';
import { AddressGroup } from '../../Input/Address/AddressPicker';
import { RefreshCw } from 'lucide-react';
import { truncateDecimals } from '../../utils/RoundDecimals';
import { useSwitchAccount } from 'wagmi';
import { Wallet } from '../../../stores/walletStore';

const WalletTransferContent: FC = () => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_exchange, source_token, source_network } = swap || {}
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()
    const { provider } = useWallet(source_network, 'withdrawal')
    const all_wallets = provider?.connectedWallets
    const activeWallet = provider?.activeWallet
    const { balances, isBalanceLoading } = useBalancesState()
    const { fetchBalance, fetchGas } = useBalance()
    const { switchAccount, connectors } = useSwitchAccount()
    const walletBalance = activeWallet && balances[activeWallet.address || '']?.find(b => b?.network === source_network?.name && b?.token === source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, source_token?.precision)

    const changeWallet = useCallback(async (wallet: Wallet) => {
        const connector = connectors?.find(c => c.name === wallet.connector)
        if (!connector) return
        switchAccount({ connector })
    }, [provider, connectors])

    useEffect(() => {
        source_network && source_token && fetchBalance(source_network, source_token);
    }, [source_network, source_token, activeWallet?.address])

    useEffect(() => {
        activeWallet?.address && source_network && source_token && fetchGas(source_network, source_token, activeWallet.address)
    }, [source_network, source_token, activeWallet?.address])

    const handleDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!activeWallet) return
        setIsloading(true);
        await activeWallet.disconnect()
        if (source_exchange) await mutateSwap()
        setIsloading(false);
    }, [source_network?.type, swap?.source_exchange, activeWallet, setIsloading, isLoading])

    let accountAddress: string | undefined = ""
    if (swap?.source_exchange) {
        accountAddress = swap.exchange_account_name || ""
    }
    else if (activeWallet) {
        accountAddress = activeWallet.address || "";
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
            all_wallets &&
            source_network &&
            all_wallets.map(wallet => {
                return <div onClick={() => changeWallet(wallet)} key={`${wallet.address}_${wallet.connector}`} className="cursor-pointer group/addressItem flex rounded-lg justify-between space-x-3 items-center shadow-sm mt-1.5 text-primary-text bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 font-medium w-full px-3 py-7">
                    <AddressWithIcon addressItem={{ address: wallet?.address || '', group: AddressGroup.ConnectedWallet }} connectedWallet={wallet} destination={source_network} />
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
                        {
                            activeWallet?.address === wallet.address && activeWallet?.connector === wallet.connector &&
                            <div className="text-right text-secondary-text font-normal text-xs">
                                <span className="text-primary-text">Active</span>
                            </div>
                        }
                    </div>
                </div>
            })
        }
    </div>
}

export default WalletTransferContent