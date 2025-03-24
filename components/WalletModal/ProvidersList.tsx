import { DetailedHTMLProps, Dispatch, FC, HTMLAttributes, SetStateAction, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal, WalletModalConnector } from ".";
import { InternalConnector, Wallet, WalletProvider } from "../../Models/WalletProvider";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { ChevronDown, Loader } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "../buttons/copyButton";

const ConnectorsLsit: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { providers } = useWallet();
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks && !p.hideFromList)
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector } = useConnectModal()

    const [searchValue, setSearchValue] = useState<string>('')

    const connect = async (connector: InternalConnector, provider: WalletProvider) => {
        try {
            setSelectedConnector({ name: connector.name })

            const result = provider?.connectConnector && await provider.connectConnector({ connector })

            setSelectedConnector(undefined)
            onFinish(result)
        } catch (e) {
            console.log(e)
            setSelectedConnector(undefined)
            onFinish(undefined)
        }
    }

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

    return (
        <div className="text-primary-text">
            <div className="relative z-0 flex items-center mt-1 mb-2 pl-2 border-b border-secondary-500">
                <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder=" "
                    autoComplete="off"
                    id="floating_standard"
                    className="peer/draft placeholder:text-transparent border-0 border-b-0 border-primary-text focus:border-primary-text appearance-none block py-2.5 px-0 w-full h-11 bg-transparent text-lg outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="absolute left-1 font-thin animate-none peer-placeholder-shown/draft:animate-blinking text-lg peer-focus/draft:invisible invisible peer-placeholder-shown/draft:visible">|</span>
                <label htmlFor='floating_standard' className="absolute text-lg text-secondary-text duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-placeholder-shown/draft:scale-100 peer-placeholder-shown/draft:translate-y-0 peer-placeholder-shown/draft:text-secondary-text-muted">
                    Search wallet
                </label>
                <ProviderPicker
                    providers={filteredProviders}
                    selectedProviderName={selectedProvider?.name || 'All'}
                    setSelectedProviderName={(v) => setSelectedProvider(filteredProviders.find(p => p.name === v))}
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                {
                    filteredProviders.filter(g => g.availableWalletsForConnect && g.availableWalletsForConnect?.length > 0 && (selectedProvider ? g.name == selectedProvider.name : true)).map((provider) =>
                        provider.availableWalletsForConnect?.filter(v => v.name.toLowerCase().includes(searchValue.toLowerCase()))?.map(item => {
                            return (
                                <Connector
                                    key={item.id}
                                    connector={item}
                                    onClick={() => connect(item, provider)}
                                    connectingConnector={selectedConnector}
                                />
                            )
                        })
                    )
                }
            </div>
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
            <PopoverTrigger asChild>
                <div className="flex items-center gap-1">
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

type Connector = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    connector: InternalConnector,
    connectingConnector?: WalletModalConnector
    onClick: () => void
}

const Connector: FC<Connector> = ({ connector, connectingConnector, onClick, ...props }) => {
    const connectorName = connector?.name
    const connectorId = connector?.id

    const Icon = resolveWalletConnectorIcon({ connector: connectorId, iconUrl: connector.icon })
    const isLoading = connectingConnector?.name === connectorName

    return (
        <div
            {...props}
        >
            <button
                type="button"
                disabled={!!connectingConnector}
                className="w-full h-fit flex items-center justify-between bg-secondary-700 hover:bg-secondary-500 transition-colors duration-200 rounded-xl p-3"
                onClick={onClick}
            >
                <div className="grid grid-cols-3 gap-3 items-center font-semibold w-full relative">
                    <Icon className="w-11 h-11 p-0.5 rounded-[10px] bg-secondary-800" />
                    <div className='flex flex-col items-start col-start-2 col-span-4 truncate'>
                        <p className='text-base'>{connectorName}</p>
                        {
                            connector.type === 'injected' &&
                            <p className='text-xs text-secondary-text font-medium'>Installed</p>
                        }
                    </div>
                    {
                        isLoading &&
                        <div className='absolute right-0 bg-secondary-800 rounded-lg p-1'>
                            <Loader className='h-4 w-4 animate-spin' />
                        </div>
                    }
                </div>
            </button>
        </div>
    )
}

export default ConnectorsLsit