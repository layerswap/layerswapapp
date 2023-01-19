import { QuestionMarkCircleIcon } from "@heroicons/react/outline"
import { ArrowLeftIcon, LightBulbIcon } from "@heroicons/react/solid"
import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../context/authContext"
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome"

function HeaderWithMenu({ goBack }: { goBack: () => void }) {
   const { email, userId } = useAuthState()
   const { boot, show, update } = useIntercom()
   const updateWithProps = () => update({ email: email, userId: userId })

   return (
      <div className="w-full grid grid-cols-5 px-6 md:px-8 mt-3" >
         {
            goBack &&
            <button onClick={goBack} className="justify-self-start" style={{ visibility: false ? 'hidden' : 'visible' }}>
               <ArrowLeftIcon className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
            </button>
         }
         <div className='justify-self-center self-center col-start-2 col-span-3 mx-auto overflow-hidden imxMarketplace:hidden md:hidden'>
            <GoHomeButton />
         </div>
         <div className="col-start-5 justify-self-end self-center flex items-center gap-2">
            <button
               onClick={() => {
                  boot();
                  show();
                  updateWithProps()
               }}
               className='flex items-center gap-1 text-xs text-primary-text py-1 p-1 md:px-2 bg-darkblue-400 hover:bg-darkblue-300 rounded-md border border-darkblue-400 hover:border-darkblue-100 duration-200 transition'
            >
               <QuestionMarkCircleIcon className="h-4" />
               <span className="hidden md:block">Help</span>
            </button>
            <LayerswapMenu />
         </div>
      </div>
   )
}
export default HeaderWithMenu