import { Dispatch, FC, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal, WalletModalConnector } from ".";
import { InternalConnector, Wallet, WalletProvider } from "../../Models/WalletProvider";
import { CircleX, Link2Off, RotateCw, SlidersHorizontal } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "../buttons/copyButton";
import clsx from "clsx";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import Connector from "./Connector";
import { removeDuplicatesWithKey } from "./utils";
import { usePersistedState } from "../../hooks/usePersistedState";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import LayerSwapLogoSmall from "../icons/layerSwapLogoSmall";
import { Checkbox } from "../shadcn/checkbox";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { SearchComponent } from "../Input/Search";
import { featuredWalletsIds } from "@/context/evmConnectorsContext";

const ConnectorsList: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { providers } = useWallet();
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector, selectedMultiChainConnector, setSelectedMultiChainConnector } = useConnectModal()
    let [recentConnectors, setRecentConnectors] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
    const [searchValue, setSearchValue] = useState<string | undefined>(undefined)
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
            if (connector?.isMultiChain) {
                setSelectedMultiChainConnector(connector)
                return;
            }
            setSelectedConnector(connector)
            if (connector.installUrl) return

            const result = provider?.connectWallet && await provider.connectWallet({ connector })

            if (result && connector && provider) {
                setRecentConnectors((prev) => {
                    const next = [{ providerName: provider.name, connectorName: connector.name }];
                    const counts = new Map<string, number>();
                    counts.set(provider.name, 1);

                    (prev || []).forEach(item => {
                        if (
                            item.providerName &&
                            item.connectorName &&
                            !(item.providerName === provider.name && item.connectorName === connector.name)
                        ) {
                            const count = counts.get(item.providerName) ?? 0;
                            if (count < 3) {
                                next.push({ providerName: item.providerName, connectorName: item.connectorName });
                                counts.set(item.providerName, count + 1);
                            }
                        }
                    });
                    return next;
                })
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

    const allFeaturedConnectors = useMemo(() => featuredProviders.filter(g => g.availableWalletsForConnect && g.availableWalletsForConnect?.length > 0).map((provider) =>
        provider.availableWalletsForConnect?.filter(v => searchValue ? (v.name.toLowerCase().includes(searchValue?.toLowerCase())) : true).map((connector) => ({ ...connector, providerName: provider.name }))).flat(), [featuredProviders, searchValue])
    const allHiddenConnectors = useMemo(() =>
        featuredProviders
            .filter(g => g.availableHiddenWalletsForConnect && g.availableHiddenWalletsForConnect?.length > 0)
            .map((provider) =>
                provider.availableHiddenWalletsForConnect
                    ?.filter(v => (searchValue ? (v.name.toLowerCase().includes(searchValue?.toLowerCase())) : true) && !featuredWalletsIds.includes(v.id.toLowerCase()))
                    .map((connector) => ({ ...connector, providerName: provider.name, isHidden: true })))
            .flat(), [featuredProviders, searchValue])

    const allConnectors: InternalConnector[] = useMemo(() => removeDuplicatesWithKey(([...allFeaturedConnectors, ...allHiddenConnectors] as InternalConnector[]).filter(c => searchValue?.length ? true : !c.isHidden).sort((a, b) => sortRecentConnectors(a, b, recentConnectors)), 'name'), [allFeaturedConnectors, allHiddenConnectors, searchValue?.length])

    if (selectedConnector?.qr?.state) {
        const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });

        return <div className="flex flex-col justify-start space-y-2">
            <p className="text-secondary-text">
                Scan the QR code with your phone
            </p>
            <div className="w-full h-full bg-secondary-600 py-3 rounded-lg">
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
                        <CopyButton disabled={!selectedConnector?.qr.value} toCopy={selectedConnector?.qr.value || ''}>Copy QR URL</CopyButton>
                    </div>
                </div>
            </div>
        </div>
    }

    if (selectedConnector) {
        const connector = allFeaturedConnectors.find(c => c?.name === selectedConnector.name)
        const provider = featuredProviders.find(p => p.name === connector?.providerName)
        return <LoadingConnect
            onRetry={() => { (connector && provider) && connect(connector, provider) }}
            selectedConnector={selectedConnector}
            connectionError={connectionError}
        />
    }

    if (selectedMultiChainConnector) {
        return <MultichainConnectorPicker
            selectedConnector={selectedMultiChainConnector}
            allConnectors={[...allFeaturedConnectors, ...allHiddenConnectors] as InternalConnector[]}
            providers={featuredProviders}
            connect={connect}
        />
    }

    return (
        <>
            <div className="text-primary-text space-y-3 flex flex-col w-full styled-scroll relative h-full">
                <div className="flex items-center gap-3">
                    <SearchComponent
                        searchQuery={searchValue || ""}
                        setSearchQuery={setSearchValue}
                        placeholder={allHiddenConnectors.length > 300 ? "Search through 400+ wallets..." : "Search wallet"}
                        className="w-full !mb-0"
                    />
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
                    className={clsx('overflow-y-scroll max-sm:h-[55svh] -mr-4 pr-2 scrollbar:!w-1.5 scrollbar:!h-1.5 overflow-x-hidden scrollbar-thumb:bg-transparent hover:styled-scroll', {
                        'styled-scroll': isScrolling
                    })}
                >
                    <div className='grid grid-cols-2 gap-2'>
                        {
                            allConnectors.map(item => {
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
        </>
    )
}

const LoadingConnect: FC<{ onRetry: () => void, selectedConnector: WalletModalConnector, connectionError: string | undefined }> = ({ onRetry, selectedConnector, connectionError }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });
    const { isMobile: isMobileSize } = useWindowDimensions()
    const isMobilePlatform = isMobile();

    if (selectedConnector.installUrl) {
        return <div className='w-full h-[60vh] sm:h-full flex flex-col justify-center items-center font-semibold relative'>
            <div className="flex grow items-center">
                <div className="flex flex-col gap-4 items-center justify-end row-start-2 row-span-1">
                    <div className="flex-col flex items-center gap-1">
                        <ConnectorIcon className="w-11 h-auto p-0.5 rounded-md bg-secondary-800" />
                        <p className='text-base font-semibold'>
                            <span>{selectedConnector?.name}</span> <span>is not installed</span>
                        </p>
                    </div>
                    <button
                        onClick={() => window.open(selectedConnector.installUrl, '_blank')}
                        type="button"
                        className="px-3 py-1 rounded-full bg-secondary-600 text-primary-500 font-semibold text-base hover:brightness-125 transition-all duration-200"
                    >
                        INSTALL
                    </button>
                </div>
            </div>
        </div>
    }

    return (
        <div
            className={clsx('w-full flex flex-col justify-center items-center font-semibold relative', {
                'h-[60vh]': isMobileSize,
                'h-full': !isMobileSize,
            })}
        >
            {
                selectedConnector &&
                <div className="flex grow items-center">
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
                                <p className="text-base font-medium">{isMobilePlatform ? 'Approve connection in your wallet' : 'Approve connection in your wallet pop-up'}</p>
                                <p className="text-sm font-normal text-secondary-text">{isMobilePlatform ? "Don't see the request? Check your wallet app." : "Don't see a pop-up? Check your browser windows."}</p>
                            </div>
                        }
                    </div>
                </div>
            }
            {
                connectionError &&
                <div className={`bg-secondary-500 rounded-lg flex flex-col gap-1.5 items-center p-3 w-full bottom-0`}>
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
    connect: (connector: InternalConnector, provider: WalletProvider) => Promise<void>
}

const MultichainConnectorPicker: FC<MultichainConnectorModalProps> = ({ selectedConnector, allConnectors, providers, connect }) => {
    const Icon = resolveWalletConnectorIcon({ connector: selectedConnector.id, iconUrl: selectedConnector.icon })
    return (
        <div className="flex flex-col justify-between h-full min-h-80">
            <div className="flex grow py-4">
                <div className="flex flex-col gap-2 grow items-center justify-center">
                    <div className="flex justify-center gap-1">
                        <Icon className="w-14 h-auto rounded-lg" />
                    </div>
                    <p className="text-base text-center text-primary-text px-4">
                        <span>{selectedConnector.name}</span> <span>supports multiple network types. Please select the one you&apos;d like to use.</span>
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
                {
                    Array.from(
                        allConnectors
                            .filter(c => c?.name === selectedConnector.name)
                            .reduce((map, connector) => {
                                if (!connector?.providerName) return map;
                                if (!map.has(connector.providerName)) {
                                    map.set(connector.providerName, connector);
                                }
                                return map;
                            }, new Map<string, typeof allConnectors[0]>())
                            .values()
                    ).map((connector, index) => {
                        const provider = providers.find(p => p.name === connector?.providerName)
                        return (
                            <button
                                type="button"
                                key={index}
                                onClick={async () => {
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
        </div>
    )
}

function sortRecentConnectors(a: { name: string, type?: string }, b: { name: string, type?: string }, recentConnectors: { connectorName?: string }[]) {
    function getIndex(c: { name: string }) {
        const idx = recentConnectors?.findIndex(v => v.connectorName === c.name);
        return idx === -1 ? Infinity : idx;
    }
    const indexA = getIndex(a);
    const indexB = getIndex(b);
    if (indexA !== indexB) {
        return indexA - indexB;
    }
    if (a.type && b.type) {
        return a.type.localeCompare(b.type);
    }
    return 0;
}

export default ConnectorsList