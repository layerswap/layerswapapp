import { Dispatch, FC, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal, WalletModalConnector } from ".";
import { InternalConnector, Wallet, WalletProvider } from "../../Models/WalletProvider";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { ChevronDown, CircleX, LoaderCircle, RotateCw, Search } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "../buttons/copyButton";
import clsx from "clsx";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import Connector from "./Connector";
import { removeDuplicatesWithKey } from "./utils";
import VaulDrawer from "../modal/vaulModal";

const ConnectorsLsit: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { isMobile } = useWindowDimensions()
    const { providers } = useWallet();
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks && !p.hideFromList)
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector } = useConnectModal()

    const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
    const [searchValue, setSearchValue] = useState<string>('')
    const [showEcosystemSeletion, setShowEcosystemSelection] = useState(false)

    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<any>(null);

    const handleScroll = () => {
        setIsScrolling(true);

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1000); // scrollbar disappears after 1 sec of inactivity
    };

    useEffect(() => {
        return () => clearTimeout(scrollTimeout.current as any);
    }, []);

    const connect = async (connector: InternalConnector, provider: WalletProvider) => {
        try {
            setConnectionError(undefined)
            setSelectedConnector({ name: connector.name, iconUrl: connector.icon, isMultiChain: connector.isMultiChain })
            if (connector.isMultiChain) return setShowEcosystemSelection(true)

            const result = provider?.connectConnector && await provider.connectConnector({ connector })

            if (result) {
                setSelectedConnector(undefined)
                onFinish(result)
            }
        } catch (e) {
            console.log(e)
            // setSelectedConnector(undefined)
            setConnectionError(e.message)
        }
    }

    const allConnectors = filteredProviders.filter(g => g.availableWalletsForConnect && g.availableWalletsForConnect?.length > 0 && (selectedProvider ? g.name == selectedProvider.name : true)).map((provider) =>
        provider.availableWalletsForConnect?.filter(v => v.name.toLowerCase().includes(searchValue.toLowerCase())).map((connector) => ({ ...connector, providerName: provider.name }))).flat()

    const resolvedConnectors: InternalConnector[] = useMemo(() => removeDuplicatesWithKey(allConnectors, 'name'), [allConnectors])

    if (selectedConnector?.qr) return <div className="flex flex-col justify-start space-y-2">
        <div className='w-full flex flex-col justify-center items-center pt-2'>
            <QRCodeSVG
                className="rounded-lg"
                value={selectedConnector?.qr}
                includeMargin={true}
                size={350}
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
            <div className='bg-secondary text-secondary-text px-14 py-1.5 rounded-md mt-3 flex items-center'>
                <CopyButton toCopy={selectedConnector?.qr}>Copy QR URL</CopyButton>
            </div>
        </div>
    </div>

    if (selectedConnector) {
        const Icon = resolveWalletConnectorIcon({ connector: selectedConnector.name, iconUrl: selectedConnector.iconUrl })

        return <>
            <LoadingConnect
                onRetry={() => { }}
                selectedConnector={selectedConnector}
                connectionError={connectionError}
            />
            {
                selectedConnector.isMultiChain &&
                <VaulDrawer
                    show={showEcosystemSeletion}
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
                                    const provider = filteredProviders.find(p => p.name === connector?.providerName)
                                    return (
                                        <button
                                            key={index}
                                            onClick={async () => {
                                                setShowEcosystemSelection(false);
                                                await connect(connector!, provider!)
                                            }}
                                            className="w-full h-fit flex items-center justify-between bg-secondary-700 hover:bg-secondary-500 transition-colors duration-200 rounded-xl p-3"
                                        >
                                            {connector?.providerName}
                                        </button>
                                    )
                                })
                            }
                        </div>
                    </VaulDrawer.Snap>
                </VaulDrawer>
            }
        </>
    }

    return (
        <div className="text-primary-text space-y-3">
            <div className="relative z-0 flex items-center px-3 rounded-lg bg-secondary-700 border border-secondary-500">
                <Search className="w-6 h-6 mr-2 text-primary-text-placeholder" />
                <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search wallet"
                    autoComplete="off"
                    className="placeholder:text-primary-text-placeholder border-0 border-b-0 border-primary-text focus:border-primary-text appearance-none block py-2.5 px-0 w-full h-10 bg-transparent text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <ProviderPicker
                    providers={filteredProviders}
                    selectedProviderName={selectedProvider?.name || 'All'}
                    setSelectedProviderName={(v) => setSelectedProvider(filteredProviders.find(p => p.name === v))}
                />
            </div>
            <div onScroll={handleScroll} className={clsx('overflow-y-scroll -mr-4 pr-2 scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar-thumb:bg-transparent', {
                'h-[55vh]': isMobile,
                'h-[315px]': !isMobile,
                'styled-scroll': isScrolling
            })}>
                <div className='grid grid-cols-2 gap-2'>
                    {
                        resolvedConnectors?.map(item => {
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
    )
}

const LoadingConnect: FC<{ onRetry: () => void, selectedConnector: WalletModalConnector, connectionError: string | undefined }> = ({ onRetry, selectedConnector, connectionError }) => {
    const ProviderIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.iconUrl });

    return (
        <div className="w-full h-full flex flex-col flex-1 gap-3 justify-center items-center font-semibold">
            {
                selectedConnector &&
                <div className="flex flex-col gap-1 items-center">
                    <div className="flex-col flex items-center">
                        <ProviderIcon className="w-11 h-auto p-0.5 rounded-md bg-secondary-800" />
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
                <div className={`bg-secondary-700 rounded-lg flex flex-col gap-1.5 items-center p-3 w-full`}>
                    <p className="flex w-full gap-1 text-sm text-secondary-text justify-start">
                        <CircleX className="w-5 h-5 stroke-primary-500 mr-1 mt-0.5 flex-shrink-0" />
                        <div className='flex flex-col gap-1'>
                            <p className='text-base text-white'>Request rejected</p>
                            <p>
                                {connectionError}
                            </p>
                        </div>
                    </p>
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

const ProviderPicker: FC<{ providers: WalletProvider[], selectedProviderName: string, setSelectedProviderName: Dispatch<SetStateAction<string>> }> = ({ providers, selectedProviderName, setSelectedProviderName }) => {
    const values = [...providers.map(p => p.name), 'All']
    const [open, setOpen] = useState(false)

    const onSelect = (item: string) => {
        setSelectedProviderName(item)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={() => setOpen(!open)}>
            <PopoverTrigger>
                <div className="flex items-center gap-1 text-primary-text-placeholder">
                    <p>
                        {selectedProviderName}
                    </p>
                    <ChevronDown className="h-4 w-4" />
                </div>
            </PopoverTrigger>
            <PopoverContent align="end" className="min-w-32 !text-primary-text p-2 space-y-1 !bg-secondary-600 !rounded-xl">
                {
                    values.sort().map((item, index) => (
                        <div key={index} className="">
                            <button onClick={() => onSelect(item)} className="px-3 py-1 w-full text-left hover:bg-secondary-800 rounded-lg transition-colors duration-200">
                                {item}
                            </button>
                        </div>
                    ))
                }
            </PopoverContent>
        </Popover>
    )
}

export default ConnectorsLsit