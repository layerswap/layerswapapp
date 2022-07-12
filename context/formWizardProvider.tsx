import React, { useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import { BaseWizard } from '../Models/Wizard';


const FormWizardStateContext = React.createContext(null);
const FormWizardStateUpdateContext = React.createContext(null);

export type WizardProvider<Type> = {
    currentStep: keyof Type,
    moving: string,
    loading: boolean,
    error: string,
    wizard: Type,
}

type UpdateInterface<Type> = {
    goToStep: (step: keyof Type) => void,
    goBack: () => void,
    setLoading: (value: boolean) => void,
    setWizardError: (error: string) => void
}

export function FormWizardProvider<Type extends BaseWizard>({ children, wizard, initialStep, initialLoading }: { children, wizard: Type, initialStep: keyof Type, initialLoading?: boolean }) {

    const [currentStep, setCurrentStep] = useState<keyof Type>(initialStep)
    const [moving, setmoving] = useState("right")
    const [loading, setLoading] = useState(initialLoading)
    const [error, setError] = useState("")

    const goToStep = useCallback((step: keyof Type) => {
        const currentPosition = Object.keys(wizard).findIndex(k => k === currentStep)
        const nextPosition = Object.keys(wizard).findIndex(k => k === step)
        setmoving(currentPosition < nextPosition ? "right" : "left")
        setCurrentStep(step)
    }, [currentStep])

    const getPreviousStep = (step) => {
        const wizardSteps = Object.keys(wizard) as (keyof Type)[]
        const position = wizardSteps.findIndex(k => k === step)
        const previousStep = wizardSteps[position - 1]
        if (wizard[previousStep]?.dismissOnBack)
            return getPreviousStep(previousStep)
        return previousStep
    }

    const setWizardError = (error) => {
        toast.error(error)
    }

    const goBack = useCallback(() => {
        const previousStep = getPreviousStep(currentStep)
        if (previousStep) {
            setmoving("left")
            setCurrentStep(previousStep)
        }
    }, [currentStep])

    return (
        <FormWizardStateContext.Provider value={{ currentStep, moving, loading, error, wizard }}>
            <FormWizardStateUpdateContext.Provider value={{ goToStep, goBack, setLoading, setWizardError }}>
                {children}
            </FormWizardStateUpdateContext.Provider>
        </FormWizardStateContext.Provider >
    );
}


export function useFormWizardState<Type>() {
    const data = React.useContext<WizardProvider<Type>>((FormWizardStateContext as unknown) as React.Context<WizardProvider<Type>>);
    if (data === undefined) {
        throw new Error('useWizardState must be used within a FormWizardStateContext');
    }

    return data;
}

export function useFormWizardaUpdate<Type>() {
    const updateFns = React.useContext<UpdateInterface<Type>>(FormWizardStateUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}