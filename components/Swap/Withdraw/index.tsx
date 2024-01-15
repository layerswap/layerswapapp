import { AlignLeft, X } from 'lucide-react';
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import WalletTransfer from './Wallet';
import ManualTransfer from './ManualTransfer';
import FiatTransfer from './FiatTransfer';
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import KnownInternalNames from '../../../lib/knownIds';
import { Tab, TabHeader } from '../../Tabs/Index';
import SwapSummary from '../Summary';
import Coinbase from './Coinbase';
import External from './External';
import { WithdrawType } from '../../../lib/layerSwapApiClient';
import WalletIcon from '../../icons/WalletIcon';
import shortenAddress, { shortenEmail } from '../../utils/ShortenAddress';
import { useAccountModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import SpinIcon from '../../icons/spinIcon';
import { NetworkType } from '../../../Models/CryptoNetwork';
import useWallet from '../../../hooks/useWallet';
import { useQueryState } from '../../../context/query';
import { Widget } from '../../Widget/Index';

const Withdraw: FC = () => {
    const { swap } = useSwapDataState()
    const { setWithdrawType } = useSwapDataUpdate()
    const { layers } = useSettingsState()
    const { appName, signature } = useQueryState()
    const source_internal_name = swap?.source_exchange ?? swap?.source_network
    const source = layers.find(n => n.internal_name === source_internal_name)

    const sourceIsStarknet = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.StarkNetSepolia?.toUpperCase()
    const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const sourceIsZkSync = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ZksyncMainnet?.toUpperCase()
    const sourceIsArbitrumOne = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ArbitrumMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.ArbitrumGoerli?.toUpperCase()
    const sourceIsCoinbase = swap?.source_exchange?.toUpperCase() === KnownInternalNames.Exchanges.Coinbase?.toUpperCase()

    const source_layer = layers.find(n => n.internal_name === swap?.source_network)
    const sourceNetworkType = source_layer?.type
    const manualIsAvailable = !(sourceIsStarknet || sourceIsImmutableX)
    const walletIsAvailable = !swap?.source_exchange
        && (sourceNetworkType === NetworkType.EVM
            || sourceNetworkType === NetworkType.Starknet
            || sourceIsImmutableX || sourceIsZkSync)

    const isImtblMarketplace = (signature && appName === "imxMarketplace" && sourceIsImmutableX)
    const sourceIsSynquote = appName === "ea7df14a1597407f9f755f05e25bab42" && sourceIsArbitrumOne

    let tabs: Tab[] = []
    // TODO refactor
    if (isImtblMarketplace || sourceIsSynquote) {
        tabs = [{
            id: WithdrawType.External,
            label: "Withdrawal pending",
            enabled: true,
            icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-0.5' />,
            content: <External />
        }]
    }
    else if (sourceIsStarknet || sourceIsImmutableX) {
        tabs = [
            {
                id: WithdrawType.Wallet,
                label: "Via wallet",
                enabled: true,
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-0.5' />,
                content: <WalletTransferContent />,
                footer: <WalletTransfer />
            }]
    }
    else {
        tabs = [
            {
                id: WithdrawType.Wallet,
                label: "Via wallet",
                enabled: walletIsAvailable,
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-0.5' />,
                content: <WalletTransferContent />,
                footer: <WalletTransfer />
            },
            {
                id: WithdrawType.Coinbase,
                label: "Automatically",
                enabled: sourceIsCoinbase,
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-0.5' />,
                content: <WalletTransferContent />,
                footer: <Coinbase />
            },
            {
                id: WithdrawType.Manually,
                label: "Manually",
                enabled: manualIsAvailable,
                icon: <AlignLeft />,
                footer: <ManualTransfer />,
                content: <></>
            }
        ];
    }
    const [activeTabId, setActiveTabId] = useState(tabs.find(t => t.enabled)?.id);

    const activeTab = tabs.find(t => t.id === activeTabId)
    const showTabsHeader = tabs?.filter(t => t.enabled)?.length > 1

    useEffect(() => {
        activeTab && setWithdrawType(activeTab.id)
    }, [activeTab])

    return (
        <>
            <Widget.Content>
                <div className="w-full flex flex-col justify-between  text-secondary-text">
                    <div className='grid grid-cols-1 gap-4 '>
                        <div className="bg-secondary-700 rounded-lg px-3 py-4 border border-secondary-500 w-full relative z-10 space-y-4">
                            <SwapSummary />
                        </div>
                        <span>

                            {
                                showTabsHeader &&
                                <>
                                    <div className="mb-4 ml-1 text-base">Choose how you&apos;d like to complete the swap</div>
                                    <div className="flex space-x-3 w-full">
                                        {activeTabId && tabs.filter(t => t.enabled).map((tab) => (
                                            <TabHeader
                                                activeTabId={activeTabId}
                                                onCLick={setActiveTabId}
                                                tab={tab}
                                                key={tab.id}
                                            />
                                        ))}
                                    </div>
                                </>
                            }
                        </span>
                        <span>
                            {activeTab?.content}
                        </span>
                    </div>
                </div>
            </Widget.Content>
            {
                activeTab?.footer &&
                <Widget.Footer sticky={true} key={activeTabId}>
                    {activeTab?.footer}
                </Widget.Footer>
            }
        </>
    )
}

const WalletTransferContent: FC = () => {
    const { openAccountModal } = useAccountModal();
    const { getWithdrawalProvider: getProvider, disconnectWallet } = useWallet()
    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const [isLoading, setIsloading] = useState(false);
    const { mutateSwap } = useSwapDataUpdate()

    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name } = swap || {}

    const source_network = layers.find(n => n.internal_name === source_network_internal_name)
    const source_exchange = layers.find(n => n.internal_name === source_exchange_internal_name)
    const source_layer = layers.find(n => n.internal_name === swap?.source_network)

    const sourceNetworkType = source_network?.type
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()

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
        {
            <span className='mb-1 ml-1 text-sm'>{swap?.source_exchange ? "Connected account" : "Connected wallet"}</span>
        }

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

export default Withdraw