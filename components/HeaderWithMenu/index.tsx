import IconButton from "../buttons/iconButton"
import GoHomeButton from "../utils/GoHome"
import { ArrowLeft } from 'lucide-react'
import dynamic from "next/dynamic"
import LayerswapMenu from "../LayerswapMenu"
import { useQueryState } from "../../context/query"

const WalletsHeader = dynamic(() => import("../Wallet/ConnectedWallets").then((comp) => comp.WalletsHeader), {
   loading: () => <></>
})

function HeaderWithMenu({ goBack }: { goBack: (() => void) | undefined | null }) {
   const query = useQueryState()

   return (
      <div className="items-center justify-end sm:flex sm:items-center sm:w-full sm:justify-end grid grid-cols-5 w-full sm:grid-cols-none sm:grid-none px-6 mt-2 pb-2 max-sm:pl-0 max-sm:pr-8">
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
            !query.hideLogo && <div className="self-center col-start-1 md:col-start-2 md:col-span-3 justify-self-start md:justify-self-center md:hidden">
               <GoHomeButton className="group hideSymbol" />
            </div>
         }
         <div className="col-start-5 justify-self-end self-center flex items-center gap-x-1 -mr-2">
            <WalletsHeader />
            <div className="fixed-width-container max-sm:bg-secondary-500 max-sm:rounded-lg max-sm:p-0.5">
               <LayerswapMenu />
            </div>
         </div>
      </div>
   )
}

export default HeaderWithMenu