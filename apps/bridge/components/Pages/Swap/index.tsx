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
            <Swap />
            {/* <DepositComponent
                mode="button"
                destination={{ network: "ARBITRUM_MAINNET", tokens: ["USDC", "ETH"] }}
                destinationAddress="0xB2029bbd8C1cBCC43c3A7b7fE3d118b0C57D7C31"
            /> */}
        </WidgetWrapper>
    )
}

export default SwapPage