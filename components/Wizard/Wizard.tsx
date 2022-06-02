import { FC, useEffect, useRef, useState } from 'react'
import { Transition } from "@headlessui/react";
import { Step, StepPath, WizardPart, WizardParts } from '../../context/wizard';
import { ArrowLeftIcon } from '@heroicons/react/solid';


type Props = {
   WizardParts: WizardParts,
   CurrentStepPart: StepPath
}

const Wizard: FC<Props> = ({ CurrentStepPart, WizardParts }) => {

   const [wrapperWidth, setWrapperWidth] = useState(1);
   const wrapper = useRef(null);

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

   const currentStep = WizardParts[CurrentStepPart.part].steps[CurrentStepPart.index]

   return <>
      <div className="bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative">
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue">
               <div style={{ width: "50%" }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
            </div>
         </div>
         <div className="grid grid-cols-2 gap-4 place-content-end p-2" style={{ visibility: currentStep.navigationDisabled ? 'hidden' : 'visible' }}>
            <>
               {/* <button onClick={prevStep} className="justify-self-start">
                  <ArrowLeftIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
               </button> */}
            </>
         </div>
         <div className='text-center text-xl text-darkblue-200'>

         </div>
         <div className="p-2">
            <div className="flex items-start overflow-hidden"
               ref={wrapper}>
               <div className="flex flex-nowrap min-h-440">
                  {/* <PartWrapper currentStepPath={CurrentStepPart} moving={moving}
                     part={WizardParts.Swap} wrapperWidth={wrapperWidth} />
                  <PartWrapper currentStepPath={CurrentStepPart} moving={moving}
                     part={WizardParts.Auth} wrapperWidth={wrapperWidth} />
                  <PartWrapper currentStepPath={CurrentStepPart} moving={moving}
                     part={WizardParts.Flow} wrapperWidth={wrapperWidth} />
                  <PartWrapper currentStepPath={CurrentStepPart} moving={moving}
                     part={WizardParts.Withdrawal} wrapperWidth={wrapperWidth} />
                  <PartWrapper currentStepPath={CurrentStepPart} moving={moving}
                     part={WizardParts.PaymentStatus} wrapperWidth={wrapperWidth} /> */}
               </div>
            </div>
         </div>
      </div>
   </>
}

function PartWrapper({ part, moving, currentStepPath, wrapperWidth }: { part: WizardPart, moving: string, currentStepPath: StepPath, wrapperWidth: number }) {

   return <>
       {
           part.steps.map((step, index) => <StepWrapper key={index}
               step={step}
               moving={moving}
               current={currentStepPath.part == part.type && currentStepPath.index == index}
               wrapperWidth={wrapperWidth}
           />)
       }
   </>
}


function StepWrapper({ step, moving, wrapperWidth, current }: { step: Step, moving: string, wrapperWidth: number, current: boolean }) {
   console.log(step)
   console.log(current)
   return <>
       <Transition
           key={step.title}
           appear={false}
           unmount={false}
           show={current}
           enter="transform transition ease-in-out duration-2000"
           enterFrom={
               moving === "right"
                   ? `translate-x-96 opacity-0`
                   : `-translate-x-96 opacity-0`
           }
           enterTo={`opacity-100`}
           leave="transform transition ease-in-out duration-1000"
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
               <step.content current={current} />
           </div>
       </Transition>
   </>
}

export default Wizard;