import IconButton from "../buttons/iconButton"
import GoHomeButton from "../utils/GoHome"
import { ArrowLeft } from 'lucide-react'
import LayerswapMenu from "../LayerswapMenu"
import { useQueryState } from "@/context/query"
import { WalletsHeader } from "../Wallet/ConnectedWallets"

type Props = {
   goBack: (() => void) | undefined | null
   contextualMenu?: React.ReactNode
}

function HeaderWithMenu({ goBack, contextualMenu }: Props) {
   const query = useQueryState()
   return (
      <div className="items-center justify-end sm:items-center w-full flex px-6 mt-2 pb-2 max-sm:pl-0 max-sm:pr-8">
         <div className="flex items-center mr-auto ">
            {
               goBack &&
               <IconButton onClick={goBack}
                  aria-label="Go back"
                  className="max-sm:ml-2 -ml-2"
                  icon={
                     <ArrowLeft strokeWidth="2" />
                  }>
               </IconButton>
            }
            {
               !query.hideLogo && <div className="self-center justify-self-start md:justify-self-center md:hidden">
                  <GoHomeButton />
               </div>
            }
         </div>
         <div className="justify-self-end self-center flex items-center gap-x-2 sm:gap-x-1 -mr-2">
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
