import { LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { Deposit } from "@layerswap/widget/deposit"
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
                mode="button"
                hideRecipient
                destinations={[
                    { network: "STARKNET_MAINNET", token: "ETH" },
                ]}
                destinationAddress="0x01837e50abe7B59bc3d0A57F09D80a0C34aAF1127b2c5E36b9E9b817030FF11b"
            />
        </WidgetWrapper>
    )
}

export default SwapPage