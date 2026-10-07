import { WidgetHeaderView } from "./Widget/WidgetFrame"
import { useInitialSettings } from "@/context/settings"
import { WidgetBackButton } from "./Widget/WidgetNavigationView"
import LogoWithDetails from "./Common/LogoWithDetails"
import { WalletsHeader } from "./Wallet/WalletComponents/ConnectedWallets"
import LayerswapMenu from "./Menu"
import AppSettings from "@/lib/AppSettings"
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient"

type Props = {
   goBack: (() => void) | undefined | null
   contextualMenu?: React.ReactNode
}

function HeaderWithMenu({ goBack, contextualMenu }: Props) {
   const initialSettings = useInitialSettings()
   const isHeaderLogoVisible = LayerSwapApiClient.apiKey !== AppSettings.LayerswapApiKeys['mainnet'] &&
      LayerSwapApiClient.apiKey !== AppSettings.LayerswapApiKeys['testnet']

   const headerConfigs = AppSettings.ThemeData?.header
   return (
      <WidgetHeaderView start={<>
            {
               goBack ?
                  <WidgetBackButton onClick={goBack} />

                  :
                  headerConfigs?.hideTabs ? null :
                     AppSettings.ThemeData?.enableWideVersion == true ?
                        (!initialSettings.hideLogo && isHeaderLogoVisible) ?
                           <LogoWithDetails className="md:hidden" />
                           : null
                        : <>{contextualMenu}</>
            }
         </>} end={<>
            {headerConfigs?.hideWallets ? null : <WalletsHeader />}
            {AppSettings.ThemeData?.enableWideVersion == true ? contextualMenu : null}
            {headerConfigs?.hideMenu ? null : <LayerswapMenu />}
         </>} />
   )
}

export default HeaderWithMenu