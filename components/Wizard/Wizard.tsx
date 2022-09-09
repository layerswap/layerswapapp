import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { Transition } from "@headlessui/react";
import { ArrowLeftIcon } from '@heroicons/react/solid';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { BaseWizard } from '../../Models/Wizard';
import LayerswapMenu from '../LayerswapMenu';
import LayerSwapLogo from '../icons/layerSwapLogo';
import { useRouter } from 'next/router';

const Wizard: FC = ({ children }) => {

   const [wrapperWidth, setWrapperWidth] = useState(1);
   const wrapper = useRef(null);
   const { wizard, currentStepName, moving, loading: loadingWizard } = useFormWizardState()

   const loading = !wizard || loadingWizard
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

   const currentWizardStep = wizard.find(s => s.Name === currentStepName)

   return <>
      <div className={`mb-10 pb-6 bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative ${loading ? 'animate-pulse' : ''}`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue">
               <div style={{ width: `${currentWizardStep.positionPercent}%`, transition: 'width 1s' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
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
   const { goBack } = useFormWizardaUpdate()
   const { wizard, currentStepName } = useFormWizardState()
   const router = useRouter();

   const handleGoHome = useCallback(() => {
      router.push({
         pathname: "/",
         query: router.query
      })
   }, [router.query])

   const currentStep = wizard.find(s => s.Name === currentStepName)
   const canGoBack = typeof currentStep.onBack === 'function'
   return <>
      <div className="w-full flex items-center justify-between px-8 mt-3 h-[44px]" >
         <>
            {
               canGoBack &&
               <button onClick={goBack} className="justify-self-start" style={{ visibility: false ? 'hidden' : 'visible' }}>
                  <ArrowLeftIcon className='h-5 w-5 text-pink-primary-300 hover:text-ouline-blue cursor-pointer' />
               </button>
            }
            <div className='mx-auto px-4 overflow-hidden md:hidden'>
               <div className="flex justify-center">
                  <a onClick={handleGoHome}>
                     <LayerSwapLogo className="h-8 w-auto text-white opacity-50" />
                  </a>
               </div>
            </div>
            <LayerswapMenu />
         </>
      </div>
   </>
}

export default Wizard;