import IconButton from "../Buttons/iconButton"
import LogoWithDetails from "../Common/LogoWithDetails"
import { ArrowLeft } from 'lucide-react'
import LayerswapMenu from "../Menu"
import { useInitialSettings } from "../../context/settings"
import { NetworkExchangeTabs } from "../Pages/Swap/Form/NetworkExchangeTabs"
import { WalletsHeader } from "../Wallet/WalletComponents/ConnectedWallets"

function HeaderWithMenu({ goBack }: { goBack?: (() => void) | undefined | null }) {
   const initialSettings = useInitialSettings()

   return (
      <div className="items-center justify-end sm:flex sm:items-center grid grid-cols-5 w-full sm:grid-cols-none sm:grid-none px-6 mt-2 pb-2 max-sm:pl-0 max-sm:pr-8">
         {
            goBack &&
            <IconButton onClick={goBack}
               aria-label="Go back"
               className="-ml-2 inline-flex"
               icon={
                  <ArrowLeft strokeWidth="2" />
               }>
            </IconButton>
         }
         {
            !initialSettings.hideLogo && <div className="self-center col-start-1 md:col-start-2 md:col-span-3 justify-self-start md:justify-self-center md:hidden">
               <LogoWithDetails className="group hideSymbol" />
            </div>
         }
         <div className="col-start-5 justify-self-end self-center flex items-center gap-x-2 sm:gap-x-1 -mr-2">
            <WalletsHeader />
            <div className="block sm:hidden">
               <NetworkExchangeTabs />
            </div>
            <div className="fixed-width-container max-sm:bg-secondary-500 max-sm:rounded-lg max-sm:p-0.5">
               <LayerswapMenu />
            </div>
         </div>
      </div>
   )
}

export default HeaderWithMenu