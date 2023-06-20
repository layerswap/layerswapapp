import { AlignLeft } from 'lucide-react';
import { FC, useEffect, useState } from 'react'
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
import { WithdrawType } from '../../../lib/layerSwapApiClient';
import WalletIcon from '../../icons/WalletIcon';
import { useAccount } from 'wagmi';

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
                content: <>
                    <div className='flex justify-center'>
                        <WalletIcon className='w-52 h-52 text-[#141c31]' />
                    </div>
                </>,
                footer: <WalletTransfer />
            }]
    }
    else {
        tabs = [
            {
                id: WithdrawType.Wallet,
                label: "Via wallet",
                enabled: !swap?.source_exchange,
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-0.5' />,
                content: <>
                    <div className='flex justify-center'>
                        <WalletIcon className='w-36 text-secondary-800/70' />
                    </div>
                </>,
                footer: <WalletTransfer />
            },
            {
                id: WithdrawType.Coinbase,
                label: "Automatically",
                enabled: sourceIsCoinbase,
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-0.5' />,
                content: <>
                    <div className='flex justify-center'>
                        <WalletIcon className='w-36 text-secondary-800/70' />
                    </div>
                </>,
                footer: <Coinbase />
            },
            {
                id: WithdrawType.Manually,
                label: "Manually",
                enabled: true,
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
                            {
                                activeTab?.content
                            }
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
    const { isConnected, address } = useAccount();

    return <div className='flex justify-center'>
        <WalletIcon className='w-36 text-secondary-800/70' />
        <button
            onClick={() => { }}
            className={"text-primary-text hover:text-primary-text bg-secondary-800 grow rounded-md text-left relative py-3 px-5 text-sm transition"}
            style={{
                WebkitTapHighlightColor: "transparent",
            }}
        >
            {address}
        </button>
    </div>
}


export default Withdraw