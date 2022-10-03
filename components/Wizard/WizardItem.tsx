// import { FC, useEffect } from 'react'
// import { Transition } from "@headlessui/react";
// import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
// import { Steps } from '../../Models/Wizard';
// import { AnimatePresence, motion } from 'framer-motion';

// type Props = {
//     StepName: Steps,
//     PositionPercent?: number,
//     GoBack?: () => void,
//     children: JSX.Element | JSX.Element[];
// }

// const WizardItem: FC<Props> = (({ StepName, children, GoBack, PositionPercent }) => {
//     const { currentStepName, moving, wrapperWidth } = useFormWizardState()
//     const { setGoBack, setPositionPercent } = useFormWizardaUpdate()

//     const variants = {
//         enter: (moving: string) => {
//             return {
//                 x: moving == 'right' ? 1000 : -1000,
//                 opacity: 0
//             };
//         },
//         center: {
//             zIndex: 1,
//             x: 0,
//             opacity: 1
//         },
//         exit: (moving: string) => {
//             return {
//                 zIndex: 0,
//                 x: moving != 'right' ? 1000 : -1000,
//                 opacity: 0
//             };
//         }
//     };

//     useEffect(() => {
//         if (currentStepName === StepName) {
//             setGoBack(GoBack)
//             setPositionPercent(PositionPercent)
//         }
//     }, [currentStepName, GoBack, PositionPercent, StepName])

//     return (
//         <div
//             className={`${StepName === currentStepName ? 'w-full' : 'w-0'} overflow-visible`}
//         >
//             <AnimatePresence initial={false} custom={moving}>
//                 {
//                     StepName === currentStepName &&
//                     <motion.div
//                         key={StepName}
//                         initial='enter'
//                         animate='center'
//                         exit='exit'
//                         custom={moving}
//                         variants={variants}
//                         transition={{
//                             x: { type: "spring", stiffness: 300, damping: 30, duration: 0.5 },
//                             opacity: { duration: 0.2 }
//                         }}
//                         style={{ width: `${wrapperWidth}px`, minHeight: '504px', height: '100%' }}

//                     >
//                         {children}
//                     </motion.div>
//                 }
//             </AnimatePresence>
//         </div>

//     )
// })

// export default WizardItem;

import { FC, useEffect } from 'react'
import { Transition } from "@headlessui/react";
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { Steps } from '../../Models/Wizard';

type Props = {
    StepName: Steps,
    PositionPercent?: number,
    GoBack?: () => void,
    children: JSX.Element | JSX.Element[];
}

const WizardItem: FC<Props> = (({ StepName, children, GoBack, PositionPercent }) => {
    const { currentStepName, moving, wrapperWidth } = useFormWizardState()
    const { setGoBack, setPositionPercent } = useFormWizardaUpdate()

    useEffect(() => {
        if (currentStepName === StepName) {
            setGoBack(GoBack)
            setPositionPercent(PositionPercent)
        }
    }, [currentStepName, GoBack, PositionPercent, StepName])

    return <Transition
        appear={false}
        unmount={false}
        show={StepName === currentStepName}
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
        className={`${StepName === currentStepName ? 'w-full' : 'w-0'} overflow-visible`}
        as="div"
    >
        <div
            style={{ width: `${wrapperWidth}px`, minHeight: '504px', height: '100%' }}>
            {children}
        </div>
    </Transition>
})

export default WizardItem;