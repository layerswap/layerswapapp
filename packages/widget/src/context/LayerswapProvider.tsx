'use client'
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDeferredIntercomInit } from "@/hooks/useDeferredIntercomInit"
import { ErrorBoundary } from "react-error-boundary";
import { SettingsProvider } from "./settings";
import { LayerSwapAppSettings } from "@/Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "@/Models/LayerSwapSettings";
import ErrorFallback from "@/components/ErrorFallback";
import { THEME_COLORS, ThemeData } from "@/Models/Theme";
import type { WidgetConfig } from "@layerswap/widget-types";
import { AsyncModalProvider } from "./asyncModal";
import { IntercomProvider } from 'react-use-intercom';
import AppSettings from "@/lib/AppSettings";
import { getSettings } from "@/helpers/getSettings";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import ColorSchema from "@/components/ColorSchema";
import { WidgetLoading } from "@/components/WidgetLoading";
import WalletsProviders from "@/components/Wallet/WalletProviders";
import { CallbackProvider, CallbacksContextType } from "./callbackProvider";
import { InitialSettings } from "@/Models/InitialSettings";
import { SwapAccountsProvider } from "./swapAccounts";
import { WalletProvider, WalletWrapper } from "@/types"
import { WalletProviderDescriptor, isWalletProviderDescriptor } from "@layerswap/wallet-core/types"
import { ResolverProviders, extractExtendedRouteProviders } from "./resolverContext";
import { setExtendedRouteProviders } from "@/lib/extendedRoutes";
import { ErrorProvider } from "./ErrorProvider";
import { WalletDescriptorLoaderContext } from "@layerswap/wallet-core";
import { registerWidgetErrorLogger } from "@/lib/ErrorHandler";

registerWidgetErrorLogger();

/**
 * Internal config — a refinement of the public `WidgetConfig` contract
 * (`@layerswap/widget-types`): the open `settings`/`initialValues` fields are
 * narrowed to their precise model types here. Because this intersects the
 * contract, the two can never structurally diverge — a drift would fail to
 * compile.
 */
export type LayerswapWidgetConfig = WidgetConfig<ReactNode> & {
    settings?: LayerSwapSettings;
    initialValues?: InitialSettings,
    /** Skeleton shown while settings are being fetched (i.e. when `settings`
     * isn't supplied). Defaults to the swap-shaped `WidgetLoading`; deposit
     * integrations can pass `<DepositLoading />` so the init state matches their
     * layout. */
    loadingComponent?: ReactNode,
} & WalletsConfigs

export type LayerswapContextProps = {
    children?: ReactNode;
    callbacks?: CallbacksContextType
    config?: LayerswapWidgetConfig
    /**
     * Accepts a mix of eager `WalletProvider`/`WalletWrapper` instances and
     * lightweight `WalletProviderDescriptor`s. Descriptors carry only static
     * capability metadata and a `loadProvider()` thunk that lazy-imports the
     * real provider on demand (typically when the connect modal opens).
     */
    walletProviders?: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[]
}

const INTERCOM_APP_ID = 'h5zisg78'
// Stable identity when the prop is omitted — an inline `= []` default would
// mint a fresh array per render and defeat the memos keyed on `walletProviders`.
const NO_PROVIDERS: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[] = []

// Core widget state is process-global (LayerSwapApiClient.apiKey, AppSettings,
// the extended-route registry, resolverService), so two live widget roots
// would silently rewrite one another's API key, settings, and providers.
// Until that state is instance-scoped, enforce one live LayerswapProvider per
// page: the second concurrent instance renders an explicit failure instead of
// cross-contaminating the first.
let liveProviderInstances = 0

const LayerswapProviderComponent: FC<LayerswapContextProps> = ({ children, callbacks, config, walletProviders = NO_PROVIDERS }) => {
    let { apiKey, version, settings: _settings, theme, initialValues, loadingComponent, imtblPassport, tonConfigs, walletConnect } = config || {}
    const [fetchedSettings, setFetchedSettings] = useState<LayerSwapSettings | null>(null)
    const [duplicateMount, setDuplicateMount] = useState(false)

    // Registered in an effect (not render) so StrictMode's mount → cleanup →
    // remount cycle balances out and abandoned renders never count.
    useEffect(() => {
        liveProviderInstances++
        if (liveProviderInstances > 1) {
            console.error(
                '[layerswap/widget] Multiple LayerswapProvider instances detected. '
                + 'The widget keeps process-global state, so only one widget root may be live per page. '
                + 'This instance will not render; destroy the existing widget first.',
            )
            setDuplicateMount(true)
        }
        return () => {
            liveProviderInstances--
        }
    }, [])
    // Defer Intercom script injection until the browser is idle. The provider
    // stays mounted so its context is always available (no remount of any
    // subtree); only the network/parse cost of the third-party widget is
    // pushed past first paint.
    const intercomReady = useDeferredIntercomInit()
    const themeData = useMemo(() => ({ ...THEME_COLORS['default'], ...(theme ?? {}) }), [theme])
    // Legacy globals are read synchronously by descendants during render.
    AppSettings.ApiVersion = version || AppSettings.ApiVersion
    AppSettings.ImtblPassportConfig = imtblPassport
    AppSettings.TonClientConfig = tonConfigs || AppSettings.TonClientConfig
    AppSettings.WalletConnectConfig = walletConnect || AppSettings.WalletConnectConfig
    AppSettings.ThemeData = themeData
    if (apiKey) LayerSwapApiClient.apiKey = apiKey

    useEffect(() => {
        if (_settings) {
            setFetchedSettings(null)
            return
        }

        let cancelled = false
        const apiVersion = version || AppSettings.ApiVersion
        const settingsApiKey = apiKey || AppSettings.LayerswapApiKeys[apiVersion]

        void (async () => {
            const fetchedSettings = await getSettings(settingsApiKey)
            if (!fetchedSettings) throw new Error('Failed to fetch settings')
            if (!cancelled) setFetchedSettings(fetchedSettings)
        })()

        return () => {
            cancelled = true
        }
    }, [_settings, apiKey, version])

    const settings = _settings || fetchedSettings

    // Deliberate render-phase write: the registry must be populated before the
    // `appSettings` memo below runs (`mergeExtendedSourceNetworks` reads it), and
    // a post-commit effect is too late for the first settings object. Safe
    // because the assignment is idempotent and keyed on `walletProviders`, and
    // the single-live-instance guard above rules out a concurrent provider
    // publishing a different list.
    //
    // Registration is keyed on `walletProviders` alone — NOT on `settings`.
    // A settings-only identity change must not re-run it: this eager list lacks
    // descriptor-carried providers, so re-asserting it here would clobber the
    // fuller registry that `ResolverProviders`' effect publishes after descriptor
    // hydration (its deps wouldn't change, so it would never re-register). When
    // `walletProviders` itself changes, that same effect re-fires and restores
    // the full list post-commit.
    const extendedRouteProviders = useMemo(() => {
        const providers = extractExtendedRouteProviders(walletProviders)
        setExtendedRouteProviders(providers)
        return providers
    }, [walletProviders])

    const appSettings = useMemo(() => {
        if (!settings) return null
        return new LayerSwapAppSettings(settings)
    }, [settings, extendedRouteProviders])

    if (duplicateMount) {
        return (
            <div role="alert" style={{ padding: '1rem', textAlign: 'center' }}>
                <p>{'Only one Layerswap widget can be live per page.'}</p>
            </div>
        )
    }

    if (!appSettings) return <>{loadingComponent ?? <WidgetLoading />}</>

    return (
        <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500} shouldInitialize={intercomReady}>
            <SettingsProvider initialLayerswapData={appSettings} initialSettings={config?.initialValues}>
                <CallbackProvider callbacks={callbacks}>
                    <ErrorProvider>
                        <ErrorBoundary FallbackComponent={ErrorFallback} >
                            <DescriptorHydrationBoundary walletProviders={walletProviders}>
                                {(resolvedProviders) => (
                                    <WalletsProviders
                                        appName={initialValues?.appName}
                                        walletProviders={resolvedProviders}
                                    >
                                        <ResolverProviders walletProviders={resolvedProviders}>
                                            <SwapAccountsProvider>
                                                <AsyncModalProvider>
                                                    {children}
                                                </AsyncModalProvider>
                                            </SwapAccountsProvider>
                                        </ResolverProviders>
                                    </WalletsProviders>
                                )}
                            </DescriptorHydrationBoundary>
                        </ErrorBoundary>
                    </ErrorProvider>
                </CallbackProvider>
            </SettingsProvider >
        </IntercomProvider>
    )
}

/**
 * Owns the descriptor → real-provider transition. Starts with the input
 * array as given; when `loadById` is invoked (by the connect modal or any
 * other consumer of `useWalletDescriptorLoader`), runs the descriptor's
 * lazy import and swaps the resolved provider into the list. Both
 * `WalletsProviders` and `ResolverProviders` re-render with the new list.
 */
const DescriptorHydrationBoundary: FC<{
    walletProviders: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[]
    children: (resolved: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[]) => ReactNode
}> = ({ walletProviders, children }) => {
    const [loadedById, setLoadedById] = useState<ReadonlyMap<string, WalletProvider | WalletWrapper>>(new Map())
    // In-flight loads, deduplicated by id, so concurrent triggers don't double-import the SDK.
    const inflightRef = useRef<Map<string, Promise<void>>>(new Map())
    // Mirror `loadedById` into a ref so `loadById`/`loadAll` can read the latest
    // resolved set WITHOUT listing it as a dependency. Otherwise every resolved
    // descriptor changes their identity → new context value → all loader
    // consumers re-render (8 cascades when opening the modal).
    const loadedByIdRef = useRef(loadedById)
    loadedByIdRef.current = loadedById

    const resolvedProviders = useMemo(() => {
        return walletProviders.map(p => {
            if (!isWalletProviderDescriptor(p)) return p
            const loaded = loadedById.get(p.id)
            return loaded ?? p
        })
    }, [walletProviders, loadedById])

    const loadById = useCallback<(id: string) => Promise<void>>(async (id) => {
        if (loadedByIdRef.current.has(id)) return
        const existing = inflightRef.current.get(id)
        if (existing) return existing
        const descriptor = walletProviders.find(p => isWalletProviderDescriptor(p) && p.id === id) as WalletProviderDescriptor | undefined
        if (!descriptor) return
        const p = descriptor.loadProvider().then(real => {
            setLoadedById(prev => {
                if (prev.has(id)) return prev
                const next = new Map(prev)
                next.set(id, real)
                return next
            })
        }).finally(() => {
            inflightRef.current.delete(id)
        })
        inflightRef.current.set(id, p)
        return p
    }, [walletProviders])

    const loadAll = useCallback(async () => {
        const pending = walletProviders
            .filter((p): p is WalletProviderDescriptor => isWalletProviderDescriptor(p) && !loadedByIdRef.current.has(p.id))
            .map(p => loadById(p.id))
        await Promise.all(pending)
    }, [walletProviders, loadById])

    const loaderValue = useMemo(() => ({ loadById, loadAll }), [loadById, loadAll])

    return (
        <WalletDescriptorLoaderContext.Provider value={loaderValue}>
            {children(resolvedProviders)}
        </WalletDescriptorLoaderContext.Provider>
    )
}

export const LayerswapProvider: typeof LayerswapProviderComponent = (props) => {
    return (
        <>
            <ColorSchema themeData={props.config?.theme} />
            <div
                style={{ backgroundColor: 'transparent', height: '100%', width: '100%' }}
                className="layerswap-styles">
                <LayerswapProviderComponent  {...props}>
                    {props.children}
                </LayerswapProviderComponent>
            </div >
        </>

    )
}

/**
 * @deprecated Pass wallet configurations directly to the wallet provider factories instead.
 * - For walletConnect: use `createEVMProvider({ walletConnectConfigs })`, `createSVMProvider({ walletConnectConfigs })`, etc.
 * - For imtblPassport: use `createImmutablePassportProvider({ imtblPassportConfig })`
 * - For tonConfigs: use `createTONProvider({ tonConfigs })`
 * This type will be removed in a future version.
 */
type WalletsConfigs = {
    /**
     * @deprecated Pass `walletConnectConfigs` directly to wallet provider factories
     */
    walletConnect?: typeof AppSettings.WalletConnectConfig
    /**
     * @deprecated Pass `imtblPassportConfig` to `createImmutablePassportProvider({ imtblPassportConfig })`
     */
    imtblPassport?: typeof AppSettings.ImtblPassportConfig
    /**
     * @deprecated Pass `tonConfigs` to `createTONProvider({ tonConfigs })`
     */
    tonConfigs?: typeof AppSettings.TonClientConfig
}
