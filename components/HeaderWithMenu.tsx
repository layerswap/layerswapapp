import { ArrowLeftIcon } from "@heroicons/react/solid"
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome"

function HeaderWithMenu({ goBack }: { goBack: () => void }) {

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
         <div className="col-start-5 justify-self-end self-center">
            <LayerswapMenu />
         </div>
      </div>
   )
}
export default HeaderWithMenu