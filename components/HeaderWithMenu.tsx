import { ArrowLeftIcon } from "@heroicons/react/solid"
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome"

function HeaderWithMenu({ goBack }: { goBack: () => void }) {

    return <>
       <div className="w-full flex items-center justify-between px-6 md:px-8 mt-3 h-[44px]" >
          <>
             {
                goBack ?
                   <button onClick={goBack} className="justify-self-start" style={{ visibility: false ? 'hidden' : 'visible' }}>
                      <ArrowLeftIcon className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
                   </button>
                   :
                   <div className='h-7 w-7'></div>
             }
             <div className='mx-auto px-4 overflow-hidden md:hidden'>
                <div className="flex justify-center">
                   <GoHomeButton />
                </div>
             </div>
             <LayerswapMenu />
          </>
       </div>
    </>
 }
 export default HeaderWithMenu