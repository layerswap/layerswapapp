import { LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { FC, useEffect, useState } from "react"
import WidgetWrapper from "../../WidgetWrapper"
import { QueryParams } from "../../../helpers/querryHelper"
import type { ComponentProps } from "react"

type WidgetWrapperProviders = ComponentProps<typeof WidgetWrapper>["walletProviders"]

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string, initialValues: QueryParams }> = ({ settings, themeData, apiKey, initialValues }) => {
    const [walletProviders, setWalletProviders] = useState<WidgetWrapperProviders>([])

    useEffect(() => {
        let cancelled = false
        import("../../defaultWalletProviders").then(mod => {
            if (cancelled) return
            setWalletProviders(mod.buildDefaultWalletProviders())
        })
        return () => { cancelled = true }
    }, [])

    return (
        <WidgetWrapper
            settings={settings}
            themeData={themeData}
            apiKey={apiKey}
            initialValues={initialValues}
            walletProviders={walletProviders}
            enableSwapCallbacks
        >
            <Swap />
        </WidgetWrapper>
    )
}

export default SwapPage