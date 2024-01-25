import { X } from 'lucide-react';
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import WalletIcon from '../../icons/WalletIcon';
import shortenAddress, { shortenEmail } from '../../utils/ShortenAddress';
import { useAccountModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import SpinIcon from '../../icons/spinIcon';
import { NetworkType } from '../../../Models/CryptoNetwork';
import useWallet from '../../../hooks/useWallet';
import { useBalancesState } from '../../../context/balances';
import { truncateDecimals } from '../../utils/RoundDecimals';
import useBalance from '../../../hooks/useBalance';

const WalletTransferContent: FC = () => {
    const { openAccountModal } = useAccountModal();
    const { getWithdrawalProvider: getProvider, disconnectWallet } = useWallet()
    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()

    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name,
        source_network_asset
    } = swap || {}

    const source_network = layers.find(n => n.internal_name === source_network_internal_name)
    const source_exchange = layers.find(n => n.internal_name === source_exchange_internal_name)
    const source_layer = layers.find(n => n.internal_name === swap?.source_network)
    const source_asset = source_layer?.assets.find(a => a.asset === source_network_asset)

    const sourceNetworkType = source_network?.type
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()

    const { balances, isBalanceLoading } = useBalancesState()
    const { fetchBalance, fetchGas } = useBalance()

    const sourceNetworkWallet = provider?.getConnectedWallet()
    const walletBalance = sourceNetworkWallet && balances[sourceNetworkWallet.address]?.find(b => b?.network === source_layer?.internal_name && b?.token === source_asset?.asset)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, source_asset?.precision)

    useEffect(() => {
        source_layer && fetchBalance(source_layer);
    }, [source_layer, sourceNetworkWallet?.address])

    useEffect(() => {
        sourceNetworkWallet?.address && source_layer && source_asset && fetchGas(source_layer, source_asset, swap?.destination_address || sourceNetworkWallet.address)
    }, [source_layer, source_asset, sourceNetworkWallet?.address])

    const handleDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!wallet) return
        setIsloading(true);
        await disconnectWallet(wallet.providerName, swap)
        if (source_exchange) await mutateSwap()
        setIsloading(false);
        e?.stopPropagation();
    }, [sourceNetworkType, swap?.source_exchange, disconnectWallet])

    let accountAddress: string | undefined = ""
    if (swap?.source_exchange) {
        accountAddress = swap.exchange_account_name || ""
    }
    else if (wallet) {
        accountAddress = wallet.address || "";
    }

    const canOpenAccount = sourceNetworkType === NetworkType.EVM && !swap?.source_exchange

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
                        src={resolveImgSrc(source_exchange)}
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