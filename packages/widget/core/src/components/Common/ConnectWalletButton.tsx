import { RefreshCw } from "lucide-react";
import { ResolveConnectorIcon } from "../Icons/ConnectorIcons";
import { FC, useCallback, useRef, useState } from "react";
import { Wallet, WalletConnectionProvider } from "@/types/wallet";
import { useConnectModal } from "../Wallet/WalletModal";
import { useWalletDescriptorLoader } from "@/lib/walletConnect/walletDescriptorLoader";
import { ensureRegistryBrowseLoaded } from "@/lib/walletConnect/additionalConnectorsStore";
import { isProviderConnectReady } from "@/hooks/useProvidersConnectReady";
import { classNames } from "@/components/utils/classNames";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    provider?: WalletConnectionProvider,
    onConnect?: (wallet: Wallet) => void,
    descriptionText?: string
}

const ConnectWalletButton: FC<Props> = ({ provider, onConnect, descriptionText, ...rest }) => {

    const [isLoading, setIsLoading] = useState(false)
    const { connect } = useConnectModal()
    const { loadAll } = useWalletDescriptorLoader()
    // A descriptor stub isn't "initializing" — its SDK simply hasn't been
    // requested yet. Treat it as ready-to-click so the button stays enabled
    // (clicking opens the modal, which triggers the descriptor load) and so
    // the hover/focus prefetch below can actually fire — disabled buttons
    // suppress pointer events in most browsers.
    const isStub = provider?.isStub === true
    const isProviderReady = isProviderConnectReady(provider)

    // Kick off the descriptor SDK downloads AND the page-1 WalletConnect
    // registry fetches as soon as the user shows intent (mouse-enter or
    // keyboard-focus) on the button. The await on click will then resolve
    // against already-in-flight (or completed) work instead of starting it
    // cold. Both helpers dedupe in-flight loads, so firing on every hover is
    // cheap. Keyed by provider id so a stub → real provider transition
    // re-arms the prefetch for the new provider instead of staying latched
    // on the stub.
    const prefetchedRef = useRef<string | null>(null)
    const prefetchDescriptors = useCallback(() => {
        const key = provider?.id ?? '__no_provider__'
        if (prefetchedRef.current === key) return
        prefetchedRef.current = key
        ensureRegistryBrowseLoaded()
        void loadAll().then(() => ensureRegistryBrowseLoaded())
    }, [loadAll, provider?.id])

    const handleConnect = async () => {
        if (isStub) {
            // Descriptor not loaded yet: kick off the SDK download and open the
            // generic modal. Once the real provider replaces the stub in the
            // registry, a re-render hands this button the real provider and the
            // next click connects it directly.
            void loadAll()
            const result = await connect()
            if (onConnect && result) onConnect(result)
            return
        }
        if (!isProviderReady) return
        setIsLoading(true)
        const result = await connect(provider)
        if (onConnect && result) onConnect(result)
        setIsLoading(false)
    }

    return <button
        {...rest}
        type="button"
        onClick={handleConnect}
        onMouseEnter={prefetchDescriptors}
        onFocus={prefetchDescriptors}
        onTouchStart={prefetchDescriptors}
        data-attr="connect-wallet"
        disabled={!isProviderReady || rest.disabled}
        className={classNames(`focus-ring-primary-bold py-5 px-6 bg-secondary-500 hover:bg-secondary-400 transition-colors duration-200 rounded-xl ${(isLoading || !isProviderReady) && 'cursor-progress opacity-80'} disabled:opacity-50 disabled:cursor-not-allowed`, rest.className)}
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
                        !isProviderReady ?
                            <div className="flex items-center gap-1 justify-center">
                                <RefreshCw className="h-3 w-auto animate-spin" />
                                <span className="ml-1">Initializing...</span>
                            </div>
                            :
                            isLoading ?
                                <div className="flex items-center gap-1 justify-center">
                                    <RefreshCw className="h-3 w-auto animate-spin" />
                                    <span className="ml-1">Connecting...</span>
                                </div>
                                :
                                <span>Connect Now</span>
                    }
                </div>
            </div>
        </div>
    </button>
}

export default ConnectWalletButton