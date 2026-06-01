import { LayerSwapSettings, Swap, ThemeData, Deposit } from "@layerswap/widget"
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
            <Deposit
                destinations={[
                    { network: "BASE_MAINNET", token: "USDC" },
                    { network: "ARBITRUM_MAINNET", token: "USDC" },
                    { network: "ETHEREUM_MAINNET", token: "USDC" },
                ]}
                destinationAddress="0xB2029bbd8C1cBCC43c3A7b7fE3d118b0C57D7C31"
            />
        </WidgetWrapper>
    )
}

export default SwapPage