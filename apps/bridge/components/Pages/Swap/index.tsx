import { LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { FC } from "react"
import WidgetWrapper from "../../WidgetWrapper"
import { ParsedUrlQuery } from "querystring"

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string, initialValues: ParsedUrlQuery }> = ({ settings, themeData, apiKey, initialValues }) => {
    return (
        <WidgetWrapper
            settings={settings}
            themeData={themeData}
            apiKey={apiKey}
            initialValues={initialValues}
            enableSwapCallbacks
        >
            <Swap />
        </WidgetWrapper>
    )
}

export default SwapPage