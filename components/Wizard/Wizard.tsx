import { FC, Fragment, useEffect, useRef, useState } from 'react'
import { Dialog, Transition } from "@headlessui/react";
import { Step, StepPath, useWizardState, WizardPart, WizardParts, WizardPartType } from '../../context/wizard';
import { ArrowLeftIcon, MenuIcon, XIcon } from '@heroicons/react/solid';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { BaseWizard, FormSteps, FormWizardSteps, SwapWizardSteps } from '../../Models/Wizard';
import { useAuthState } from '../../context/auth';
import SomeTestStep from './Steps/SomeTestStep';


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
               <div style={{ width: `${wizard[currentStep].positionPercent}%`, transition: 'width 1s' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
            </div>
         </div>
         <WizardHeader wrapperWidth={wrapperWidth} />
         <div className='text-center text-xl text-darkblue-200'>
            <input
               type="text"
               name="username"
               id="username"
               autoComplete="username"
               className="flex-1 block w-full focus:ring-indigo-500 focus:border-indigo-500 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
            />
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

function WizardHeader({ wrapperWidth }: { wrapperWidth: number }) {
   const { goBack } = useFormWizardaUpdate()
   const { wizard, currentStep } = useFormWizardState<BaseWizard>()
   const { email, authData } = useAuthState()
   const [open, setOpen] = useState(false)

   const handleOpenMenu = () => {
      setOpen(true)
   }
   const handleCloseMenu = () => {
      setOpen(false)
   }
   return <>
      <div className='flex flex-nowrap min-h-440'>
         <Transition
            appear={false}
            unmount={false}
            show={open}
            enter="transform transition ease-in-out duration-500"
            enterFrom={`translate-x-96 `}
            enterTo={`translate-x-0 o`}
            leave="transform transition ease-in-out duration-500"
            leaveFrom={`translate-x-0 opacity-100`}
            leaveTo={`-translate-x-96 `}
            className="w-0 overflow-visible absolute z-10"
            as="div">
            <SomeTestStep />
         </Transition>
      </div>
      <div className="grid grid-cols-2 gap-4 place-content-end p-2" >
         <>

            <button onClick={goBack} className="justify-self-start" style={{ visibility: wizard[currentStep].navigationDisabled ? 'hidden' : 'visible' }}>
               <ArrowLeftIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
            </button>
            <span onClick={handleOpenMenu} className="justify-self-end text-light-blue cursor-pointer">
               <MenuIcon className='h-8 w-8 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
            </span>

         </>
      </div>
   </>
}

export default Wizard;