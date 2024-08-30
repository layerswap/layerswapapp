import { ReactNode, useEffect, useState } from "react";
import useWallet, { WalletProvider } from "../../../hooks/useWallet";
import { ResolveConnectorIcon } from "../../icons/ConnectorIcons";
import Modal from "../../modal/modal";
import ResizablePanel from "../../ResizablePanel";
import resolveWalletConnectorIcon from "../../../lib/wallets/utils/resolveWalletIcon";
import { WalletButton } from "@rainbow-me/rainbowkit";
import { isMobile } from "../../../lib/isMobile";
import { Connector, useConnect, useDisconnect, useSwitchAccount } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Loader } from "lucide-react";
import { mainnet } from "wagmi/chains";
import IconButton from "../iconButton";

const ConnectButton = ({
    children,
    className,
    onClose,
}: {
    children: ReactNode;
    className?: string;
    onClose?: () => void;
}) => {
    const { providers } = useWallet();
    const [open, setOpen] = useState<boolean>(false);
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks)
    const [selectedProvider, setSelectedProvider] = useState<WalletProvider | null>(null);

    useEffect(() => {
        if (!open && selectedProvider) {
            setSelectedProvider(null)
        }
    }, [open])

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                type="button"
                aria-label="Connect wallet"
                disabled={filteredProviders.length == 0}
                className={`${className} disabled:opacity-50 disabled:cursor-not-allowed `}
            >
                {children}
            </button>
            <Modal height="fit" show={open} setShow={setOpen} modalId={"connectNewWallet"} header={
                <div className="flex items-center gap-2">
                    {
                        selectedProvider &&
                        <IconButton onClick={() => setSelectedProvider(null)} icon={
                            <ChevronLeft className="h-6 w-6" />
                        }>
                        </IconButton>
                    }
                    <p>Connect wallet</p>
                </div>
            }>
                <ResizablePanel>
                    {
                        selectedProvider ?
                            <div>
                                <WalletsList provider={selectedProvider} onFinish={() => setOpen(false)} />
                            </div>
                            :
                            <div className="grid grid-cols-4 gap-2 text-primary-text pt-3">
                                {filteredProviders.map((provider, index) => (
                                    <button
                                        type="button"
                                        key={index}
                                        className="w-full h-fit bg-secondary-600 hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 p-3"
                                        onClick={async () => {
                                            if (provider.availableWalletsForConnect) {
                                                setSelectedProvider(provider);
                                                return;
                                            }
                                            await provider.connectWallet();
                                            setOpen(false);
                                            onClose && onClose();
                                        }}
                                    >
                                        <div className="flex flex-col gap-3 items-center font-semibold">
                                            <p>{provider.name}</p>
                                            {
                                                provider &&
                                                <ResolveConnectorIcon
                                                    connector={provider.id}
                                                    iconClassName="w-8 h-8 rounded-md bg-secondary-900"
                                                />
                                            }
                                        </div>
                                    </button>
                                ))}
                            </div>
                    }
                </ResizablePanel>
            </Modal>
        </>
    )
};

const WalletsList = ({ provider, onFinish }: { provider: WalletProvider, onFinish: () => void }) => {

    const [qr, setQr] = useState<{ qr: string, iconUrl: string } | undefined>(undefined)
    const [selectedConnector, setSelectedConnector] = useState<string | undefined>(undefined)
    const { connect } = useConnect();
    const { disconnectAsync } = useDisconnect()
    const { connectors: connectedWallets } = useSwitchAccount()

    if (provider.id === 'evm') {
        return <>
            {
                !qr ?
                    <div className="flex flex-col gap-1 w-full max-h-[40vh] overflow-y-auto styled-scroll">
                        {provider.availableWalletsForConnect.map((connector: Connector, index) => {
                            const connectorName = connector?.['rkDetails']?.['name']

                            const Icon = resolveWalletConnectorIcon({ connector: connectorName })
                            const isLoading = selectedConnector === connectorName
                            const name = connector?.['rkDetails']?.['id']
                            const alreadyConnectedConnectors = connectedWallets?.filter((c) => c.providerName === connector.id)

                            return (
                                <WalletButton.Custom key={index} wallet={name}>
                                    {({ connector }) => {
                                        return (
                                            <div key={index}>
                                                <button
                                                    type="button"
                                                    disabled={!!selectedConnector}
                                                    className="w-full flex items-center justify-between hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 py-2"
                                                    onClick={async () => {

                                                        try {
                                                            setSelectedConnector(connectorName)

                                                            if (alreadyConnectedConnectors.length > 0) {
                                                                for (const alreadyConnectedConnector of alreadyConnectedConnectors) {
                                                                    await disconnectAsync({
                                                                        connector: alreadyConnectedConnector,
                                                                    })
                                                                }
                                                            }

                                                            connect({
                                                                chainId: mainnet.id,
                                                                connector: connector,
                                                            }, {
                                                                onSuccess: (data) => {
                                                                    onFinish()
                                                                    setSelectedConnector(undefined)
                                                                },
                                                                onError: (error) => {
                                                                    console.log(error)
                                                                    setSelectedConnector(undefined)
                                                                }
                                                            });
                                                        } catch (e) {
                                                            console.log(e)
                                                        }

                                                        if (isMobile()) {
                                                            const uri = await getWalletConnectUri(connector, connector?.['rkDetails']?.['mobile']?.['getUri'])
                                                            window.location.href = uri
                                                        }
                                                        else {
                                                            const uri = await getWalletConnectUri(connector, connector?.['rkDetails']?.['qrCode']?.['getUri'])
                                                            const iconUrl = await (provider.availableWalletsForConnect as Connector[]).find((c) => c?.['rkDetails']?.['name'] === connectorName)?.['rkDetails']?.['iconUrl']()
                                                            setQr({ qr: uri, iconUrl })
                                                        }

                                                    }}
                                                >
                                                    <div className="flex gap-3 items-center font-semibold">
                                                        <Icon className="w-8 h-8 rounded-md bg-secondary-900" />
                                                        <p>{connectorName}</p>
                                                    </div>
                                                    {
                                                        isLoading &&
                                                        <Loader className='h-4 w-4 animate-spin' />
                                                    }
                                                </button>
                                            </div>
                                        );
                                    }}
                                </WalletButton.Custom>
                            )
                        })}
                    </div>
                    :
                    <div className='w-full flex justify-center pt-2'>
                        <QRCodeSVG
                            className="rounded-lg"
                            value={qr.qr}
                            includeMargin={true}
                            size={350}
                            level={"H"}
                            imageSettings={{
                                src: qr.iconUrl,
                                x: undefined,
                                y: undefined,
                                height: 50,
                                width: 50,
                                excavate: true,
                            }}
                            
                        />
                    </div>
            }
        </>
    }

}

const getWalletConnectUri = async (
    connector: Connector,
    uriConverter: (uri: string) => string,
): Promise<string> => {
    const provider = await connector.getProvider();

    if (connector.id === 'coinbase') {
        // @ts-expect-error
        return provider.qrUrl;
    }
    return new Promise<string>((resolve) =>
        // Wagmi v2 doesn't have a return type for provider yet
        // @ts-expect-error
        provider.once('display_uri', (uri) => {
            resolve(uriConverter(uri));
        }),
    );
};

export default ConnectButton;