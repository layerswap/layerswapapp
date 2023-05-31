import { AlignLeft, Wallet } from 'lucide-react';
import { FC, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { useSettingsState } from '../../../../context/settings';
import SwapSummary from '../../../Swap/Summary/Index';
import WalletTransfer from './WalletTransfer';
import ManualTransfer from './ManualTransfer';
import FiatTransfer from './FiatTransfer';
import { Tab, TabHeader } from '../../../Tabs/Index';
import { Widget } from '../../../Widget/Index';
import KnownInternalNames from '../../../../lib/knownIds';
import Coinbase from './Coinbase';

const Withdraw: FC = () => {

    const { swap } = useSwapDataState()
    const { setWithdrawType } = useSwapDataUpdate()
    const { layers } = useSettingsState()

    const source_internal_name = swap?.source_exchange ?? swap.source_network
    const source = layers.find(n => n.internal_name === source_internal_name)

    let isFiat = source.isExchange && source?.type === "fiat"
    const sourceIsStarknet = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
    const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const sourceIsCoinbase = swap?.source_exchange?.toUpperCase() === KnownInternalNames.Exchanges.Coinbase?.toUpperCase()
        

    let tabs: Tab[] = [
        {
            id: "wallet",
            label: "Via wallet",
            enabled: !swap?.source_exchange, //TODO handle other cases
            icon: <Wallet className='stroke-1 -ml-1' />,
            content: <>
                <h1 className='text-xl text-white'>Wallet transfer</h1>
                <p className='text-sm leading-6 mt-1'>
                    Bank transfers,
                    also known as ACH payments, can take up to five business days. To pay via ACH, transfer funds using the following bank information.</p>
            </>,
            footer: <WalletTransfer />
        },
        {
            id: "coinbase",
            label: "Automatic",
            enabled: sourceIsCoinbase, //TODO handle other cases
            icon: <Wallet className='stroke-1 -ml-1' />,
            content: <>
                <h1 className='text-xl text-white'>Wallet transfer</h1>
                <p className='text-sm leading-6 mt-1'>
                    Bank transfers,
                    also known as ACH payments, can take up to five business days. To pay via ACH, transfer funds using the following bank information.</p>
            </>,
            footer: <Coinbase />
        },
        {
            id: "manually",
            label: "Manually",
            enabled: !(isFiat || sourceIsStarknet || sourceIsImmutableX),
            icon: <AlignLeft />,
            content: <ManualTransfer />
        },
        {
            id: "stripe",
            label: "Stripe",
            enabled: isFiat,
            icon: <AlignLeft />,
            content: <FiatTransfer />
        }
    ];

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