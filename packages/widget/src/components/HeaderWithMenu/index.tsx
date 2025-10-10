import { useInitialSettings } from "@/context/settings"
import IconButton from "../Buttons/iconButton"
import LogoWithDetails from "../Common/LogoWithDetails"
import { ArrowLeft } from 'lucide-react'
import { WalletsHeader } from "../Wallet/WalletComponents/ConnectedWallets"
import LayerswapMenu from "../Menu"

type Props = {
   goBack: (() => void) | undefined | null
   contextualMenu?: React.ReactNode
}

function HeaderWithMenu({ goBack, contextualMenu }: Props) {
   const initialSettings = useInitialSettings()
   return (
      <div className="items-center justify-between sm:flex sm:items-center grid grid-cols-5 w-full sm:grid-cols-none sm:grid-none mt-2 pb-2 px-6">
         <div className="self-center col-start-1 md:col-start-2 md:col-span-3 justify-self-start md:justify-self-center">
            {
               goBack ?
                  <IconButton onClick={goBack}
                     aria-label="Go back"
                     className="-ml-2 inline-flex"
                     icon={
                        <ArrowLeft strokeWidth="2" />
                     }>
                  </IconButton>
                  :
                  !initialSettings.hideLogo ?
                     <LogoWithDetails className="md:hidden" />
                     : null
            }
         </div>
         <div className="col-start-5 justify-self-end self-center flex items-center gap-x-2 sm:gap-x-1 -mr-2">
            <WalletsHeader />
            {contextualMenu}
            <div className="fixed-width-container max-sm:bg-secondary-500 max-sm:rounded-lg max-sm:p-0.5">
               <LayerswapMenu />
            </div>
         </div>
      </div>
   )
}

export default HeaderWithMenu
