import { LayerswapProvider, LayerSwapSettings, ThemeData } from "@layerswap/widget/transactions"
import { useRouter } from "next/router"
import { ComponentProps, ReactNode } from "react"
import { updateFormBulk } from "./utils/updateForm"
import { removeSwapPath, setMenuPath, setSwapPath } from "./utils/updatePath"
import { QueryParams } from "../helpers/querryHelper"
import { logError } from "./utils/logError"

type LayerswapProviderComponentProps = ComponentProps<typeof LayerswapProvider>;

type WidgetWrapperProps<T extends Record<string, unknown> = Record<string, never>> = T & {
    children: ReactNode;
    settings?: LayerSwapSettings;
    themeData?: ThemeData | null;
    apiKey?: string;
    initialValues?: QueryParams;
    callbacks?: LayerswapProviderComponentProps['callbacks'];
    configOverrides?: Partial<LayerswapProviderComponentProps['config']>;
    enableSwapCallbacks?: boolean;
};

// WidgetWrapper no longer manages wallet providers — chain shells are
// composed as JSX children by the caller (see DefaultChainShells.tsx and
// the swap pages). LayerswapProvider's children include the shell tree
// and the page content.
const WidgetWrapper = <T extends Record<string, unknown>>({
    children,
    settings,
    themeData,
    apiKey,
    initialValues,
    callbacks,
    configOverrides,
    enableSwapCallbacks = false,
}: WidgetWrapperProps<T>) => {
    const router = useRouter()

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
        ...(apiKey ? { apiKey } : {}),
        ...(settings ? { settings } : {}),
        ...(initialValues ? { initialValues } : {}),
        ...(apiVersion ? { version: apiVersion } : {}),
    }

    const mergedConfig = {
        ...baseConfig,
        ...configOverrides,
    } as LayerswapProviderComponentProps['config']

    const defaultSwapCallbacks = enableSwapCallbacks ? {
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
        onError: logError,
    } : undefined

    const resolvedCallbacks = callbacks ?? defaultSwapCallbacks

    return <LayerswapProvider
        config={mergedConfig}
        callbacks={resolvedCallbacks}
    >
        {children}
    </LayerswapProvider>
}

export default WidgetWrapper;
