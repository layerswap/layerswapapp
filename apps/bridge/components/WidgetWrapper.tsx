import { LayerswapProvider, LayerSwapSettings, ThemeData } from "@layerswap/widget"
import {
    SwapStatus,
    type ErrorEventType,
    type SwapLifecycleEvent,
    type SwapStatusEvent,
} from "@layerswap/widget-types"
import { useRouter } from "next/router"
import { ComponentProps, ReactNode, useCallback, useMemo, useRef } from "react"
import { updateFormBulk } from "./utils/updateForm"
import { removeSwapPath, setMenuPath, setSwapPath } from "./utils/updatePath"
import { getDefaultProviders } from "@layerswap/wallets";
import { QueryParams } from "../helpers/querryHelper"
import { logError } from "./utils/logError"
import { captureEvent, setSwapContext } from "../lib/faro"
import { useSwapLifecycleTelemetry } from "../hooks/useSwapLifecycleTelemetry"

type LayerswapProviderComponentProps = ComponentProps<typeof LayerswapProvider>;
type WidgetCallbacks = NonNullable<LayerswapProviderComponentProps['callbacks']>;
type SwapCallbackData = Parameters<NonNullable<WidgetCallbacks['onSwapCreate']>>[0];

function getSwapAttributes(swapData: SwapCallbackData): Record<string, unknown> {
    const swap = swapData.swap

    return {
        swap_id: swap.id,
        from_address: swap.source_address,
        to_address: swap.destination_address,
        source_network: swap.source_network?.name,
        destination_network: swap.destination_network?.name,
        source_token: swap.source_token?.symbol,
        destination_token: swap.destination_token?.symbol,
        status: swap.status,
    }
}

function getStatusAttributes(event: SwapStatusEvent): Record<string, unknown> {
    return {
        swap_id: event.swapId,
        from_address: event.fromAddress,
        to_address: event.toAddress,
        source_network: event.sourceNetwork,
        destination_network: event.destinationNetwork,
        source_token: event.sourceToken,
        destination_token: event.destinationToken,
        status: event.type,
        phase: event.phase,
        path: event.path,
    }
}

function getSwapStatusEventName(event: SwapStatusEvent): string | undefined {
    if (event.phase === 'completed' || event.type === SwapStatus.Completed) return 'swap_completed'
    if (event.phase === 'failed' || event.type === SwapStatus.Failed || event.type === SwapStatus.Expired) return 'swap_failed'
    if (event.type === SwapStatus.LsTransferPending) return 'swap_pending'
    return undefined
}

function isUserRejection(error: ErrorEventType): boolean {
    return error.name === 'TransactionRejected'
        || /user rejected|user denied|rejected the request/i.test(error.message)
}

// Hoisted to module scope — all values are build-time constants, so a single
// stable reference avoids recreating the providers if this is ever added to a
// memo dependency array.
const WALLET_CONNECT_CONFIGS = {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://layerswap.io/app/',
    icons: ['https://www.layerswap.io/app/symbol.png'],
};

type WidgetWrapperProps<T extends Record<string, unknown> = Record<string, never>> = T & {
    children: ReactNode;
    settings?: LayerSwapSettings;
    themeData?: ThemeData | null;
    apiKey?: string;
    initialValues?: QueryParams;
    callbacks?: LayerswapProviderComponentProps['callbacks'];
    walletProviders?: LayerswapProviderComponentProps['walletProviders'];
    configOverrides?: Partial<LayerswapProviderComponentProps['config']>;
    enableSwapCallbacks?: boolean;
};

const WidgetWrapper = <T extends Record<string, unknown>>({
    children,
    settings,
    themeData,
    apiKey,
    initialValues,
    callbacks,
    walletProviders,
    configOverrides,
    enableSwapCallbacks = false,
}: WidgetWrapperProps<T>) => {
    const router = useRouter()
    const emittedSwapEventsRef = useRef(new Set<string>())
    const recordLifecycleEvent = useSwapLifecycleTelemetry()

    const immutablePassportConfig = useMemo(() => {
        const clientId = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID
        const publishableKey = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY
        if (!clientId || !publishableKey) return undefined
        if (typeof window === 'undefined') return undefined
        const basePath = router.basePath
        const origin = window.location.origin
        return {
            clientId,
            publishableKey,
            redirectUri: `${origin}${basePath}/imtblRedirect`,
            logoutRedirectUri: `${origin}${basePath}/`,
        }
    }, [router.basePath])

    const tonConfig = useMemo(() => {
        const tonApiKey = process.env.NEXT_PUBLIC_TON_API_KEY
        if (typeof window === 'undefined') return undefined
        const manifestUrl = `${window.location.origin}${router.basePath}/tonconnect-manifest.json`
        return {
            tonApiKey: tonApiKey || '',
            manifestUrl,
        }
    }, [router.basePath])

    const defaultWalletProviders = useMemo(() => getDefaultProviders({
        walletConnect: WALLET_CONNECT_CONFIGS,
        ton: tonConfig,
        immutablePassport: immutablePassportConfig,
    }), [tonConfig, immutablePassportConfig])

    const resolvedWalletProviders = walletProviders ?? defaultWalletProviders

    const themeOverrides: Partial<ThemeData> = {
        borderRadius: 'default',
        enablePortal: true,
        enableWideVersion: true,
        hidePoweredBy: true,
    }

    const baseTheme: ThemeData = {
        ...(themeData ?? {}),
        ...(!router.query.theme ? themeOverrides : {}),
    } as ThemeData

    const apiVersion = process.env.NEXT_PUBLIC_API_VERSION as ('mainnet' | 'testnet') | undefined

    const baseConfig: LayerswapProviderComponentProps['config'] = {
        theme: baseTheme,
        apiUri: process.env.NEXT_PUBLIC_LS_API,
        ...(apiKey ? { apiKey } : {}),
        ...(settings ? { settings } : {}),
        ...(initialValues ? { initialValues } : {}),
        ...(apiVersion ? { version: apiVersion } : {}),
    }

    const mergedConfig = {
        ...baseConfig,
        ...configOverrides,
    } as LayerswapProviderComponentProps['config']

    const defaultSwapCallbacks = useMemo<LayerswapProviderComponentProps['callbacks']>(() => (
        enableSwapCallbacks ? {
            onFormChange(formData) {
                updateFormBulk(formData);
            },
            onSwapCreate(swapData) {
                setSwapPath(swapData.swap.id, router)
            },
            onSwapModalStateChange(open) {
                if (!open) {
                    removeSwapPath(router)
                }
            },
            onMenuNavigationChange(path) {
                setMenuPath(path, router)
            },
        } : undefined
    ), [enableSwapCallbacks, router])

    const baseCallbacks = callbacks ?? defaultSwapCallbacks
    const baseOnSwapCreate = baseCallbacks?.onSwapCreate
    const baseOnSwapComplete = baseCallbacks?.onSwapComplete
    const baseOnSwapStatusChange = baseCallbacks?.onSwapStatusChange
    const baseOnSwapLifecycle = baseCallbacks?.onSwapLifecycle
    const hostOnError = baseCallbacks?.onError

    const recordSwapEvent = useCallback((name: string, attributes: Record<string, unknown>) => {
        setSwapContext(attributes)

        const swapId = attributes.swap_id
        const dedupeKey = `${name}:${String(swapId ?? '')}`
        if (emittedSwapEventsRef.current.has(dedupeKey)) return

        const accepted = captureEvent(name, {
            ...attributes,
            page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        })
        if (accepted) emittedSwapEventsRef.current.add(dedupeKey)
    }, [])

    const handleSwapCreate = useCallback((swapData: SwapCallbackData) => {
        recordSwapEvent('swap_initiated', getSwapAttributes(swapData))
        baseOnSwapCreate?.(swapData)
    }, [baseOnSwapCreate, recordSwapEvent])

    const handleSwapComplete = useCallback((swapData: SwapCallbackData) => {
        recordSwapEvent('swap_completed', getSwapAttributes(swapData))
        baseOnSwapComplete?.(swapData)
    }, [baseOnSwapComplete, recordSwapEvent])

    const handleSwapStatusChange = useCallback((event: SwapStatusEvent) => {
        const attributes = getStatusAttributes(event)
        const eventName = getSwapStatusEventName(event)

        if (eventName) recordSwapEvent(eventName, attributes)
        else setSwapContext(attributes)

        baseOnSwapStatusChange?.(event)
    }, [baseOnSwapStatusChange, recordSwapEvent])

    const handleSwapLifecycle = useCallback((event: SwapLifecycleEvent) => {
        recordLifecycleEvent(event)
        baseOnSwapLifecycle?.(event)
    }, [baseOnSwapLifecycle, recordLifecycleEvent])

    const handleError = useCallback((error: ErrorEventType) => {
        const details = error as ErrorEventType & {
            swapId?: string;
            transactionHash?: string;
            fromAddress?: string;
            toAddress?: string;
            network?: string;
        }
        const rejected = isUserRejection(error)
        recordLifecycleEvent({
            step: rejected ? 'wallet_action_rejected' : 'flow_error',
            stage: rejected ? 'wallet_action' : 'flow',
            outcome: rejected ? 'rejected' : 'failed',
            path: 'ErrorHandler',
            swapId: details.swapId,
            transactionHash: details.transactionHash,
            fromAddress: details.fromAddress,
            toAddress: details.toAddress,
            sourceNetwork: details.network,
            reasonCode: rejected ? 'user_rejected' : error.type,
            reason: error.message,
        })

        // Faro always receives widget errors, including on pages that supply a
        // partial callbacks object. Preserve an embedding host's callback too.
        // A declined wallet prompt is an expected user outcome, not an exception.
        if (!rejected) logError(error)
        if (hostOnError && hostOnError !== logError) hostOnError(error)
    }, [hostOnError, recordLifecycleEvent])

    const resolvedCallbacks = useMemo(() => ({
        ...baseCallbacks,
        onSwapCreate: handleSwapCreate,
        onSwapComplete: handleSwapComplete,
        onSwapStatusChange: handleSwapStatusChange,
        onSwapLifecycle: handleSwapLifecycle,
        onError: handleError,
    }), [baseCallbacks, handleError, handleSwapComplete, handleSwapCreate, handleSwapLifecycle, handleSwapStatusChange])

    return <LayerswapProvider
        config={mergedConfig}
        callbacks={resolvedCallbacks}
        walletProviders={resolvedWalletProviders}
    >
        {children}
    </LayerswapProvider>
}

export default WidgetWrapper;
