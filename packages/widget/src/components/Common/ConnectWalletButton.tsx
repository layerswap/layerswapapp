import { RefreshCw } from "lucide-react";
import { ResolveConnectorIcon } from "../Icons/ConnectorIcons";
import { FC, useState } from "react";
import { Wallet, WalletConnectionProvider } from "../../Models/WalletProvider";
import { useConnectModal } from "../Wallet/WalletModal";
import { classNames } from "@/components/utils/classNames";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    provider?: WalletConnectionProvider,
    onConnect?: (wallet: Wallet) => void,
    descriptionText?: string
}

const ConnectWalletButton: FC<Props> = ({ provider, onConnect, descriptionText, ...rest }) => {

    const [isLoading, setIsLoading] = useState(false)
    const { connect } = useConnectModal()

    const handleConnect = async () => {
        setIsLoading(true)
        const result = await connect(provider)
        if (onConnect && result) onConnect(result)
        setIsLoading(false)
    }

    return <button
        {...rest}
        type="button"
        onClick={handleConnect}
        className={classNames(`py-5 px-6 bg-secondary-500 hover:bg-secondary-400 transition-colors duration-200 rounded-xl ${isLoading && 'cursor-progress opacity-80'}`, rest.className)}
    >
        <div className="flex flex-row justify-between gap-9 items-stretch">
            <ResolveConnectorIcon
                connector={provider?.name}
                iconClassName="w-10 h-10 p-0.5 rounded-lg bg-secondary-800 border border-secondary-400"
                className="grid grid-cols-2 gap-1 min-w-fit"
            />
            <div className="h-full space-y-2">
                <p className="text-sm font-medium text-secondary-text text-start">{descriptionText ?? 'Connect your wallet to browse and select from your addresses'}</p>
                <div className="bg-primary-700/30 border-none text-primary! py-2 rounded-lg text-base font-semibold">
                    {
                        isLoading ?
                            <div className="flex items-center gap-1 justify-center">
                                <RefreshCw className="h-3 w-auto animate-spin" />
                                <span className="ml-1">Connecting...</span>
                            </div>
                            :
                            <>Connect Now</>
                    }
                </div>
            </div>
        </div>
    </button>
}

export default ConnectWalletButton