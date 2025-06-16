import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal, WalletModalConnector } from ".";
import { InternalConnector, Wallet, WalletProvider } from "../../Models/WalletProvider";
import { CircleX, Link2Off, RotateCw, Search, SlidersHorizontal, XCircle } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "../buttons/copyButton";
import clsx from "clsx";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import Connector from "./Connector";
import { removeDuplicatesWithKey } from "./utils";
import VaulDrawer from "../modal/vaulModal";
import { usePersistedState } from "../../hooks/usePersistedState";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import LayerSwapLogoSmall from "../icons/layerSwapLogoSmall";
import { Checkbox } from "../shadcn/checkbox";
import { ImageWithFallback } from "../Common/ImageWithFallback";

const ConnectorsLsit: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { isMobile } = useWindowDimensions()
    const { providers } = useWallet();
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector } = useConnectModal()
    let [recentConnectors, setRecentConnectors] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
    const [searchValue, setSearchValue] = useState<string | undefined>(undefined)
    const [isFocused, setIsFocused] = useState(false)
    const [showEcosystemSeletion, setShowEcosystemSelection] = useState(false)
    const [selectedMultiChainConnector, setSelectedMultiChainConnector] = useState<InternalConnector | undefined>(undefined)

    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<any>(null);

    const handleScroll = () => {
        setIsScrolling(true);

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1000);
    };

    useEffect(() => {
        return () => clearTimeout(scrollTimeout.current as any);
    }, []);

    const connect = async (connector: InternalConnector, provider: WalletProvider) => {
        try {
            setConnectionError(undefined)
            if (connector.isMultiChain) {
                setSelectedMultiChainConnector(connector)
                return setShowEcosystemSelection(true)
            }
            setSelectedConnector(connector)
            if (connector.installUrl) return

            const result = provider?.connectWallet && await provider.connectWallet({ connector })

            window.safary?.track({
                eventName: 'connected_wallet',
                eventType: 'connect',
                parameters: {
                    custom_str_1_label: 'wallet_name',
                    custom_str_1_value: connector.name,
                    custom_str_2_label: 'network',
                    custom_str_2_value: provider.id,
                    custom_str_3_label: 'address',
                    custom_str_3_value: result?.address || '',
                }
            })

            if (result && connector && provider) {
                setRecentConnectors((prev) => [...(prev?.filter(v => v.providerName !== provider.name) || []), { providerName: provider.name, connectorName: connector.name }])
                onFinish(result)
            }
            setSelectedConnector(undefined)
        } catch (e) {
            console.log(e)
            if (e?.message?.toLowerCase().includes('rejected') || e?.details?.toLowerCase().includes('rejected')) {
                setConnectionError("You've declined the wallet connection request")
            }
            else {
                setConnectionError(e.message || e.details || 'Something went wrong')
            }
        }
    }

    const handleSelectProvider = (providerName?: string) => {
        const provider = filteredProviders.find(p => p.name === providerName)
        if (!provider) return setSelectedProvider(undefined)
        setSelectedProvider({ ...provider, isSelectedFromFilter: true })
    }

    const filteredProviders = providers.filter(p => !p.hideFromList)
    const featuredProviders = selectedProvider ? [selectedProvider] : filteredProviders

    const allConnectors = featuredProviders.filter(g => g.availableWalletsForConnect && g.availableWalletsForConnect?.length > 0).map((provider) =>
        provider.availableWalletsForConnect?.filter(v => (isFocused || searchValue) ? (searchValue ? v.name.toLowerCase().includes(searchValue?.toLowerCase()) : false) : true).map((connector) => ({ ...connector, providerName: provider.name }))).flat()

    const resolvedConnectors: InternalConnector[] = useMemo(() => removeDuplicatesWithKey(allConnectors, 'name'), [allConnectors])

    if (selectedConnector?.qr?.state) {
        const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });

        return <div className="flex flex-col justify-start space-y-2">
            <p className="text-secondary-text">
                Scan the QR code with your phone
            </p>
            <div className="w-full h-full bg-secondary-600 pb-3 pt-5 rounded-lg">
                <div className='flex flex-col justify-center items-center pt-2 w-fit mx-auto'>
                    {
                        selectedConnector?.qr.state == 'fetched' ?
                            <QRCodeSVG
                                className="rounded-lg"
                                value={selectedConnector?.qr.value}
                                includeMargin={true}
                                size={264}
                                level={"H"}
                                imageSettings={
                                    selectedConnector.icon
                                        ? {
                                            src: selectedConnector.icon,
                                            height: 50,
                                            width: 50,
                                            excavate: true,
                                        }
                                        : undefined
                                }
                            />
                            :
                            <div className="w-[264px] h-[264px] relative" >
                                <div className="w-full h-full bg-secondary-500 animate-pulse rounded-xl" />
                                <ConnectorIcon className='h-[50px] w-[50px] absolute top-[calc(50%-25px)] right-[calc(50%-25px)]' />
                            </div>
                    }
                    <div className='bg-secondary-400 text-secondary-text w-full px-2 py-1.5 rounded-md mt-3 flex justify-center items-center'>
                        <CopyButton toCopy={selectedConnector?.qr.value || ''}>Copy QR URL</CopyButton>
                    </div>
                </div>
            </div>
        </div>
    }

    if (selectedConnector) {
        const connector = allConnectors.find(c => c?.name === selectedConnector.name)
        const provider = featuredProviders.find(p => p.name === connector?.providerName)
        return <LoadingConnect
            isMobile={isMobile}
            onRetry={() => { connect(connector!, provider!) }}
            selectedConnector={selectedConnector}
            connectionError={connectionError}
        />
    }

    return (
        <>
            <div className="text-primary-text space-y-3">
                <div className="flex items-center gap-3">
                    <div className="relative z-0 flex items-center px-3 rounded-lg bg-secondary-600 border border-secondary-500 w-full">
                        <Search className="w-6 h-6 mr-2 text-primary-text-placeholder" />
                        <input
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Search wallet"
                            autoComplete="off"
                            className="placeholder:text-primary-text-placeholder border-0 border-b-0 border-primary-text focus:border-primary-text appearance-none block py-2.5 px-0 w-full h-10 bg-transparent text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        {
                            searchValue &&
                            <button type="button" onClick={() => setSearchValue('')} className="absolute right-3">
                                <XCircle className="w-4 h-4 text-primary-text-placeholder" />
                            </button>
                        }
                    </div>
                    {
                        (!selectedProvider || selectedProvider?.isSelectedFromFilter) &&
                        <ProviderPicker
                            providers={filteredProviders}
                            selectedProviderName={selectedProvider?.name}
                            setSelectedProviderName={handleSelectProvider}
                        />
                    }
                </div>
                <div
                    onScroll={handleScroll}
                    className={clsx('overflow-y-scroll -mr-4 pr-2 scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar-thumb:bg-transparent', {
                        'h-[55vh]': isMobile,
                        'h-[265px]': !isMobile,
                        'styled-scroll': isScrolling
                    })}
                >
                    <div className='grid grid-cols-2 gap-2'>
                        {
                            resolvedConnectors.sort((a, b) => a.type && b.type ? a.type.localeCompare(b.type) : 0)?.map(item => {
                                const provider = featuredProviders.find(p => p.name === item.providerName)
                                const isRecent = recentConnectors?.some(v => v.connectorName === item.name)
                                return (
                                    <Connector
                                        key={item.id}
                                        connector={item}
                                        onClick={() => connect(item, provider!)}
                                        connectingConnector={selectedConnector}
                                        isRecent={isRecent}
                                    />
                                )
                            })
                        }
                    </div>
                </div>
            </div>
            {
                selectedMultiChainConnector &&
                <MultichainConnectorModal
                    selectedConnector={selectedMultiChainConnector}
                    allConnectors={allConnectors as InternalConnector[]}
                    providers={featuredProviders}
                    showEcosystemSelection={showEcosystemSeletion}
                    setShowEcosystemSelection={setShowEcosystemSelection}
                    connect={connect}
                />
            }
        </>
    )
}

const LoadingConnect: FC<{ onRetry: () => void, selectedConnector: WalletModalConnector, connectionError: string | undefined, isMobile: boolean }> = ({ onRetry, selectedConnector, connectionError, isMobile }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });

    if (selectedConnector.installUrl) {
        return <div
            className={clsx('w-full flex flex-col justify-center items-center font-semibold relative', {
                'h-[60vh]': isMobile,
                'h-[360px]': !isMobile,
            })}
        >
            <div className="flex flex-col gap-4 items-center justify-end row-start-2 row-span-1">
                <div className="flex-col flex items-center gap-1">
                    <ConnectorIcon className="w-11 h-auto p-0.5 rounded-md bg-secondary-800" />
                    <p className='text-base font-semibold'>
                        <span>{selectedConnector?.name}</span> <span>is not installed</span>
                    </p>
                </div>
                <button
                    onClick={() => window.open(selectedConnector.installUrl, '_blank')}
                    className="px-3 py-1 rounded-full bg-secondary-600 text-primary-500 font-semibold text-base hover:brightness-125 transition-all duration-200"
                >
                    INSTALL
                </button>
            </div>
        </div>
    }

    return (
        <div
            className={clsx('w-full flex flex-col justify-center items-center font-semibold relative', {
                'h-[60vh]': isMobile,
                'h-[360px]': !isMobile,
                'pb-20': connectionError
            })}
        >
            {
                selectedConnector &&
                <div className="flex flex-col gap-3 items-center justify-end row-start-2 row-span-1">
                    <div className="flex-col flex items-center">
                        <div className="grid grid-cols-3 items-center gap-2">
                            <div className="p-3 bg-secondary-700 rounded-lg z-10">
                                <LayerSwapLogoSmall className="w-11 h-auto" />
                            </div>
                            {
                                connectionError ?
                                    <Link2Off className="w-auto h-auto place-self-center" />
                                    :
                                    <div className="loader !text-[3px] place-self-center" />
                            }
                            <div className="p-3 bg-secondary-700 rounded-lg z-10">
                                <ConnectorIcon className="w-11 h-auto" />
                            </div>
                        </div>
                    </div>
                    {
                        !connectionError &&
                        <div className="py-1 text-center">
                            <p className="text-base font-medium">Click connect in your wallet popup</p>
                            <p className="text-sm font-normal text-secondary-text">Don&apos;t see a pop up? Check your other browser windows</p>
                        </div>
                    }
                </div>
            }
            {
                connectionError &&
                <div className={`bg-secondary-500 rounded-lg flex flex-col gap-1.5 items-center p-3 w-full absolute bottom-0`}>
                    <div className="flex w-full gap-1 text-sm text-secondary-text justify-start">
                        <CircleX className="w-5 h-5 stroke-primary-500 mr-1 mt-0.5 flex-shrink-0" />
                        <div className='flex flex-col gap-1'>
                            <p className='text-base text-white'>Failed to connect</p>
                            <p className="text-sm font-normal">
                                {connectionError}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="flex gap-1.5 items-center justify-center bg-secondary-400 w-full text-primary-text p-4 border-none rounded-lg cursor-pointer text-sm font-medium leading-4"
                        onClick={onRetry}
                    >
                        <RotateCw className='h-4 w-4' />
                        <span>Try again</span>
                    </button>
                </div>
            }
        </div>
    )
}

const ProviderPicker: FC<{ providers: WalletProvider[], selectedProviderName: string | undefined, setSelectedProviderName: Dispatch<SetStateAction<string | undefined>> }> = ({ providers, selectedProviderName, setSelectedProviderName }) => {
    const values = providers.map(p => p.name)

    const onSelect = (item: string) => {
        setOpen(false)
        if (selectedProviderName === item) return setSelectedProviderName(undefined)
        setSelectedProviderName(item)
    }

    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={() => setOpen(!open)}>
            <PopoverTrigger
                className={clsx('p-3 border border-secondary-500 rounded-lg bg-secondary-600 hover:brightness-125', {
                    '!bg-secondary-500 brightness-125': !!selectedProviderName,
                })}
            >
                <SlidersHorizontal className="h-4 w-4 text-secondary-text" />
            </PopoverTrigger>
            <PopoverContent align="end" className="min-w-40 !text-primary-text p-2 space-y-1 !bg-secondary-600 !rounded-xl">
                {
                    values.sort().map((item, index) => (
                        <div key={index} className="px-3 py-1 text-left flex items-center w-full gap-3 hover:bg-secondary-800 rounded-lg transition-colors duration-200 text-secondary-text cursor-pointer">
                            <Checkbox
                                id={item}
                                checked={selectedProviderName === item}
                                onClick={() => onSelect(item)}
                            />
                            <label htmlFor={item} className="w-full cursor-pointer">
                                {item}
                            </label>
                        </div>
                    ))
                }
            </PopoverContent>
        </Popover>
    )
}


type MultichainConnectorModalProps = {
    selectedConnector: WalletModalConnector,
    allConnectors: InternalConnector[],
    providers: WalletProvider[],
    showEcosystemSelection: boolean,
    setShowEcosystemSelection: Dispatch<SetStateAction<boolean>>
    connect: (connector: InternalConnector, provider: WalletProvider) => Promise<void>
}

const MultichainConnectorModal: FC<MultichainConnectorModalProps> = ({ selectedConnector, allConnectors, providers, setShowEcosystemSelection, showEcosystemSelection, connect }) => {
    const Icon = resolveWalletConnectorIcon({ connector: selectedConnector.name, iconUrl: selectedConnector.icon })
    return (
        <VaulDrawer
            show={showEcosystemSelection}
            setShow={setShowEcosystemSelection}
            modalId={"selectEcosystem"}
            header={
                <div>
                    <div className="flex items-center gap-1">
                        <Icon className="w-5 h-auto" />
                        <p className="text-xl font-semibold"><span>Connect</span> <span>{selectedConnector.name}</span></p>
                    </div>
                </div>
            }
        >
            <VaulDrawer.Snap id="item-1" className="flex flex-col items-center gap-4 pb-6">
                <p className="text-base text-left text-secondary-text">
                    <span>{selectedConnector.name}</span> <span>supports multiple network types. Please select the one you&apos;d like to use.</span>
                </p>
                <div className="flex flex-col gap-2 w-full">
                    {
                        allConnectors.filter(c => c?.name === selectedConnector.name)?.map((connector, index) => {
                            const provider = providers.find(p => p.name === connector?.providerName)
                            return (
                                <button
                                    key={index}
                                    onClick={async () => {
                                        setShowEcosystemSelection(false);
                                        await connect(connector!, provider!)
                                    }}
                                    className="w-full h-fit flex items-center gap-3 bg-secondary-500 hover:bg-secondary-400 transition-colors duration-200 rounded-xl p-3"
                                >
                                    {
                                        provider?.providerIcon &&
                                        <ImageWithFallback
                                            className="w-8 h-8 rounded-md"
                                            width={30}
                                            height={30}
                                            src={provider.providerIcon}
                                            alt={provider.name}
                                        />
                                    }
                                    <p>
                                        {connector?.providerName}
                                    </p>
                                </button>
                            )
                        })
                    }
                </div>
            </VaulDrawer.Snap>
        </VaulDrawer>
    )
}
export default ConnectorsLsit