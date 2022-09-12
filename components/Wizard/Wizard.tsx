import { FC, useEffect, useRef } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/solid';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import LayerswapMenu from '../LayerswapMenu';
import GoHomeButton from '../utils/GoHome';

type Props = {
   children: JSX.Element[];
}

const Wizard: FC<Props> = ({ children }) => {

   const wrapper = useRef(null);

   const { wrapperWidth, loading: loadingWizard, positionPercent } = useFormWizardState()
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


   return <>
      <div className={`pb-6 bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative ${loading ? 'animate-pulse' : ''}`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue">
               <div style={{ width: `${positionPercent || 0}%`, transition: 'width 1s' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
            </div>
         </div>
         <WizardHeader wrapperWidth={wrapperWidth} />
         <div className='text-center text-xl text-darkblue-200'>

         </div>
         <div className="relative">
            <div className="flex items-start"
               ref={wrapper}>
               <div className={`flex flex-nowrap min-h-480  ${loading ? 'invisible' : 'visible animate-fade-in-down'}`}>
                  {children}
               </div>
            </div>
         </div>
      </div>
   </>
}

function WizardHeader({ wrapperWidth }: { wrapperWidth: number }) {
   const { goBack } = useFormWizardState()

   return <>
      <div className="w-full flex items-center justify-between px-6 md:px-8 mt-3 h-[44px]" >
         <>
            {
               goBack ?
                  <button onClick={goBack} className="justify-self-start" style={{ visibility: false ? 'hidden' : 'visible' }}>
                     <ArrowLeftIcon className='h-5 w-5 text-pink-primary-300 hover:text-ouline-blue cursor-pointer' />
                  </button>
                  :
                  <div></div>
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

export default Wizard;