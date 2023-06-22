import { AlignLeft, X } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import WalletTransfer from './Wallet';
import ManualTransfer from './ManualTransfer';
import FiatTransfer from './FiatTransfer';
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import KnownInternalNames from '../../../lib/knownIds';
import { Tab, TabHeader } from '../../Tabs/Index';
import Widget from '../../Wizard/Widget';
import SwapSummary from '../Summary';
import Coinbase from './Coinbase';
import { useQueryState } from '../../../context/query';
import External from './External';
import LayerSwapApiClient, { UserExchangesData, WithdrawType } from '../../../lib/layerSwapApiClient';
import WalletIcon from '../../icons/WalletIcon';
import { useAccount } from 'wagmi';
import shortenAddress, { shortenEmail } from '../../utils/ShortenAddress';
import { useAccountModal } from '@rainbow-me/rainbowkit';
import { disconnect as wagmiDisconnect } from '@wagmi/core'
import { useWalletState, useWalletUpdate } from '../../../context/wallet';
import { GetDefaultNetwork } from '../../../helpers/settingsHelper';
import { NetworkAddressType } from '../../../Models/CryptoNetwork';
import { disconnect as starknetDisconnect } from "get-starknet";
import Image from 'next/image';
import { ResolveWalletIcon } from '../../HeaderWithMenu/ConnectedWallets';
import toast from 'react-hot-toast';

const Withdraw: FC = () => {

    const { swap } = useSwapDataState()
    const { setWithdrawType } = useSwapDataUpdate()
    const { layers } = useSettingsState()
    const { addressSource, signature } = useQueryState()

    const source_internal_name = swap?.source_exchange ?? swap.source_network
    const source = layers.find(n => n.internal_name === source_internal_name)

    let isFiat = source.isExchange && source?.type === "fiat"
    const sourceIsStarknet = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
    const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const sourceIsArbitrumOne = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ArbitrumMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.ArbitrumGoerli?.toUpperCase()
    const sourceIsCoinbase = swap?.source_exchange?.toUpperCase() === KnownInternalNames.Exchanges.Coinbase?.toUpperCase()

    const source_network = layers.find(n => n.internal_name === swap?.source_network)
    const sourceAddressType = GetDefaultNetwork(source_network, swap?.source_network_asset)?.address_type
    const manualIsAvailable = !(sourceIsStarknet || sourceIsImmutableX || isFiat)
    const walletIsAvailable = !isFiat
        && !swap?.source_exchange
        && (sourceAddressType === NetworkAddressType.evm
            || sourceAddressType === NetworkAddressType.starknet
            || sourceAddressType === NetworkAddressType.immutable_x)

    const isImtblMarketplace = (signature && addressSource === "imxMarketplace" && sourceIsImmutableX)
    const sourceIsSynquote = addressSource === "ea7df14a1597407f9f755f05e25bab42" && sourceIsArbitrumOne

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
    else if (isFiat) {
        tabs = [{
            id: WithdrawType.Stripe,
            label: "Stripe",
            enabled: true,
            icon: <AlignLeft />,
            content: <FiatTransfer />
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
                content: <ManualTransfer />,
            }
        ];
    }
    const [activeTabId, setActiveTabId] = useState(tabs.find(t => t.enabled)?.id);

    const activeTab = tabs.find(t => t.id === activeTabId)
    const showTabsHeader = tabs?.filter(t => t.enabled)?.length > 1

    useEffect(() => {
        setWithdrawType(activeTab.id)
    }, [activeTab])

    return (
        <>
            <Widget.Content>
                <div className="w-full flex flex-col justify-between h-full text-primary-text">
                    <div className='grid grid-cols-1 gap-4 '>
                        {
                            !isFiat && <SwapSummary />
                        }
                        <span>

                            {
                                showTabsHeader &&
                                <>
                                    <div className="mb-3 ml-1">Choose how you’d like to complete the swap</div>
                                    <div className="flex space-x-3 w-full">
                                        {tabs.filter(t => t.enabled).map((tab) => (
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
            <Widget.Footer>
                {
                    activeTab?.footer
                }
            </Widget.Footer>
        </>
    )
}

const WalletTransferContent: FC = () => {
    const { isConnected, address, connector } = useAccount();
    const { openAccountModal } = useAccountModal();
    const { starknetAccount, authorizedCoinbaseAccount } = useWalletState()
    const { setStarknetAccount, setAuthorizedCoinbaseAccount } = useWalletUpdate()

    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()

    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name,
        source_network_asset } = swap
    const source_network = layers.find(n => n.internal_name === source_network_internal_name)
    const source_exchange = layers.find(n => n.internal_name === source_exchange_internal_name)

    const sourceAddressType = GetDefaultNetwork(source_network, source_network_asset)?.address_type

    const handleDisconnectCoinbase = useCallback(async () => {
        try {
            const apiClient = new LayerSwapApiClient()
            await apiClient.DeleteExchange("coinbase")
            setAuthorizedCoinbaseAccount(null)
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [])


    const handleDisconnect = useCallback(() => {
        if (swap.source_exchange) {
            handleDisconnectCoinbase()
        }
        else if (sourceAddressType === NetworkAddressType.evm) {
            wagmiDisconnect()
        }
        else if (sourceAddressType === NetworkAddressType.starknet) {
            starknetDisconnect({ clearLastWallet: true })
            setStarknetAccount(null)
        }
    }, [sourceAddressType, swap.source_exchange])

    let accountAddress = ""
    if (sourceAddressType === NetworkAddressType.evm) {
        accountAddress = address;
    }
    else if (sourceAddressType === NetworkAddressType.starknet) {
        accountAddress = starknetAccount?.account?.address;
    }

    const canOpenAccount = sourceAddressType === NetworkAddressType.evm && !swap.source_exchange

    const handleOpenAccount = useCallback(() => {
        if (canOpenAccount)
            openAccountModal()
    }, [canOpenAccount])

    if (!accountAddress || (swap.source_exchange && !authorizedCoinbaseAccount)) {
        return <>
            <div className='flex justify-center'>
                <WalletIcon className='w-36 text-secondary-800/70' />
            </div>
        </>
    }

    return <div className="h-36 grid content-end">
        {
            swap.source_exchange ?
                <span className='mb-1 font-medium'>Connected account</span>
                : <span className='mb-1 font-medium'>Connected wallet</span>
        }

        <div onClick={handleOpenAccount} className={`${canOpenAccount ? 'cursor-pointer' : 'cursor-auto'} text-left min-h-12  space-x-2 border border-secondary-300 ea7df14a1597407f9f755f05e25bab42:bg-secondary-800/50 bg-secondary-700/70 shadow-xl flex text-sm rounded-md items-center w-full pl-4 pr-2 py-1.5`}>
            <div className='flex text-primary-text bg-secondary-400 flex-row items-left rounded-md p-1'>
                {
                    !swap.source_exchange
                    && sourceAddressType === NetworkAddressType.starknet
                    && <Image
                        src={starknetAccount?.icon}
                        alt={accountAddress}
                        width={25}
                        height={25} />
                }
                {
                    !swap.source_exchange
                    && sourceAddressType === NetworkAddressType.evm
                    && <ResolveWalletIcon
                        connector={connector?.id}
                        className="w-6 h-6 rounded-full"
                    />
                }
                {
                    swap.source_exchange
                    && <Image
                        className="w-6 h-6 rounded-full p-0"
                        src={resolveImgSrc(source_exchange)}
                        alt={accountAddress}
                        width={25}
                        height={25} />
                }
            </div>
            <div className="flex flex-col grow">
                <div className="block text-md font-medium text-white">
                    {!swap.source_exchange && <span>
                        {shortenAddress(accountAddress)}
                    </span>}
                    {swap.source_exchange && <span>
                        {shortenEmail(authorizedCoinbaseAccount?.note)}
                    </span>}
                </div>
            </div>
            <div onClick={handleDisconnect} className='cursor-pointer flex text-primary-text flex-row items-left p-2 rounded-md transform hover:bg-secondary-500 transition duration-200 hover:border-secondary-500 hover:shadow-xl'>
                <X className='h-5' />
            </div>
        </div>
    </div>
}

export default Withdraw