import React, { createContext, useMemo, ReactNode } from 'react';
import { useFormikContext } from 'formik';
import { useQueryState } from './query';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { resolveFormValidation } from '@/hooks/useFormValidation';
import { resolveRouteValidation } from '@/hooks/useRouteValidation';
import { useSwapDataState } from './swap';
import { useSelectedAccount } from './swapAccounts';

export interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

interface ValidationContextType {
    formValidation: {
        code?: string;
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
    const { swapId } = useSwapDataState()
    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const quoteRefreshInterval = !!swapId ? 0 : undefined;
    const { minAllowedAmount, maxAllowedAmount, quoteError, quote, isQuoteLoading, isDebouncing } = useQuoteData(quoteArgs, quoteRefreshInterval)

    const routeValidation = resolveRouteValidation(quoteError, !!quote, isQuoteLoading || isDebouncing);

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
