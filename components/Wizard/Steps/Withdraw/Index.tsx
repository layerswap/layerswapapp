import { AlignLeft, Wallet } from 'lucide-react';
import { FC, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import { useSettingsState } from '../../../../context/settings';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';
import SwapSummary from '../../../Swap/Summary/Index';
import WalletTransfer from './WalletTransfer';
import ManualTransfer from './ManualTransfer';
import FiatTransfer from './FiatTransfer';
import { Tab, TabHeader } from '../../../Tabs/Index';
import Processing from './Processing';
import { Widget } from '../../../Widget/Index';

const Withdraw: FC = () => {

    const { swap } = useSwapDataState()
    const { layers } = useSettingsState()
    const { setInterval } = useSwapDataUpdate()

    const source_internal_name = swap?.source_exchange ?? swap.source_network
    const source = layers.find(n => n.internal_name === source_internal_name)

    let isFiat = source.isExchange && source?.type === "fiat"

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
            id: "manually",
            label: "Manually",
            enabled: !isFiat,
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

    useEffect(() => {
        setInterval(15000)
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)
    const activeTab = tabs.find(t => t.id === activeTabId)
    const showTabsHeader = tabs?.filter(t => t.enabled)?.length > 1
    
    return (
        <>
            <Widget>
                <Widget.Content>
                    <div className="w-full min-h-[422px] space-y-5 flex flex-col justify-between h-full text-primary-text">
                        <div className='space-y-4'>
                            <div className='mb-6 grid grid-cols-1 gap-4 space-y-4'>
                                {
                                    !isFiat && <SwapSummary />
                                }
                                {
                                    swapStatusStep === SwapWithdrawalStep.OffRampWithdrawal &&
                                    <>
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
                                    </>
                                }
                                {
                                    swapStatusStep === SwapWithdrawalStep.SwapProcessing &&
                                    <Processing />
                                }
                            </div>
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer>
                    {
                        swapStatusStep === SwapWithdrawalStep.OffRampWithdrawal &&
                        activeTab?.footer
                    }
                </Widget.Footer>
            </Widget>
        </>
    )
}



export default Withdraw