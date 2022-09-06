import React, { FC, useCallback, useState } from 'react'
import { BaseWizard, Step, _WizardStep } from '../Models/Wizard';

const FormWizardStateContext = React.createContext(null);
const FormWizardStateUpdateContext = React.createContext(null);

export type WizardProvider = {
    currentStep: Step,
    moving: string,
    loading: boolean,
    error: string,
    wizard: _WizardStep<any>[],
}

type UpdateInterface = {
    goToStep: (step: Step) => void,
    goBack: () => void,
    setLoading: (value: boolean) => void,
}

type Props = {
    children?: JSX.Element | JSX.Element[];
    wizard: _WizardStep<any>[],
    initialStep: Step,
    initialLoading?: boolean
}

export const FormWizardProvider: FC<Props> = ({ wizard, initialStep, initialLoading, children }) => {

    const [currentStep, setCurrentStep] = useState<Step>(initialStep)
    const [moving, setmoving] = useState("right")
    const [loading, setLoading] = useState(initialLoading)


    const goToNextStep = useCallback(async (data) => {
        setmoving("right")
        setCurrentStep(await wizard.find(s => s.Step === currentStep).onNext(data))
    }, [currentStep, wizard])

    const goToStep = useCallback((step: Step) => {
        setmoving("right")
        setCurrentStep(step)
    }, [wizard])

    const goBack = useCallback(() => {
        const wizardStep = wizard.find(s => s.Step === currentStep)
        const previousStep = wizardStep.onBack ? wizardStep.onBack() : wizard[wizard.findIndex(s => s.Step === currentStep) - 1].Step

        if (previousStep) {
            setmoving("left")
            setCurrentStep(previousStep)
        }
    }, [wizard, currentStep])

    return (
        <FormWizardStateContext.Provider value={{ currentStep, moving, loading, wizard }}>
            <FormWizardStateUpdateContext.Provider value={{ goToStep, goBack, setLoading }}>
                {children}
            </FormWizardStateUpdateContext.Provider>
        </FormWizardStateContext.Provider >
    );
}


export function useFormWizardState() {
    const data = React.useContext<WizardProvider>((FormWizardStateContext as unknown) as React.Context<WizardProvider>);
    if (data === undefined) {
        throw new Error('useWizardState must be used within a FormWizardStateContext');
    }

    return data;
}

export function useFormWizardaUpdate() {
    const updateFns = React.useContext<UpdateInterface>(FormWizardStateUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}