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

const WizardItem: FC<Props> = (({ StepName, children, GoBack, PositionPercent }: Props) => {
    const { currentStepName, wrapperWidth, moving, wrapperHeight } = useFormWizardState()
    const { setGoBack, setPositionPercent } = useFormWizardaUpdate()

    useEffect(() => {
        if (currentStepName === StepName) {
            if (GoBack) { setGoBack(GoBack) }
            setPositionPercent(PositionPercent)
        }
    }, [currentStepName, GoBack, PositionPercent, StepName])

    return currentStepName === StepName ?
        <motion.div
            whileInView="done"
            key={currentStepName as string}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
                x: { duration: 0.35, type: "spring" },
            }}
            custom={{ direction: moving === "back" ? -1 : 1, width: wrapperWidth }}>
            <div style={{ width: `${wrapperWidth}px`, minHeight: '504px', height: '100%' }} className="pb-6">
                {wrapperWidth > 1 && children}
            </div>
        </motion.div>
        : null
})

let variants = {
    enter: ({ direction, width }) => ({
        x: direction * width,
    }),
    center: {
        x: 0,
        transition: {
            when: "beforeChildren",
        },
    },
    exit: ({ direction, width }) => ({
        x: direction * -width,
    }),
};

export default WizardItem;