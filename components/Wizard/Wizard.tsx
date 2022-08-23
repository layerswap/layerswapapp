import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { Transition } from "@headlessui/react";
import { ArrowLeftIcon } from '@heroicons/react/solid';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { BaseWizard } from '../../Models/Wizard';
import LayerswapMenu from '../LayerswapMenu';
import LayerSwapLogo from '../icons/layerSwapLogo';
import { useRouter } from 'next/router';

const Wizard: FC = () => {

   const [wrapperWidth, setWrapperWidth] = useState(1);
   const wrapper = useRef(null);
   const { wizard, currentStep, moving, loading: loadingWizard } = useFormWizardState<BaseWizard>()

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

   return <>
      <div className={`pb-6 bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative ${loading ? 'animate-pulse' : ''}`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue">
               <div style={{ width: `${wizard[currentStep].positionPercent}%`, transition: 'width 1s' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
            </div>
         </div>
         <WizardHeader wrapperWidth={wrapperWidth} />
         <div className='text-center text-xl text-darkblue-200'>

         </div>
         <div className="relative">
            <div className="flex items-start"
               ref={wrapper}>
               <div className={`flex flex-nowrap min-h-480  ${loading ? 'invisible' : 'visible animate-fade-in-down'}`}>
                  {
                     Object.keys(wizard).map((step, index) => {
                        const Content = (wizard as BaseWizard)[step].content
                        return <Transition
                           key={index}
                           appear={false}
                           unmount={false}
                           show={step === currentStep}
                           enter="transform transition ease-in-out duration-500"
                           enterFrom={
                              moving === "right"
                                 ? `translate-x-96 opacity-0`
                                 : `-translate-x-96 opacity-0`
                           }
                           enterTo={`translate-x-0 opacity-100`}
                           leave="transform transition ease-in-out duration-500"
                           leaveFrom={`translate-x-0 opacity-100`}
                           leaveTo={
                              moving === "right"
                                 ? `-translate-x-96 opacity-0`
                                 : `translate-x-96 opacity-0`
                           }
                           className={`${step === currentStep ? 'w-full' : 'w-0'} overflow-visible`}
                           as="div"
                        >
                           <div
                              style={{ width: `${wrapperWidth}px`, minHeight: '504px', height: '100%' }}>
                              <Content current={step === currentStep} />
                           </div>
                        </Transition>
                     })
                  }
               </div>
            </div>
         </div>
      </div>
   </>
}

function WizardHeader({ wrapperWidth }: { wrapperWidth: number }) {
   const { goBack } = useFormWizardaUpdate()
   const { wizard, currentStep } = useFormWizardState<BaseWizard>()
   const router = useRouter();

   const handleGoHome = useCallback(() => {
      router.push({
          pathname: "/",
          query: router.query
      })
  }, [router.query])

   return <>
      <div className="w-full flex items-center justify-between px-6 md:px-8 mt-3 h-[44px]" >
         <>
            <button onClick={goBack} className="justify-self-start" style={{ visibility: wizard[currentStep].navigationDisabled ? 'hidden' : 'visible' }}>
               <ArrowLeftIcon className='h-5 w-5 text-pink-primary-300 hover:text-ouline-blue cursor-pointer' />
            </button>
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