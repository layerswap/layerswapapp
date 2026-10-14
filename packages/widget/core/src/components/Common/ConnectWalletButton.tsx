import { type Wallet } from '@layerswap/widget-types';
import { RefreshCw } from "lucide-react";
import { ResolveConnectorIcon } from "../Icons/ConnectorIcons";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { WalletConnectionProvider } from "@layerswap/wallet-core/types";
import { useConnectModal } from "../Wallet/WalletModal";
import { ensureRegistryBrowseLoaded, isProviderHydrated, PROVIDER_HYDRATION_TIMEOUT_MS, useWalletDescriptorLoader } from "@layerswap/wallet-core";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { classNames } from "@/components/utils/classNames";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    provider?: WalletConnectionProvider,
    onConnect?: (wallet: Wallet) => void,
    descriptionText?: string
}

const ConnectWalletButton: FC<Props> = ({ provider, onConnect, descriptionText, ...rest }) => {

    const [isLoading, setIsLoading] = useState(false)
    const { connect } = useConnectModal()
    const { loadAll, loadById } = useWalletDescriptorLoader()
    const isStub = provider?.isStub === true

    const providerId = provider?.id

    // The button is disabled while initializing, which suppresses the
    // hover/focus prefetch below, so a descriptor stub has nothing else to
    // trigger its SDK load — without this it would sit disabled until the
    // deadline expires.
    useEffect(() => {
        if (!isStub || !providerId) return
        void loadById(providerId)
    }, [isStub, providerId, loadById])

    const hydrated = isProviderHydrated(provider)

    // Clicks are blocked while initializing, so this deadline is the only thing
    // standing between the user and a permanently dead button when a provider's
    // SDK never loads — past it the button re-enables and the connect modal's
    // own bounded wait (`useConnectorSourcesStatus` / `useWalletProviderReadiness`)
    // takes over. Keyed by id rather than a bare boolean so a newly selected
    // provider can't inherit the previous one's expiry and appear ready with
    // zero load time.
    const [expiredForId, setExpiredForId] = useState<string | undefined>(undefined)
    useEffect(() => {
        if (!providerId || hydrated) return
        const timer = setTimeout(() => setExpiredForId(providerId), PROVIDER_HYDRATION_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [providerId, hydrated])

    const showInitializing = !!provider && !hydrated && expiredForId !== providerId

    // Kick off the descriptor SDK downloads AND the page-1 WalletConnect
    // registry fetches as soon as the user shows intent (mouse-enter or
    // keyboard-focus) on the button. The await on click will then resolve
    // against already-in-flight (or completed) work instead of starting it
    // cold. Both helpers dedupe in-flight loads, so firing on every hover is
    // cheap. Note this cannot fire while the button is disabled during
    // initialization — disabled buttons are unfocusable and swallow pointer
    // events — which is why stubs are hydrated by the mount effect above.
    const prefetchedRef = useRef<string | null>(null)
    const prefetchDescriptors = useCallback(() => {
        const key = providerId ?? '__no_provider__'
        if (prefetchedRef.current === key) return
        prefetchedRef.current = key
        ensureRegistryBrowseLoaded()
        void loadAll().then(() => ensureRegistryBrowseLoaded())
    }, [loadAll, providerId])

    const handleConnect = async () => {
        if (rest.disabled || showInitializing) return
        setIsLoading(true)
        try {
            // Kick off hydration and hand the modal the provider even if it is
            // still a stub — `useWalletConnection` waits for the live provider via
            // `awaitLiveProvider` before connecting, so the destination's own
            // connectors stay in scope instead of degrading to the generic list.
            void loadAll()
            const result = await connect(provider)
            if (onConnect && result) onConnect(result)
        } catch (error) {
            ErrorHandler({
                type: 'WalletError',
                name: 'ConnectWalletButton',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                cause: error,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return <button
        {...rest}
        type="button"
        onClick={handleConnect}
        onMouseEnter={prefetchDescriptors}
        onFocus={prefetchDescriptors}
        onTouchStart={prefetchDescriptors}
        data-attr="connect-wallet"
        aria-busy={showInitializing || isLoading}
        disabled={showInitializing || rest.disabled}
        className={classNames(`focus-ring-primary-bold py-5 px-6 bg-secondary-500 hover:bg-secondary-400 transition-colors duration-200 rounded-xl ${(isLoading || showInitializing) && 'cursor-progress opacity-80'} disabled:opacity-50 disabled:cursor-not-allowed`, rest.className)}
    >
        <div className="flex flex-row justify-between gap-9 items-stretch">
            <ResolveConnectorIcon
                connector={provider?.name}
                iconClassName="w-10 h-10 p-0.5 rounded-lg bg-secondary-800 border border-secondary-400"
                className="grid grid-cols-2 gap-1 min-w-fit"
            />
            <div className="h-full space-y-2">
                <p className="text-sm font-medium text-secondary-text text-start">{descriptionText ?? 'Connect your wallet to browse and select from your addresses'}</p>
                <div aria-live="polite" className="bg-primary-700/30 border-none text-primary! py-2 rounded-lg text-base font-semibold">
                    {
                        showInitializing ?
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
