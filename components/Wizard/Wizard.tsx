import { FC, Fragment, useEffect, useRef, useState } from 'react'
import { Dialog, Menu, Transition } from "@headlessui/react";
import { Step, StepPath, useWizardState, WizardPart, WizardParts, WizardPartType } from '../../context/wizard';
import { ArrowLeftIcon, MenuIcon, XIcon } from '@heroicons/react/solid';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { BaseWizard, FormSteps, FormWizardSteps, SwapWizardSteps } from '../../Models/Wizard';
import { useAuthState } from '../../context/auth';
import TokenService from '../../lib/TokenService';
import LayerswapMenu from '../LayerswapMenu';


function classNames(...classes) {
   return classes.filter(Boolean).join(' ')
}

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

   console.log("currentStep", currentStep)
   console.log("wizard currentStep", wizard[currentStep])

   return <>
      <div className={`bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative ${loading ? 'animate-pulse' : ''}`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue">
               <div style={{ width: `${wizard[currentStep].positionPercent}%`, transition: 'width 1s' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
            </div>
         </div>
         <WizardHeader wrapperWidth={wrapperWidth} />
         <div className='text-center text-xl text-darkblue-200'>

         </div>
         <div className="p-2">
            <div className="flex items-start overflow-hidden"
               ref={wrapper}>
               <div className={`flex flex-nowrap min-h-440  ${loading ? 'invisible' : 'visible animate-fade-in-down'}`}>
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
                              style={{ width: `${wrapperWidth}px`, minHeight: '440px' }}>
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



   return <>

      <div className="relative grid grid-cols-2 gap-4 place-content-end px-14 z-20" >
         <>

            <button onClick={goBack} className="justify-self-start" style={{ visibility: wizard[currentStep].navigationDisabled ? 'hidden' : 'visible' }}>
               <ArrowLeftIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
            </button>

            <LayerswapMenu />
         </>
      </div>
   </>
}

export default Wizard;