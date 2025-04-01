import { Dispatch, FC, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal, WalletModalConnector } from ".";
import { InternalConnector, Wallet, WalletProvider } from "../../Models/WalletProvider";
import { CircleX, LoaderCircle, RotateCw, Search, XCircle } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "../buttons/copyButton";
import clsx from "clsx";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import Connector from "./Connector";
import { removeDuplicatesWithKey } from "./utils";
import VaulDrawer from "../modal/vaulModal";
import Image from "next/image";

const ConnectorsLsit: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { isMobile } = useWindowDimensions()
    const { providers } = useWallet();
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks && !p.hideFromList)
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector } = useConnectModal()

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
            setSelectedConnector({ name: connector.name, iconUrl: connector.icon, isMultiChain: connector.isMultiChain })

            const result = provider?.connectConnector && await provider.connectConnector({ connector })

            if (result) {
                onFinish(result)
            }
            setSelectedConnector(undefined)
        } catch (e) {
            console.log(e)
            setConnectionError(e.message || e.details)
        }
    }

    const allConnectors = filteredProviders.filter(g => g.availableWalletsForConnect && g.availableWalletsForConnect?.length > 0 && (selectedProvider ? g.name == selectedProvider.name : true)).map((provider) =>
        provider.availableWalletsForConnect?.filter(v => isFocused ? (searchValue ? v.name.toLowerCase().includes(searchValue?.toLowerCase()) : false) : true).map((connector) => ({ ...connector, providerName: provider.name }))).flat()

    const resolvedConnectors: InternalConnector[] = useMemo(() => removeDuplicatesWithKey(allConnectors, 'name'), [allConnectors])

    if (selectedConnector?.qr) return <div className="flex flex-col justify-start space-y-2">
        <p className="text-secondary-text">
            Scan the QR code with your phone
        </p>
        <div className='flex flex-col justify-center items-center pt-2 w-fit mx-auto'>
            <QRCodeSVG
                className="rounded-lg"
                value={selectedConnector?.qr}
                includeMargin={true}
                size={264}
                level={"H"}
                imageSettings={
                    selectedConnector.iconUrl
                        ? {
                            src: selectedConnector.iconUrl,
                            height: 50,
                            width: 50,
                            excavate: true,
                        }
                        : undefined
                }
            />
            <div className='bg-secondary text-secondary-text w-full px-2 py-1.5 rounded-md mt-3 flex justify-center items-center'>
                <CopyButton toCopy={selectedConnector?.qr}>Copy QR URL</CopyButton>
            </div>
        </div>
    </div>

    if (selectedConnector) {
        const connector = allConnectors.find(c => c?.name === selectedConnector.name)
        const provider = filteredProviders.find(p => p.name === connector?.providerName)
        return <>
            <LoadingConnect
                isMobile={isMobile}
                onRetry={() => { connect(connector!, provider!) }}
                selectedConnector={selectedConnector}
                connectionError={connectionError}
            />
        </>
    }

    return (
        <>
            <div className="text-primary-text space-y-3">
                <div className="relative z-0 flex items-center px-3 rounded-lg bg-secondary-700 border border-secondary-500">
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
                <ProviderPicker
                    providers={filteredProviders}
                    selectedProviderName={selectedProvider?.name}
                    setSelectedProviderName={(v) => setSelectedProvider(filteredProviders.find(p => p.name === v))}
                />
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
                                const provider = filteredProviders.find(p => p.name === item.providerName)
                                return (
                                    <Connector
                                        key={item.id}
                                        connector={item}
                                        onClick={() => connect(item, provider!)}
                                        connectingConnector={selectedConnector}
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
                    providers={filteredProviders}
                    showEcosystemSelection={showEcosystemSeletion}
                    setShowEcosystemSelection={setShowEcosystemSelection}
                    connect={connect}
                />
            }
        </>
    )
}

const LoadingConnect: FC<{ onRetry: () => void, selectedConnector: WalletModalConnector, connectionError: string | undefined, isMobile: boolean }> = ({ onRetry, selectedConnector, connectionError, isMobile }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.iconUrl });

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
                <div className="flex flex-col gap-1 items-center justify-end row-start-2 row-span-1">
                    <div className="flex-col flex items-center">
                        <ConnectorIcon className="w-11 h-auto p-0.5 rounded-md bg-secondary-800" />
                        {
                            !connectionError &&
                            <p className='text-xs font-light'>
                                Opening {selectedConnector?.name}...
                            </p>
                        }
                    </div>
                    {
                        connectionError ?
                            <p className="font-bold text-lg">
                                Failed to connect
                            </p>
                            :
                            <>
                                <span className="text-base font-medium py-1">Confirm connection in the extension</span>
                                <LoaderCircle className='h-5 w-auto animate-spin' />
                            </>
                    }
                </div>
            }
            {
                connectionError &&
                <div className={`bg-secondary-700 rounded-lg flex flex-col gap-1.5 items-center p-3 w-full absolute bottom-0`}>
                    <div className="flex w-full gap-1 text-sm text-secondary-text justify-start">
                        <CircleX className="w-5 h-5 stroke-primary-500 mr-1 mt-0.5 flex-shrink-0" />
                        <div className='flex flex-col gap-1'>
                            <p className='text-base text-white'>Request rejected</p>
                            <p className="text-sm font-normal">
                                {connectionError}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="flex gap-1.5 items-center justify-center bg-secondary-500 w-full text-primary-text p-4 border-none rounded-lg cursor-pointer text-sm font-medium leading-4"
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
        if (selectedProviderName === item) return setSelectedProviderName(undefined)
        setSelectedProviderName(item)
    }

    return (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar:hidden">
            {
                values.sort().map((item, index) => {
                    const isSelected = selectedProviderName?.toLowerCase() == item.toLowerCase()
                    return (
                        <div key={index}>
                            <button onClick={() => onSelect(item)}
                                className={clsx('px-2 py-0.5 w-full text-left bg-secondary-600 hover:brightness-125 text-sm rounded-md transition-all duration-200', {
                                    'brightness-150': isSelected
                                })}
                            >
                                {item}
                            </button>
                        </div>
                    )
                }
                )
            }
        </div>
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
    const Icon = resolveWalletConnectorIcon({ connector: selectedConnector.name, iconUrl: selectedConnector.iconUrl })
    return (
        <VaulDrawer
            show={showEcosystemSelection}
            setShow={setShowEcosystemSelection}
            modalId={"selectEcosystem"}
            header='Select ecosystem'
        >
            <VaulDrawer.Snap id="item-1" className="flex flex-col items-center gap-4 pb-6">
                <div className="flex flex-col items-center gap-1">
                    <Icon className="w-16 h-auto p-0.5 rounded-[10px] bg-secondary-800" />
                    <p className="text-base text-center">
                        <span>{selectedConnector.name}</span> <span>supports multiple ecosystems, please select which one you like to connect.</span>
                    </p>
                </div>
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
                                    className="w-full h-fit flex items-center gap-3 bg-secondary-700 hover:bg-secondary-500 transition-colors duration-200 rounded-xl p-3"
                                >
                                    {
                                        provider?.providerIcon &&
                                        <Image
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