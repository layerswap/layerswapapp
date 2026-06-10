import { LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { DepositComponent } from "@layerswap/widget/deposit"
import { FC } from "react"
import WidgetWrapper from "../../WidgetWrapper"
import { QueryParams } from "../../../helpers/querryHelper"

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string, initialValues: QueryParams }> = ({ settings, themeData, apiKey, initialValues }) => {
    return (
        <WidgetWrapper
            settings={settings}
            themeData={themeData}
            apiKey={apiKey}
            initialValues={initialValues}
            enableSwapCallbacks
        >
            {/* <Swap /> */}
            <DepositComponent
                mode="button"
                destination={{ network: "STARKNET_SEPOLIA", tokens: ["ETH"] }}
                destinationAddress="0x04f5F8e5cDae95A5C1B84b97f7fd7fEff3463325C97Cc84D2830e1150Acf6820"
            />
        </WidgetWrapper>
    )
}

export default SwapPage