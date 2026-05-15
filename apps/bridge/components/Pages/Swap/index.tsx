import { LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { FC } from "react"
import WidgetWrapper from "../../WidgetWrapper"
import DefaultChainShells from "../../DefaultChainShells"
import { QueryParams } from "../../../helpers/querryHelper"

// Chain shells are composed in DefaultChainShells (JSX children of
// LayerswapProvider) — no more async setState of a walletProviders array.
// The shell tree mounts once and stays stable for the lifetime of the
// page, so there is no [] → populated transition to remount the swap UI.
const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string, initialValues: QueryParams }> = ({ settings, themeData, apiKey, initialValues }) => {
    return (
        <WidgetWrapper
            settings={settings}
            themeData={themeData}
            apiKey={apiKey}
            initialValues={initialValues}
            enableSwapCallbacks
        >
            <DefaultChainShells>
                <Swap />
            </DefaultChainShells>
        </WidgetWrapper>
    )
}

export default SwapPage
