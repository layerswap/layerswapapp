import React, { createContext, useMemo, ReactNode, useEffect } from 'react';
import { widgetTelemetry } from '@/lib/widgetTelemetry';
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
import { useUsdModeStore } from '@/stores/usdModeStore';
import { isDepositAddressFlow } from '@/helpers/swapFlow';
import useExchangeNetworks from '@/hooks/useExchangeNetworks';
import { hasValidRefundAmount, manualRefundAddress, refundAddressRequestKey } from '@/helpers/refundAddress';

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
    showRefundAddress: boolean;
}

const defaultContext: ValidationContextType = {
    formValidation: { message: '' },
    routeValidation: { message: '', details: {} },
    autoSlippageWouldWork: false,
    isTestingAutoSlippage: false,
    showRefundAddress: false,
};

const ValidationContext = createContext<ValidationContextType>(defaultContext);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { values, setValues } = useFormikContext<SwapFormValues>();
    const initialSettings = useInitialSettings();
    const { sameAccountNetwork } = initialSettings
    const { swapId } = useSwapDataState()
    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const quoteRefreshInterval = !!swapId ? 0 : undefined;
    // Amount-less deposit flows use detailed quotes; manual amounts use backend limits.
    const { minAllowedAmount, maxAllowedAmount, minAllowedAmountInUsd, maxAllowedAmountInUsd, quoteError, limitsError, quote, isQuoteLoading, isDebouncing } = useQuoteData(quoteArgs, { refreshInterval: quoteRefreshInterval, skipLimits: isDepositAddressFlow(values.depositMethod, values.fromExchange) && !values.amount });

    // Fall back to the limits error only when there are no usable limits at all, so a transient revalidation failure doesn't override a working quote
    const routeError = quoteError ?? ((minAllowedAmount == undefined && maxAllowedAmount == undefined) ? limitsError : undefined);

    const { autoSlippage } = useSlippageStore();
    const quoteErrorCode = quoteError?.response?.data?.error?.code || quoteError?.code;
    const validRefundAmount = hasValidRefundAmount(values, minAllowedAmount, maxAllowedAmount);
    const createRefundRequired = values.refundAddressRequiredFor === refundAddressRequestKey(values);
    const routeErrorCode = routeError?.response?.data?.error?.code || routeError?.code;
    // Dedicated deposit forms have no amount input; a creation rejection must
    // still let the user explicitly choose the required refund recipient.
    const canPromptForRefund = validRefundAmount || (
        createRefundRequired
        && isDepositAddressFlow(values.depositMethod, values.fromExchange)
        && !values.amount
    );
    const showRefundAddress = values.depositMethod === 'deposit_address'
        && !!values.from && values.refundAddressNetwork === values.from.name
        && canPromptForRefund && (!!values.refundAddressRequired || !!values.refund_address)
        // Keep a selected recipient editable when the backend rejects it or the route.
        && (!!values.refund_address || !routeError || routeErrorCode === 'REFUND_ADDRESS_MISSING');
    const quotePending = isDebouncing || isQuoteLoading;
    const settledRoute = !quotePending && (!!quote || (!!routeError && routeErrorCode !== 'REFUND_ADDRESS_MISSING'));
    useEffect(() => {
        const resetSource = values.refundAddressNetwork && (
            values.refundAddressNetwork !== values.from?.name || values.depositMethod !== 'deposit_address');
        const clearRequirement = (values.refundAddressRequiredFor && !createRefundRequired)
            || (values.refundAddressRequired && ((!validRefundAmount && !createRefundRequired)
                || (settledRoute && (!createRefundRequired || !!manualRefundAddress(values)))));
        if (resetSource) {
            setValues({ ...values, refund_address: undefined, refundAddressNetwork: undefined,
                refundAddressRequired: false, refundAddressRequiredFor: undefined }, false);
        } else if (clearRequirement) {
            setValues({ ...values, refundAddressRequired: false, refundAddressRequiredFor: undefined }, false);
        } else if (!quotePending && validRefundAmount && values.depositMethod === 'deposit_address'
            && quoteErrorCode === 'REFUND_ADDRESS_MISSING' && !values.refundAddressRequired) {
            setValues({ ...values, refundAddressRequired: true, refundAddressNetwork: values.from?.name }, false);
        }
    }, [values, createRefundRequired, validRefundAmount, settledRoute, quotePending, quoteErrorCode, setValues]);
    const shouldTestAutoSlippage = !autoSlippage && !quote && !!values.amount && Number(values.amount) > 0 && !!values.from && !!values.to && !quoteErrorCode && !(isQuoteLoading || isDebouncing);
    const { autoSlippageWouldWork, isTestingAutoSlippage } = useAutoSlippageTest({ values, shouldTest: shouldTestAutoSlippage });

    const { networks: exchangeWithdrawalNetworks, isLoading: exchangeNetworksLoading, isValidating: exchangeNetworksValidating } = useExchangeNetworks({ fromExchange: values.fromExchange?.name, to: values.to?.name, toAsset: values.toAsset?.symbol });
    const noExchangeWithdrawalRoute = !!values.fromExchange && !!values.to && !!values.toAsset && !exchangeNetworksLoading && !exchangeNetworksValidating && (exchangeWithdrawalNetworks?.length ?? 0) === 0;
    const routeValidation = useRouteValidation(routeError, !!quote, isQuoteLoading || isDebouncing, autoSlippageWouldWork);

    const isUsdMode = useUsdModeStore(s => s.isUsdMode);

    const formValidation = resolveFormValidation({
        values,
        maxAllowedAmount,
        minAllowedAmount,
        minAllowedAmountInUsd,
        maxAllowedAmountInUsd,
        isUsdMode,
        sourceAddress: selectedSourceAccount?.address,
        sameAccountNetwork,
        quoteError: routeError,
        noExchangeWithdrawalRoute
    })

    const validationCode = formValidation.code
    useEffect(() => {
        widgetTelemetry.validation(validationCode)
    }, [validationCode])

    const value = useMemo(
        () => ({
            formValidation,
            routeValidation,
            autoSlippageWouldWork,
            isTestingAutoSlippage,
            showRefundAddress,
        }),
        [formValidation, routeValidation, autoSlippageWouldWork, isTestingAutoSlippage, showRefundAddress]
    );

    return <ValidationContext.Provider value={value}>{children}</ValidationContext.Provider>;
};

export const useValidationContext = () => React.useContext(ValidationContext);
