import React, { createContext, useMemo, ReactNode } from 'react';
import { useFormikContext } from 'formik';
import { useInitialSettings } from './settings';
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { resolveFormValidation } from '@/hooks/useFormValidation';
import { resolveRouteValidation } from '@/hooks/useRouteValidation';
import useWallet from '@/hooks/useWallet';
import { useSwapDataState } from './swap';
import { useSelectedAccount } from './balanceAccounts';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';

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
    const initialSettings = useInitialSettings();
    const { sameAccountNetwork } = initialSettings
    const { swapId } = useSwapDataState()
    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const quoteRefreshInterval = !!swapId ? 0 : undefined;
    const { minAllowedAmount, maxAllowedAmount, quoteError } = useQuoteData(quoteArgs, quoteRefreshInterval)

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
