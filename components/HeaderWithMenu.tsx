import { MessageCircle } from "lucide-react"
import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../context/authContext"
import IconButton from "./buttons/iconButton"
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome"
import { ArrowLeft } from 'lucide-react'

function HeaderWithMenu({ goBack }: { goBack: () => void }) {
   const { email, userId } = useAuthState()
   const { boot, show, update } = useIntercom()
   const updateWithProps = () => update({ email: email, userId: userId })

   return (
      <div className="w-full grid grid-cols-5 px-6 md:px-8 my-1" >
         {
            goBack &&
            <IconButton onClick={goBack} icon={
               <ArrowLeft strokeWidth="3" />
            }>
            </IconButton>
         }
         <div className='justify-self-center self-center col-start-2 col-span-3 mx-auto overflow-hidden imxMarketplace:hidden md:hidden'>
            <GoHomeButton />
         </div>
         <div className="col-start-5 justify-self-end self-center flex items-center gap-5">
            <IconButton className="top-[3px] relative" onClick={() => {
               boot();
               show();
               updateWithProps()
            }}
               icon={
                  <MessageCircle strokeWidth="3" />
               }>
            </IconButton>
            <LayerswapMenu />
         </div>
      </div>
   )
}
export default HeaderWithMenu