import React, { createContext, useMemo, ReactNode } from 'react';
import { useFormikContext } from 'formik';
import { useQueryState } from './query';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { resolveFormValidation } from '@/hooks/useFormValidation';
import { resolveRouteValidation } from '@/hooks/useRouteValidation';
import useWallet from '@/hooks/useWallet';

interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

interface ValidationContextType {
    formValidation: {
        message: string;
    };
    routeValidation: {
        message: string;
        details: ValidationDetails;
    };
}

const defaultContext: ValidationContextType = {
    formValidation: { message: '' },
    routeValidation: { message: '', details: {} },
};

const ValidationContext = createContext<ValidationContextType>(defaultContext);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { values } = useFormikContext<SwapFormValues>();
    const query = useQueryState();
    const { sameAccountNetwork } = query

    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const { minAllowedAmount, maxAllowedAmount, quoteError } = useQuoteData(quoteArgs)

    const routeValidation = resolveRouteValidation(quoteError);

    const formValidation = resolveFormValidation({
        values,
        maxAllowedAmount,
        minAllowedAmount,
        sourceAddress: selectedSourceAccount?.address,
        sameAccountNetwork,
        quoteError
    })

    const value = useMemo(
        () => ({
            formValidation,
            routeValidation,
        }),
        [formValidation, routeValidation]
    );

    return <ValidationContext.Provider value={value}>{children}</ValidationContext.Provider>;
};

export const useValidationContext = () => React.useContext(ValidationContext);
