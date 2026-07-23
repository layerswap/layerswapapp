import { useInitialSettings } from "@/context/settings"
import IconButton from "./Buttons/iconButton"
import LogoWithDetails from "./Common/LogoWithDetails"
import { ArrowLeft } from 'lucide-react'
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
      <div className="items-center justify-between sm:flex sm:items-center grid grid-cols-5 w-full sm:grid-cols-none sm:grid-none mt-2 pb-2 px-4">
         <div className="self-center col-start-1 md:col-start-2 md:col-span-3 justify-self-start md:justify-self-center flex items-center gap-2">
            {
               goBack ?
                  <div className="ml-0">
                     <IconButton onClick={goBack}
                        aria-label="Go back"
                        icon={
                           <ArrowLeft strokeWidth="2" />
                        }>
                     </IconButton>
                  </div>

                  :
                  headerConfigs?.hideTabs ? null :
                     AppSettings.ThemeData?.enableWideVersion == true ?
                        (!initialSettings.hideLogo && isHeaderLogoVisible) ?
                           <LogoWithDetails className="md:hidden" />
                           : null
                        : <>{contextualMenu}</>
            }
         </div>
         <div className="col-start-5 justify-self-end self-center flex items-center gap-x-2 sm:gap-x-1 sm:mr-2">
            {headerConfigs?.hideWallets ? null : <WalletsHeader />}
            {AppSettings.ThemeData?.enableWideVersion == true ? contextualMenu : null}
            {headerConfigs?.hideMenu ? null : <LayerswapMenu />}
         </div>
      </div>
   )
}

export default HeaderWithMenu