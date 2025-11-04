import IconButton from "../buttons/iconButton"
import GoHomeButton from "../utils/GoHome"
import { ArrowLeft } from 'lucide-react'
import LayerswapMenu from "../LayerswapMenu"
import { useQueryState } from "@/context/query"
import { WalletsHeader } from "../Wallet/ConnectedWallets"
import inIframe from "../utils/inIframe"
import { useEffect, useState } from "react"
import { THEME_COLORS } from "@/Models/Theme"
type Props = {
   goBack: (() => void) | undefined | null
   contextualMenu?: React.ReactNode
}
function HeaderWithMenu({ goBack, contextualMenu }: Props) {
   const query = useQueryState()

   const [embedded, setEmbedded] = useState<boolean>(false)
   useEffect(() => {
      setEmbedded(inIframe())
   }, [])

   const theme = THEME_COLORS[query.theme || 'default']

   return (
      <div className="items-center justify-between sm:flex sm:items-center grid grid-cols-5 w-full sm:grid-cols-none sm:grid-none mt-2 pb-2 px-4 sm:px-6">
         <div className="self-center col-start-1 md:col-start-2 md:col-span-3 justify-self-start md:justify-self-center flex items-center gap-2">
            {
               goBack &&
               <div className="sm:-ml-2 -ml-0">
                  <IconButton onClick={goBack}
                     aria-label="Go back"
                     className=" inline-flex"
                     icon={
                        <ArrowLeft strokeWidth="2" />
                     } />
               </div>
            }
            {
               !query.hideLogo && !embedded && <div className="md:hidden mt-0.5">
                  <GoHomeButton />
               </div>
            }
         </div>
         <div className="col-start-5 justify-self-end self-center flex items-center gap-x-2 sm:gap-x-1">
            {!theme.header?.hideWallets && <WalletsHeader />}
            {!theme.header?.hideTabs && contextualMenu}
            {!theme.header?.hideMenu && <LayerswapMenu />}
         </div>
      </div>
   )
}

export default HeaderWithMenu
