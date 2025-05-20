import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../../context/authContext"
import IconButton from "../Buttons/iconButton"
import GoHomeButton from "../utils/GoHome"
import { ArrowLeft } from 'lucide-react'
import ChatIcon from "../Icons/ChatIcon"
import LayerswapMenu from "../LayerswapMenu"
import { useQueryState } from "../../context/query"
import { WalletsHeader } from "../Wallet/WalletComponents/ConnectedWallets"

// const WalletsHeader = dynamic(() => import("../Wallet/WalletComponents/ConnectedWallets").then((comp) => comp.WalletsHeader), {
//    loading: () => <></>
// })


function HeaderWithMenu({ goBack }: { goBack: (() => void) | undefined | null }) {
   const { email, userId } = useAuthState()
   const { boot, show, update } = useIntercom()
   const updateWithProps = () => update({ userId, customAttributes: { email: email, } })
   const query = useQueryState()

   return (
      <div className="w-full grid grid-cols-5 px-6 pt-3 pb-2" >
         {
            goBack &&
            <IconButton onClick={goBack}
               aria-label="Go back"
               className="-ml-2"
               icon={
                  <ArrowLeft strokeWidth="2" />
               }>
            </IconButton>
         }
         <div className="col-start-5 justify-self-end self-center flex items-center gap-x-1 -mr-2">
            <div className="fixed-width-container">
               <LayerswapMenu />
            </div>
         </div>
      </div>
   )
}

export default HeaderWithMenu