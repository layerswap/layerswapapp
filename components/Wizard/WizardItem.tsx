import { motion } from 'framer-motion';
import { FC, useEffect } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { Steps } from '../../Models/Wizard';

type Props = {
    StepName: Steps,
    PositionPercent?: number,
    GoBack?: () => void,
    children: JSX.Element | JSX.Element[];
    fitHeight?: boolean
}

const WizardItem: FC<Props> = (({ StepName, children, GoBack, PositionPercent, fitHeight = false }: Props) => {
    const { currentStepName, wrapperWidth, moving } = useFormWizardState()
    const { setGoBack, setPositionPercent } = useFormWizardaUpdate()
    const styleConfigs = fitHeight ? { width: `${wrapperWidth}px`, height: '100%' } : { width: `${wrapperWidth}px`, minHeight: '534px', height: '100%' }

    useEffect(() => {
        if (currentStepName === StepName) {
            setGoBack(GoBack)
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
            <div style={styleConfigs} className="pb-6">
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