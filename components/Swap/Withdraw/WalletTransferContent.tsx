import { X } from 'lucide-react';
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import WalletIcon from '../../icons/WalletIcon';
import shortenAddress, { shortenEmail } from '../../utils/ShortenAddress';
import { useAccountModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import SpinIcon from '../../icons/spinIcon';
import { NetworkType } from '../../../Models/Network';
import useWallet from '../../../hooks/useWallet';
import { useBalancesState } from '../../../context/balances';
import { truncateDecimals } from '../../utils/RoundDecimals';
import useBalance from '../../../hooks/useBalance';
import { useSettingsState } from '../../../context/settings';

const WalletTransferContent: FC = () => {
    const { openAccountModal } = useAccountModal();
    const { getWithdrawalProvider: getProvider, disconnectWallet } = useWallet()
    const { swapResponse } = useSwapDataState()
    const { swap, deposit_methods } = swapResponse || {}
    const { source_exchange, source_token, destination_token, destination_address, requested_amount } = swap || {}
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()
    const { networks } = useSettingsState()
    const source_network = networks.find(n => n.name === swap?.source_network?.name)
    const destination_network = networks.find(n => n.name === swap?.destination_network?.name)
    
    const provider = useMemo(() => {
        return source_network && getProvider(source_network)
    }, [source_network, getProvider])

    const wallet = provider?.getConnectedWallet()

    const { balances, isBalanceLoading } = useBalancesState()
    const { fetchBalance, fetchGas } = useBalance()

    const sourceNetworkWallet = provider?.getConnectedWallet()
    const walletBalance = sourceNetworkWallet && balances[sourceNetworkWallet.address]?.find(b => b?.network === source_network?.name && b?.token === source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, source_token?.precision)

    useEffect(() => {
        source_network && fetchBalance(source_network);
    }, [source_network, sourceNetworkWallet?.address])

    useEffect(() => {
        sourceNetworkWallet?.address && source_network && source_token && destination_token && destination_network && requested_amount && deposit_methods?.wallet.to_address && fetchGas(source_network, source_token, destination_network, destination_token, destination_address || sourceNetworkWallet.address, requested_amount?.toString())
    }, [source_network, source_token, sourceNetworkWallet?.address])

    const handleDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!wallet) return
        setIsloading(true);
        await disconnectWallet(wallet.providerName, swap)
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
        <div className='flex w-full items-center text-sm justify-between mb-1 '>
            <span className='ml-1'>{swap?.source_exchange ? "Connected account" : "Connected wallet"}</span>
            {
                walletBalanceAmount != undefined && !isNaN(walletBalanceAmount) ?
                    <div className="text-right">
                        <div>
                            <span>Balance:&nbsp;</span>
                            {isBalanceLoading ?
                                <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                                :
                                <span>{walletBalanceAmount}</span>}
                        </div>
                    </div>
                    :
                    <></>
            }
        </div>
        <div onClick={handleOpenAccount} className={`${canOpenAccount ? 'cursor-pointer' : 'cursor-auto'} text-left min-h-12  space-x-2 border border-secondary-600 bg-secondary-700/70 flex text-sm rounded-md items-center w-full pl-4 pr-2 py-1.5`}>
            <div className='flex text-secondary-text bg-secondary-400 flex-row items-left rounded-md p-1'>
                {
                    !swap?.source_exchange
                    && wallet?.connector
                    && <wallet.icon
                        className="w-6 h-6 rounded-full"
                    />
                }
                {
                    source_exchange
                    && <Image
                        className="w-6 h-6 rounded-full p-0"
                        src={source_exchange.logo}
                        alt={accountAddress}
                        width={25}
                        height={25} />
                }
            </div>
            <div className="flex flex-col grow">
                <div className="block text-md font-medium text-primary-text">
                    {!swap?.source_exchange && <span>
                        {shortenAddress(accountAddress)}
                    </span>}
                    {swap?.source_exchange && <span>
                        {shortenEmail(swap?.exchange_account_name)}
                    </span>}
                </div>
            </div>
            <div onClick={handleDisconnect} className='cursor-pointer flex text-secondary-text flex-row items-left p-2 rounded-md transform hover:bg-secondary-500 transition duration-200 hover:border-secondary-500 hover:shadow-xl'>
                {isLoading ? <SpinIcon className="animate-spin h-5 w-5" /> : <X className='h-5' />}
            </div>
        </div>
    </div>
}

export default WalletTransferContent