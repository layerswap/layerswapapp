import { motion } from 'framer-motion';
import { FC, useEffect } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { Steps } from '../../Models/Wizard';

type Props = {
    StepName: Steps,
    PositionPercent?: number,
    GoBack?: () => void,
    children: JSX.Element | JSX.Element[];
}

const WizardItem: FC<Props> = (({ StepName, children, GoBack, PositionPercent }) => {
    const { currentStepName, wrapperWidth, moving } = useFormWizardState()
    const { setGoBack, setPositionPercent } = useFormWizardaUpdate()

    useEffect(() => {
        if (currentStepName === StepName) {
            setGoBack(GoBack)
            setPositionPercent(PositionPercent)
        }
    }, [currentStepName, GoBack, PositionPercent, StepName])

    return currentStepName === StepName ?
        <motion.div
            key={currentStepName as string}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
                x: { duration: 0.35, type: "tween" },
            }}
            custom={{ direction: moving === "back" ? -1 : 1, width: wrapperWidth }}>
            <div style={{ width: `${wrapperWidth}px`, minHeight: '504px', height: '100%' }}>
                {wrapperWidth > 1 && children}
            </div >
        </motion.div>
        : null
})

let variants = {
    enter: ({ direction, width }) => ({
        x: direction * width,
    }),
    center: { x: 0 },
    exit: ({ direction, width }) => ({
        x: direction * -width,
    }),
};

export default WizardItem;