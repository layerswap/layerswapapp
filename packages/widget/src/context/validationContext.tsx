import React, { createContext, useMemo, ReactNode } from 'react';
import { useFormikContext } from 'formik';
import { useInitialSettings } from './settings';
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { resolveFormValidation } from '@/hooks/useFormValidation';
import { useRouteValidation } from '@/hooks/useRouteValidation';
import { useSwapDataState } from './swap';
import { useSelectedAccount } from './swapAccounts';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { useSlippageStore } from '@/stores';
import { useAutoSlippageTest } from '@/hooks/useAutoSlippageTest';

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
    autoSlippageWouldWork: boolean;
    isTestingAutoSlippage: boolean;
}

const defaultContext: ValidationContextType = {
    formValidation: { message: '' },
    routeValidation: { message: '', details: {} },
    autoSlippageWouldWork: false,
    isTestingAutoSlippage: false,
};

const ValidationContext = createContext<ValidationContextType>(defaultContext);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { values } = useFormikContext<SwapFormValues>();
    const initialSettings = useInitialSettings();
    const { sameAccountNetwork } = initialSettings
    const { swapId } = useSwapDataState()
    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const quoteRefreshInterval = !!swapId ? 0 : undefined;
    const { minAllowedAmount, maxAllowedAmount, quoteError, quote, isQuoteLoading, isDebouncing } = useQuoteData(quoteArgs, quoteRefreshInterval)

    const { autoSlippage } = useSlippageStore();
    const quoteErrorCode = quoteError?.response?.data?.error?.code || quoteError?.code;
    const shouldTestAutoSlippage = !autoSlippage && !quote && !!values.amount && Number(values.amount) > 0 && !!values.from && !!values.to && !quoteErrorCode && !(isQuoteLoading || isDebouncing);
    const { autoSlippageWouldWork, isTestingAutoSlippage } = useAutoSlippageTest({ values, shouldTest: shouldTestAutoSlippage });

    const routeValidation = useRouteValidation(quoteError, !!quote, isQuoteLoading || isDebouncing, autoSlippageWouldWork);

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
            autoSlippageWouldWork,
            isTestingAutoSlippage,
        }),
        [formValidation, routeValidation, autoSlippageWouldWork, isTestingAutoSlippage]
    );

    return <ValidationContext.Provider value={value}>{children}</ValidationContext.Provider>;
};

export const useValidationContext = () => React.useContext(ValidationContext);
