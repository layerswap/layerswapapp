import React, { FC, useCallback, useState } from 'react'
import { BaseWizard, ProcessSwapStep, SwapCreateStep, WizardStep } from '../Models/Wizard';

const FormWizardStateContext = React.createContext(null);
const FormWizardStateUpdateContext = React.createContext(null);

export type WizardProvider<T> = {
    currentStepName: T,
    moving: string,
    loading: boolean,
    error: string,
    wizard: WizardStep<any>[],
}

type UpdateInterface<T> = {
    goToNextStep: (data?: any) => void,
    goToStep: (step: T) => void,
    goBack: () => void,
    setLoading: (value: boolean) => void,
}

type Props<T> = {
    children?: JSX.Element | JSX.Element[];
    wizard: WizardStep<T>[],
    initialStep: T,
    initialLoading?: boolean
}

export const FormWizardProvider = <T extends SwapCreateStep | ProcessSwapStep>(props: Props<T>) => {
    const { wizard, initialStep, initialLoading, children } = props
    const [currentStepName, setCurrentStepName] = useState<T>(initialStep)
    const [moving, setmoving] = useState("right")
    const [loading, setLoading] = useState(initialLoading)

    const goToNextStep = useCallback(async (data) => {
        setmoving("right")
        setCurrentStepName(await wizard.find(s => s.Name === currentStepName).onNext(data))
    }, [currentStepName, wizard])

    const goToStep = useCallback((step: T) => {
        setmoving("right")
        setCurrentStepName(step)
    }, [wizard])

    const goBack = useCallback(() => {
        const wizardStep = wizard.find(s => s.Name === currentStepName)
        const previousStepIndex = wizardStep.onBack ? wizard.findIndex(s => s.Name === wizardStep.onBack()) : wizard.findIndex(s => s.Name === currentStepName) - 1
        const previousStep = wizard[previousStepIndex]

        if (previousStep) {
            setmoving("left")
            setCurrentStepName(previousStep.Name)
        }

    }, [wizard, currentStepName])

    return (
        <FormWizardStateContext.Provider value={{ currentStepName, moving, loading, wizard }}>
            <FormWizardStateUpdateContext.Provider value={{ goToStep, goBack, setLoading, goToNextStep }}>
                {children}
            </FormWizardStateUpdateContext.Provider>
        </FormWizardStateContext.Provider >
    );
}


export function useFormWizardState<T>() {
    const data = React.useContext<WizardProvider<T>>((FormWizardStateContext as unknown) as React.Context<WizardProvider<T>>);
    if (data === undefined) {
        throw new Error('useWizardState must be used within a FormWizardStateContext');
    }

    return data;
}

export function useFormWizardaUpdate<T>() {
    const updateFns = React.useContext<UpdateInterface<T>>(FormWizardStateUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}