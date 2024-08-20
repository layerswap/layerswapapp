import { ReactNode, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { ResolveConnectorIcon } from "../icons/ConnectorIcons";
import Modal from "../modal/modal";

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
            <Modal height="fit" show={open} setShow={setOpen} modalId={"connectNewWallet"} header='Connect wallet'>
                <div className="grid grid-cols-4 gap-2 text-primary-text mt-3">
                    {filteredProviders.map((connector, index) => (
                        <button
                            type="button"
                            key={index}
                            className="w-full h-fit bg-secondary-600 hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 p-3"
                            onClick={async () => {
                                await connector.connectWallet();
                                setOpen(false);
                                onClose && onClose();
                            }}
                        >
                            <div className="flex flex-col gap-3 items-center font-semibold">
                                <p>{connector.name}</p>
                                {
                                    connector &&
                                    <ResolveConnectorIcon
                                        connector={connector.id}
                                        iconClassName="w-8 h-8 rounded-md bg-secondary-900"
                                    />
                                }
                            </div>
                        </button>
                    ))}
                </div>
            </Modal>
        </>
    )
};

export default ConnectButton;