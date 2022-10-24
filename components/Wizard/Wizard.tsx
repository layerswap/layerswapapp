import { FC, useEffect, useRef } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/solid';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import LayerswapMenu from '../LayerswapMenu';
import GoHomeButton from '../utils/GoHome';
import { AnimatePresence } from 'framer-motion';
import { ChatIcon } from '@heroicons/react/outline';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../context/authContext';

type Props = {
   children: JSX.Element | JSX.Element[];
}

const Wizard: FC<Props> = ({ children }) => {

   const wrapper = useRef(null);

   const { wrapperWidth, loading: loadingWizard, positionPercent, moving } = useFormWizardState()
   const { setWrapperWidth } = useFormWizardaUpdate()
   const loading = loadingWizard

   useEffect(() => {
      function handleResize() {
         if (wrapper.current !== null) {
            setWrapperWidth(wrapper.current.offsetWidth);
         }
      }
      window.addEventListener("resize", handleResize);
      handleResize();

      return () => window.removeEventListener("resize", handleResize);
   }, []);

   const width = positionPercent || 0
   return <>
      <div className={`pb-6 bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-darkblue-500">
               <div style={{ width: `${width}%`, transition: 'width 1s' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-primary"></div>
            </div>
         </div>
         <WizardHeader wrapperWidth={wrapperWidth} />
         <div className='text-center text-xl text-darkblue-50'>

         </div>
         <div className="relative px-6 md:px-8">
            <div className="flex items-start"
               ref={wrapper}>
               <AnimatePresence initial={false} custom={{ direction: moving === "forward" ? 1 : -1, width: wrapperWidth }}>
                  <div className={`flex flex-nowrap min-h-480 `}>
                     {children}
                  </div>
               </AnimatePresence>
            </div>
         </div>
      </div>
   </>
}

function WizardHeader({ wrapperWidth }: { wrapperWidth: number }) {
   const { goBack } = useFormWizardState()
   const { boot, show, update } = useIntercom()
   const { email } = useAuthState()
   const updateWithProps = () => update({ email: email })

   return <>
      <div className="w-full grid grid-cols-4 md:grid-cols-2 grid-rows-1 items-center px-6 md:px-8 mt-3 h-[44px]" >
         {
            goBack ?
               <button onClick={goBack} className="justify-self-start" style={{ visibility: false ? 'hidden' : 'visible' }}>
                  <ArrowLeftIcon className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
               </button>
               :
               <div className='h-7 w-7'></div>
         }
         <div className='mx-auto overflow-hidden md:hidden ml-4'>
            <GoHomeButton />
         </div>
         <div className='flex items-center space-x-1 justify-end col-start-4'>
            <button
               className='flex items-center p-2 bg-darkblue-600 hover:bg-darkblue-500 rounded-md text-xs space-x-1'
               onClick={() => {
                  boot();
                  show();
                  updateWithProps()
               }}
            >
               <ChatIcon className='h-5 w-5' />
               <p className='hidden md:block'>Get Help</p>
            </button>
            <LayerswapMenu />
         </div>
      </div>
   </>
}

export default Wizard;