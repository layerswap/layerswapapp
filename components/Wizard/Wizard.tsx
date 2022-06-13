import { FC, useEffect, useRef, useState } from 'react'
import { Transition } from "@headlessui/react";
import { Step, StepPath, useWizardState, WizardPart, WizardParts, WizardPartType } from '../../context/wizard';
import { ArrowLeftIcon } from '@heroicons/react/solid';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { BaseWizard, FormSteps, FormWizardSteps, SwapWizardSteps } from '../../Models/Wizard';


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
      <div className={`bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative ${loading ? 'animate-pulse' : ''}`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue">
               <div style={{ width: `${wizard[currentStep].positionPercent}%`,transition:'width 1s;' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
            </div>
         </div>
         <WizardHeader />
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
                           className="w-0 overflow-visible"
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

function WizardHeader() {
   const { goBack } = useFormWizardaUpdate()
   const { wizard, currentStep } = useFormWizardState<BaseWizard>()

   return <div className="grid grid-cols-2 gap-4 place-content-end p-2" style={{ visibility: wizard[currentStep].navigationDisabled ? 'hidden' : 'visible' }}>
      <>
         <button onClick={goBack} className="justify-self-start">
            <ArrowLeftIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
         </button>
      </>
   </div>
}

export default Wizard;