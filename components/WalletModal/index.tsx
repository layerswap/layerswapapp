import { FC, useCallback, useEffect } from 'react'
import { ChevronLeft, Loader } from 'lucide-react';
import IconButton from '../buttons/iconButton';
import { ResolveConnectorIcon } from '../icons/ConnectorIcons';
import useWallet from '../../hooks/useWallet';
import { ModalWalletProvider, useWalletModalState } from '../../stores/walletModalStateStore';
import EVMConnectList from './WalletsList/evm';
import VaulDrawer from '../modal/vaul';

export function WalletModalProvider({ children }) {
    const { providers } = useWallet();
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks)

    const open = useWalletModalState((state) => state.open)
    const setOpen = useWalletModalState((state) => state.setOpen)
    const selectedProvider = useWalletModalState((state) => state.selectedProvider)
    const setSelectedProvider = useWalletModalState((state) => state.setSelectedProvider)

    const goBack = useCallback(() => {
        if (selectedProvider?.connector?.qr) {
            setSelectedProvider({ ...selectedProvider, connector: undefined })
            return;
        }
        setSelectedProvider(undefined)
    }, [setSelectedProvider, selectedProvider])

    useEffect(() => {
        if (!open && selectedProvider) {
            setSelectedProvider(undefined)
        }
    }, [open])
    return (
        <>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                modalId={"connectNewWallet"}
                header={
                    <div className="flex items-center gap-1">
                        {
                            selectedProvider &&
                            <div className='-ml-2 mt-0.5'>
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>Connect wallet</p>
                    </div>
                }>
                <VaulDrawer.Snap id='item-1'>

                    {
                        selectedProvider ?
                            <div>
                                <WalletsList
                                    modalWalletProvider={selectedProvider}
                                    onFinish={() => setOpen(false)}
                                    setSelectedProvider={setSelectedProvider}
                                />
                            </div>
                            :
                            <div className="text-primary-text space-y-2">
                                {filteredProviders.map((provider, index) => (
                                    <button
                                        type="button"
                                        key={index}
                                        className="w-full h-fit bg-secondary-700 hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 p-3"
                                        onClick={async () => {
                                            if (provider.availableWalletsForConnect) {
                                                setSelectedProvider(provider);
                                                return;
                                            }
                                            await provider.connectWallet();
                                            setOpen(false);
                                        }}
                                    >
                                        <div className="flex flex-row gap-3 items-center justify-between font-semibold px-4">
                                            <p>{provider.name}</p>
                                            {
                                                provider &&
                                                <ResolveConnectorIcon
                                                    connector={provider.id}
                                                    iconClassName="w-7 h-7 rounded-full bg-secondary-700 p-0.5 border border-secondary-400"
                                                />
                                            }
                                        </div>
                                    </button>
                                ))}
                            </div>
                    }
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
}

export type WalletsListProps = {
    modalWalletProvider: ModalWalletProvider;
    setSelectedProvider: (value: ModalWalletProvider | undefined) => void;
    onFinish: () => void;
};

const WalletsList: FC<WalletsListProps> = ({ modalWalletProvider, onFinish, setSelectedProvider }) => {

    if (modalWalletProvider?.id === 'evm') {
        return <EVMConnectList modalWalletProvider={modalWalletProvider} onFinish={onFinish} setSelectedProvider={setSelectedProvider} />
    }
    else {
        return <div className='h-40 w-full flex flex-col justify-center items-center'>
            <div className='flex items-center gap-2'>
                <Loader className='h-6 w-6 animate-spin' />
                <p><span>Connecting</span> <span>{modalWalletProvider?.name}</span></p>
            </div>
        </div>
    }
}