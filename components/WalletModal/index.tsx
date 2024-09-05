import { FC, useCallback, useEffect } from 'react'
import Modal from '../modal/modal';
import ResizablePanel from '../ResizablePanel';
import { ChevronLeft, Loader } from 'lucide-react';
import IconButton from '../buttons/iconButton';
import { ResolveConnectorIcon } from '../icons/ConnectorIcons';
import useWallet from '../../hooks/useWallet';
import { ModalWalletProvider, useWalletModalState } from '../../stores/walletModalStateStore';
import EVMConnectList from './WalletsList/evm';

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
            <Modal height="fit" show={open} setShow={setOpen} modalId={"connectNewWallet"} header={
                <div className="flex items-center gap-2">
                    {
                        selectedProvider &&
                        <IconButton onClick={goBack} icon={
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
                                <WalletsList
                                    modalWalletProvider={selectedProvider}
                                    onFinish={() => setOpen(false)}
                                    setSelectedProvider={setSelectedProvider}
                                />
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