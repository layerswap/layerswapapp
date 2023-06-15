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
    const sourceIsCoinbase = swap?.source_exchange?.toUpperCase() === KnownInternalNames.Exchanges.Coinbase?.toUpperCase()

    const isImtblMarketplace = (signature && addressSource === "imxMarketplace")
    const sourceIsSynquote = addressSource === "ea7df14a1597407f9f755f05e25bab42"

    let tabs: Tab[] = []
    // TODO refactor
    if (isImtblMarketplace || sourceIsSynquote) {
        tabs = [{
            id: WithdrawType.External,
            label: "Withdrawal pending",
            enabled: true,
            icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-1' />,
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
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-1' />,
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
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-1' />,
                content: <>
                    <div className='flex justify-center'>
                        <WalletIcon className='w-52 h-52 text-[#141c31]' />
                    </div>
                </>,
                footer: <WalletTransfer />
            },
            {
                id: WithdrawType.Coinbase,
                label: "Automatic",
                enabled: sourceIsCoinbase,
                icon: <WalletIcon className='stroke-2 w-6 h-6 -ml-1' />,
                content: <>
                    <div className='flex justify-center'>
                        <WalletIcon className='w-52 h-52 text-[#141c31]' />
                    </div>
                </>,
                footer: <Coinbase />
            },
            {
                id: WithdrawType.Manually,
                label: "Manually",
                enabled: true,
                icon: <AlignLeft />,
                content: <ManualTransfer />
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
                <div className="w-full min-h-[422px] space-y-5 flex flex-col justify-between h-full text-primary-text">
                    <div className='space-y-4'>
                        <div className='mb-6 grid grid-cols-1 gap-4 space-y-4'>
                            {
                                !isFiat && <SwapSummary />
                            }
                            {
                                showTabsHeader &&
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
                            }
                            <span>
                                {
                                    activeTab?.content
                                }
                            </span>
                        </div>
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

export default Withdraw