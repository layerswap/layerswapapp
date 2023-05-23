import { AlignLeft, ArrowLeftRight, Wallet } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../Models/Wizard';
import { useSettingsState } from '../../../context/settings';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import BackgroundField from '../../backgroundField';
import NetworkSettings from '../../../lib/NetworkSettings';
import KnownInternalNames from '../../../lib/knownIds';
import { GetSwapStatusStep } from '../../utils/SwapStatus';
import Widget from '../Widget';
import { useGoHome } from '../../../hooks/useGoHome';
import TransferFromWallet from './Wallet/Transfer';
import LayerSwapApiClient, { DepositAddress, DepositAddressSource } from '../../../lib/layerSwapApiClient';
import QRCode from 'qrcode.react';
import colors from 'tailwindcss/colors';
import tailwindConfig from '../../../tailwind.config';
import Image from 'next/image';
import { ApiResponse } from '../../../Models/ApiResponse';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import SwapSummary from '../../Swap/Summary/Index';

export enum WithdrawType {
    viaWallet = 'wallet',
    Manually = 'manually'
}

const WithdrawNetworkStep: FC = () => {

    let tabs: Tab[] = [
        {
            id: WithdrawType.viaWallet,
            label: "Via wallet",
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
            id: WithdrawType.Manually,
            label: "Manually",
            icon: <AlignLeft />,
            content: <ManualTransfer />
        }
    ];

    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()

    const [activeTabId, setActiveTabId] = useState(tabs[0].id);


    useEffect(() => {
        setInterval(15000)
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swapStatusStep !== SwapWithdrawalStep.OffRampWithdrawal)
            goToStep(swapStatusStep)
    }, [swapStatusStep])

    const activeTab = tabs.find(t => t.id === activeTabId)

    return (
        <>
            <Widget>
                <Widget.Content>
                    <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                        <div className='space-y-4'>
                            <div className='mb-6 grid grid-cols-1 gap-4 space-y-4'>
                                <SwapSummary withdrawType={activeTab.id} />
                                {
                                    <div className="flex space-x-3 w-full">
                                        {tabs.map((tab) => (
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
            </Widget>
        </>
    )
}


const ManualTransfer: FC = () => {
    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const { source_network: source_network_internal_name, destination_network_asset } = swap
    const source_network = layers.find(n => n.internal_name === source_network_internal_name)
    const asset = source_network?.assets?.find(currency => currency?.asset === destination_network_asset)
    const layerswapApiClient = new LayerSwapApiClient()
    const { data: generatedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.UserGenerated}`, layerswapApiClient.fetcher)
    const generatedDepositAddress = generatedDeposit?.data?.address

    return <div className='rounded-md bg-darkblue-700 border border-darkblue-500 divide-y divide-darkblue-500'>
        <div className={`w-full relative rounded-md px-3 py-3 shadow-sm border-darkblue-700 border bg-darkblue-700 flex flex-col items-center justify-center gap-2`}>
            <div className='p-2 bg-white/30 bg-opacity-30 rounded-xl'>
                <div className='p-2 bg-white/70 bg-opacity-70 rounded-lg'>
                    <QRCode
                        className="p-2 bg-white rounded-md"
                        value={generatedDepositAddress}
                        size={120}
                        bgColor={colors.white}
                        fgColor={tailwindConfig.theme.extend.colors.darkblue.DEFAULT}
                        level={"H"}
                    />
                </div>
            </div>
        </div>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
            <BackgroundField header={'Send type'} withoutBorder>
                <div className='flex items-center space-x-2'>
                    <ArrowLeftRight className='h-4 w-4' />
                    <p>
                        To Another Loopring L2 Account
                    </p>
                </div>
            </BackgroundField>
        }
        <BackgroundField Copiable={true} toCopy={generatedDepositAddress} header={'Deposit Address'} withoutBorder>
            <div>
                {
                    generatedDepositAddress ?
                        <p className='break-all text-white'>
                            {generatedDepositAddress}
                        </p>
                        :
                        <div className='bg-gray-500 w-56 h-5 animate-pulse rounded-md' />
                }
                {
                    (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                    <div className='flex text-xs items-center px-2 py-1 mt-1 border-2 border-darkblue-100 rounded border-dashed'>
                        <p>
                            You might get a warning that this is not an activated address. You can ignore it.
                        </p>
                    </div>
                }
            </div>
        </BackgroundField>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli || source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet) &&
            <div className='flex space-x-4'>
                <BackgroundField header={'Address Type'} withoutBorder>
                    <p>
                        EOA Wallet
                    </p>
                </BackgroundField>
            </div>
        }
        <div className='flex divide-x divide-darkblue-500'>
            <BackgroundField Copiable={true} toCopy={swap?.requested_amount} header={'Amount'} withoutBorder>
                <p>
                    {swap?.requested_amount}
                </p>
            </BackgroundField>
            <BackgroundField header={'Asset'} withoutBorder>
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        {
                            asset &&
                            <Image
                                src={resolveImgSrc({ asset: asset?.asset })}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            />
                        }
                    </div>
                    <div className="mx-1 block">{asset?.asset}</div>
                </div>
            </BackgroundField>
        </div>
    </div>
}

const WalletTransfer: FC = () => {
    const { swap } = useSwapDataState()
    const { layers } = useSettingsState()
    const { source_network: source_network_internal_name, destination_network_asset } = swap
    const source_network = layers.find(n => n.internal_name === source_network_internal_name)
    const sourceCurrency = source_network.assets.find(c => c.asset.toLowerCase() === swap.source_network_asset.toLowerCase())

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: generatedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.UserGenerated}`, layerswapApiClient.fetcher)
    const { data: managedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.Managed}`, layerswapApiClient.fetcher)
    const generatedDepositAddress = generatedDeposit?.data?.address
    const managedDepositAddress = managedDeposit?.data?.address

    const sourceNetworkSettings = NetworkSettings.KnownSettings[source_network_internal_name]
    const sourceChainId = sourceNetworkSettings?.ChainId

    return <div className='border-darkblue-500 rounded-md border bg-darkblue-700 p-3'>
        <TransferFromWallet
            swapId={swap.id}
            networkDisplayName={source_network?.display_name}
            tokenDecimals={sourceCurrency?.decimals}
            tokenContractAddress={sourceCurrency?.contract_address as `0x${string}`}
            chainId={sourceChainId as number}
            generatedDepositAddress={generatedDepositAddress as `0x${string}`}
            managedDepositAddress={managedDepositAddress as `0x${string}`}
            userDestinationAddress={swap.destination_address as `0x${string}`}
            amount={swap.requested_amount} />
    </div>

}


let tabs = [
    {
        id: "wallet",
        label: "Via wallet",
        icon: <Wallet className='stroke-1 -ml-1' />,
        content: <WalletTransfer />
    },
    {
        id: "manually",
        label: "Manually",
        icon: <AlignLeft />,
        content: <ManualTransfer />
    }
];

type Tab = {
    id: string,
    label: string,
    icon: JSX.Element | JSX.Element[],
    content: JSX.Element | JSX.Element[],
    footer?: JSX.Element | JSX.Element[],
}

type TabHeaderProps = {
    tab: Tab,
    activeTabId: string,
    onCLick: (id: string) => void
}

const TabHeader: FC<TabHeaderProps> = ({ tab, onCLick, activeTabId }) => {
    return <button
        key={tab.id}
        onClick={() => onCLick(tab.id)}
        className={`${activeTabId === tab.id ? "bg-darkblue-600 text-primary-text" : "text-primary-text/50 hover:text-primary-text/70 bg-darkblue-800"
            } grow rounded-md text-left relative py-3 px-5 text-sm transition`}
        style={{
            WebkitTapHighlightColor: "transparent",
        }}
    >
        {tab.icon}
        {activeTabId === tab.id && (
            <motion.span
                layoutId="bubble"
                className="absolute inset-0 z-10 bg-darkblue-600 mix-blend-lighten border border-darkblue-100"
                style={{ borderRadius: '6px' }}
                transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
            />
        )}
        {tab.label}
    </button>
}

function AnimatedTabs() {
    let [activeTab, setActiveTab] = useState(tabs[0].id);

    return (
        <div className="flex space-x-3 w-full">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${activeTab === tab.id ? "bg-darkblue-600 text-primary-text" : "text-primary-text/50 hover:text-primary-text/70 bg-darkblue-800"
                        } grow rounded-md text-left relative py-3 px-5 text-sm transition`}
                    style={{
                        WebkitTapHighlightColor: "transparent",
                    }}
                >
                    {tab.icon}
                    {activeTab === tab.id && (
                        <motion.span
                            layoutId="bubble"
                            className="absolute inset-0 z-10 bg-darkblue-600 mix-blend-lighten border border-darkblue-100"
                            style={{ borderRadius: '6px' }}
                            transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
                        />
                    )}
                    {tab.label}
                </button>
            ))}
            {

            }
        </div>
    );
}




export default WithdrawNetworkStep;