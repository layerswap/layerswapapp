import { motion } from 'framer-motion';
import { FC, useEffect, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import { Steps } from '../../Models/Wizard';
import inIframe from '../utils/inIframe';

type Props = {
    StepName: Steps,
    PositionPercent?: number,
    GoBack?: () => void,
    children: JSX.Element | JSX.Element[];
}

const WizardItem: FC<Props> = (({ StepName, children, GoBack, PositionPercent }) => {
    const { currentStepName, wrapperWidth, moving } = useFormWizardState()
    const { setGoBack, setPositionPercent } = useFormWizardaUpdate()
    const { height } = useWindowDimensions();
    const [wrapperHeight, setWrapperHeight] = useState('')

    useEffect(() => {
        if(inIframe()) setWrapperHeight(`${height - 67}px`)
        else setWrapperHeight('100%')
    }, [height])

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
            <div className='min-h-[504px] h-full' style={{ width: `${wrapperWidth}px`, height: wrapperHeight }}>
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