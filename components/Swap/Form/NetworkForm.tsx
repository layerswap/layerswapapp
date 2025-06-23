import { FC, useCallback, useEffect, useState } from "react";
import { Form, FormikErrors, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import { useQuote } from "@/context/feeContext";
import { TokenBalance } from "@/Models/Balance";
import ResizablePanel from "@/components/ResizablePanel";
import ValidationError from "@/components/validationError";
import { useValidationContext } from "@/context/validationErrorContext";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import useWallet from "@/hooks/useWallet";
import SourcePicker from "@/components/Input/SourcePicker";
import DestinationPicker from "@/components/Input/DestinationPicker";
import CexNetworkPicker from "@/components/Input/CexNetworkPicker";
import QuoteDetails from "@/components/FeeDetails";
import DepositMethodComponent from "@/components/FeeDetails/DepositMethod";
import dynamic from "next/dynamic";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { useQueryState } from "@/context/query";
import { UrlQuerySync } from "./UrlQuerySync";
import { Widget } from "@/components/Widget/Index";
import { motion, useCycle } from "framer-motion";
import { useSettingsState } from "@/context/settings";
import { swapInProgress } from "@/components/utils/swapUtils";
import { Exchange, ExchangeToken } from "@/Models/Exchange";
import { ArrowUpDown } from "lucide-react";
import { classNames } from "@/components/utils/classNames";
import FormButton from "../FormButton";
import { QueryParams } from "@/Models/QueryParams";
import { WalletProvider } from "@/Models/WalletProvider";

const ReserveGasNote = dynamic(() => import("@/components/ReserveGasNote"), {
    loading: () => <></>,
});
const RefuelModal = dynamic(() => import("@/components/FeeDetails/RefuelModal"), {
    loading: () => <></>,
});
const RefuelToggle = dynamic(() => import("@/components/FeeDetails/Refuel"), {
    loading: () => <></>,
});

type Props = {
    partner?: Partner;
};

const NetworkForm: FC<Props> = ({ partner }) => {
    const {
        values,
        setValues,
        errors, isValid, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();

    const {
        to: destination,
        from: source,
        fromExchange,
        toExchange,
        currencyGroup,
    } = values;

    const { selectedSourceAccount } = useSwapDataState();
    const { providers, wallets } = useWallet();
    const { minAllowedAmount, valuesChanger, isQuoteLoading, quote } = useQuote();
    const toAsset = values.toAsset;
    const fromAsset = values.fromAsset;
    const { validationMessage } = useValidationContext();
    const query = useQueryState();

    const actionDisplayName = query?.actionButtonText || "Swap now";
    const [openRefuelModal, setOpenRefuelModal] = useState<boolean>(false);

    useEffect(() => {
        valuesChanger(values);
    }, [values, values.destination_address]);

    useEffect(() => {
        if (!source || !toAsset || !toAsset.refuel) {
            setFieldValue('refuel', false, true);
        }
    }, [toAsset, destination, source, fromAsset, currencyGroup]);

    useEffect(() => {
        if (values.refuel && minAllowedAmount && (Number(values.amount) < minAllowedAmount)) {
            setFieldValue('amount', minAllowedAmount);
        }
    }, [values.refuel, destination, minAllowedAmount]);

    const handleReserveGas = useCallback((walletBalance: TokenBalance, networkGas: number) => {
        if (walletBalance && networkGas)
            setFieldValue('amount', walletBalance?.amount - networkGas);
    }, [setFieldValue]);

    const sourceWalletNetwork = values.fromExchange ? undefined : values.from;
    const shouldConnectWallet = (sourceWalletNetwork && values.from?.deposit_methods?.includes('wallet') && values.depositMethod !== 'deposit_address' && !selectedSourceAccount) || (!values.from && !values.fromExchange && !wallets.length && values.depositMethod !== 'deposit_address');

    return (
        <Form className={`h-full grow flex flex-col justify-between ${(isSubmitting) ? 'pointer-events-none' : 'pointer-events-auto'}`}>
            <DepositMethodComponent />
            <UrlQuerySync
                fieldMapping={{ from: 'name', to: 'name', fromAsset: 'symbol', toAsset: 'symbol', currencyGroup: 'symbol', fromExchange: 'name', toExchange: 'name' }}
                excludeFields={['refuel']}
            />
            <Widget className="sm:min-h-[450px] h-full">
                <Widget.Content>
                    <div className="w-full min-h-[79svh] sm:min-h-[480px] flex flex-col justify-between">
                        <div>
                            <div className='flex-col relative flex justify-between gap-1.5 w-full mb-3.5 leading-4'>
                                {
                                    !(query?.hideFrom && values?.from) && <SourcePicker />
                                }
                                {
                                    !query?.hideFrom && !query?.hideTo &&
                                    <ValueSwapperButton
                                        values={values}
                                        setValues={setValues}
                                        providers={providers}
                                        query={query}
                                    />
                                }
                                {
                                    !(query?.hideTo && values?.to) && <DestinationPicker partner={partner} />
                                }
                            </div>
                            {
                                (((fromExchange && destination) || (toExchange && source)) && currencyGroup) &&
                                <div className="mb-6 leading-4">
                                    <ResizablePanel>
                                        <CexNetworkPicker direction={fromExchange ? 'from' : 'to'} partner={partner} />
                                    </ResizablePanel>
                                </div>
                            }
                            <div className="w-full">
                                {values.amount &&
                                    <ReserveGasNote onSubmit={handleReserveGas} />
                                }
                            </div>
                        </div>
                        <div className="space-y-3">
                            {
                                values.toAsset?.refuel && !query.hideRefuel && !toExchange &&
                                <RefuelToggle onButtonClick={() => setOpenRefuelModal(true)} />
                            }
                            {
                                validationMessage
                                    ? <ValidationError />
                                    : <QuoteDetails swapValues={values} quote={quote} isQuoteLoading={isQuoteLoading} />
                            }
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer>
                    <FormButton
                        shouldConnectWallet={shouldConnectWallet}
                        values={values}
                        isValid={isValid}
                        errors={errors}
                        isSubmitting={isSubmitting}
                        actionDisplayName={actionDisplayName}
                        partner={partner}
                    />
                </Widget.Footer>
                <RefuelModal openModal={openRefuelModal} setOpenModal={setOpenRefuelModal} />
            </Widget>
        </Form>
    );
};

const ValueSwapperButton: FC<{ values: SwapFormValues, setValues: (values: React.SetStateAction<SwapFormValues>, shouldValidate?: boolean) => Promise<void | FormikErrors<SwapFormValues>>, providers: WalletProvider[], query: QueryParams }> = ({ values, setValues, providers, query }) => {
    const [animate, cycle] = useCycle(
        { rotateX: 0 },
        { rotateX: 180 }
    );
    const { selectedSourceAccount } = useSwapDataState()
    const { setSelectedSourceAccount } = useSwapDataUpdate()

    let valuesSwapperDisabled = false;

    const {
        destinationExchanges,
        sourceExchanges,
        sourceRoutes,
        destinationRoutes,
    } = useSettingsState()

    const {
        to: destination,
        fromAsset: fromCurrency,
        toAsset: toCurrency,
        from: source,
        fromExchange,
        toExchange,
    } = values

    const sourceCanBeSwapped = !source ? true : (destinationRoutes?.some(l => l.name === source?.name && l.tokens.some(t => t.symbol === fromCurrency?.symbol && t.status === 'active')) ?? false)
    const destinationCanBeSwapped = !destination ? true : (sourceRoutes?.some(l => l.name === destination?.name && l.tokens.some(t => t.symbol === toCurrency?.symbol && t.status === 'active')) ?? false)

    if (query.lockTo || query.lockFrom || query.hideTo || query.hideFrom) {
        valuesSwapperDisabled = true;
    }
    if (!sourceCanBeSwapped || !destinationCanBeSwapped) {
        valuesSwapperDisabled = true;
    } else if (!source && !destination) {
        valuesSwapperDisabled = true;
    }

    const valuesSwapper = useCallback(async () => {
        swapInProgress.current = true;
        let newFromExchange: Exchange | undefined
        let newToExchange: Exchange | undefined
        let newFromExchangeToken: ExchangeToken | undefined
        let newToExchangeToken: ExchangeToken | undefined

        if (toExchange) {
            newFromExchange = sourceExchanges?.find(e => e.name === toExchange?.name)
            newFromExchangeToken = newFromExchange?.token_groups.find(t => t.symbol === fromCurrency?.symbol)
        }
        if (fromExchange) {
            newToExchange = destinationExchanges?.find(e => e.name === fromExchange?.name)
            newToExchangeToken = newToExchange?.token_groups.find(t => t.symbol === toCurrency?.symbol)
        }

        const newFrom = sourceRoutes?.find(l => l.name === destination?.name)
        const newTo = destinationRoutes?.find(l => l.name === source?.name)
        const newFromToken = newFrom?.tokens.find(t => t.symbol === toCurrency?.symbol)
        const newToToken = newTo?.tokens.find(t => t.symbol === fromCurrency?.symbol)

        const destinationProvider = (destination && !toExchange)
            ? providers.find(p => p.autofillSupportedNetworks?.includes(destination?.name) && p.connectedWallets?.some(w => !w.isNotAvailable && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase())))
            : undefined

        const newDestinationProvider = (newTo && !toExchange) ? providers.find(p => p.autofillSupportedNetworks?.includes(newTo.name) && p.connectedWallets?.some(w => !w.isNotAvailable && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount?.address.toLowerCase())))
            : undefined
        const oldDestinationWallet = newDestinationProvider?.connectedWallets?.find(w => w.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo?.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase()))
        const oldDestinationWalletIsNotCompatible = destinationProvider && (destinationProvider?.name !== newDestinationProvider?.name || !(newTo && oldDestinationWallet?.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo?.name.toLowerCase())))
        const destinationWalletIsAvailable = newTo ? newDestinationProvider?.connectedWallets?.some(w => w.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount?.address.toLowerCase())) : undefined
        const oldSourceWalletIsNotCompatible = destinationProvider && (selectedSourceAccount?.wallet.providerName !== destinationProvider?.name || !(newFrom && selectedSourceAccount?.wallet.withdrawalSupportedNetworks?.some(n => n.toLowerCase() === newFrom.name.toLowerCase())))

        const changeDestinationAddress = newTo && (oldDestinationWalletIsNotCompatible || oldSourceWalletIsNotCompatible) && destinationWalletIsAvailable

        const newVales: SwapFormValues = {
            ...values,
            from: newFrom,
            to: newTo,
            fromAsset: newFromToken,
            toAsset: newToToken,
            toExchange: newToExchange,
            fromExchange: newFromExchange,
            currencyGroup: (fromExchange || toExchange) ? (fromExchange ? newToExchangeToken : newFromExchangeToken) : undefined,
            destination_address: (toExchange || fromExchange) ? undefined : values.destination_address,
            depositMethod: undefined
        }

        if (changeDestinationAddress) {
            newVales.destination_address = selectedSourceAccount?.address
        } else {
            newVales.destination_address = oldDestinationWalletIsNotCompatible ? undefined : values.destination_address
        }

        await setValues(newVales, true);
        swapInProgress.current = false;

        const changeSourceAddress = newFrom && values.depositMethod === 'wallet' && destinationProvider && (oldSourceWalletIsNotCompatible || changeDestinationAddress)
        if (changeSourceAddress && values.destination_address) {
            const sourceAvailableWallet = destinationProvider?.connectedWallets?.find(w => w.withdrawalSupportedNetworks?.some(n => n.toLowerCase() === newFrom.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase()))
            if (sourceAvailableWallet) {
                setSelectedSourceAccount({
                    wallet: sourceAvailableWallet,
                    address: values.destination_address
                })
            }
            else {
                setSelectedSourceAccount(undefined)
            }

        }
    }, [values, sourceRoutes, destinationRoutes, sourceCanBeSwapped, destinationExchanges, selectedSourceAccount])

    return (
        <button
            type="button"
            aria-label="Reverse the source and destination"
            disabled={valuesSwapperDisabled}
            onClick={valuesSwapper}
            className="hover:text-primary absolute right-[calc(50%-16px)] top-[144px] z-10 rounded-lg disabled:cursor-not-allowed disabled:text-secondary-text duration-200 transition disabled:pointer-events-none">
            <motion.div
                animate={animate}
                transition={{ duration: 0.3 }}
                onTap={() => !valuesSwapperDisabled && cycle()}
            >
                <ArrowUpDown className={classNames(valuesSwapperDisabled && 'opacity-50', "w-7 h-auto p-1 bg-secondary-300 rounded-lg disabled:opacity-30")} />
            </motion.div>
        </button>
    )
}

export default NetworkForm;
