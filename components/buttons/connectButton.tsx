import { ReactNode, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import useWallet from "../../hooks/useWallet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../shadcn/dialog";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { ResolveConnectorIcon } from "../icons/ConnectorIcons";

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
    const [open, setOpen] = useState<boolean>();
    const { isMobile } = useWindowDimensions();

    return isMobile ? (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger aria-label="Connect wallet">{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px] text-primary-text">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        Link a new wallet
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    {providers.map((connector, index) => (
                        <button
                            type="button"
                            key={index}
                            className="w-full h-fit bg-secondary-700 border border-secondary-500 rounded py-2 px-3"
                            onClick={() => {
                                connector.connectWallet();
                                setOpen(false);
                                onClose && onClose();
                            }}
                        >
                            <div className="flex space-x-2 items-center">
                                {connector && (
                                    <div className="inline-flex items-center relative">
                                        <ResolveConnectorIcon
                                            connector={connector.id}
                                            iconClassName="w-7 h-7 p-0.5 rounded-full bg-secondary-800 border border-secondary-400"
                                        />
                                    </div>
                                )}
                                <p>{connector.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    ) : (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                aria-label="Connect wallet"
                disabled={providers.length == 0}
                className={`${className} disabled:opacity-50 disabled:cursor-not-allowed `}
            >
                {children}
            </PopoverTrigger>
            <PopoverContent className="flex flex-col items-start gap-2 w-fit">
                {providers.map((connector, index) => (
                    <button
                        type="button"
                        key={index}
                        className="w-full h-full hover:bg-secondary-600 rounded py-2 px-3"
                        onClick={() => {
                            connector.connectWallet();
                            setOpen(false);
                            onClose && onClose();
                        }}
                    >
                        <div className="flex space-x-2 items-center">
                            {connector && (
                                <div className="inline-flex items-center relative">
                                    <ResolveConnectorIcon
                                        connector={connector.id}
                                        iconClassName="w-7 h-7 p-0.5 rounded-full bg-secondary-800 border border-secondary-400"
                                    />
                                </div>
                            )}
                            <p>{connector.name}</p>
                        </div>
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    );
};

export default ConnectButton;