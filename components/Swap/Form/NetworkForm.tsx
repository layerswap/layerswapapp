import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Form, FormikHelpers, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import { TokenBalance } from "@/Models/Balance";
import ValidationError from "@/components/validationError";
import useWallet from "@/hooks/useWallet";
import SourcePicker from "@/components/Input/SourcePicker";
import DestinationPicker from "@/components/Input/DestinationPicker";
import QuoteDetails from "@/components/FeeDetails";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { useQueryState } from "@/context/query";
import { Widget } from "@/components/Widget/Index";
import { motion, useCycle } from "framer-motion";
import { useSettingsState } from "@/context/settings";
import { swapInProgress } from "@/components/utils/swapUtils";
import { ArrowUpDown } from "lucide-react";
import { classNames } from "@/components/utils/classNames";
import FormButton from "../FormButton";
import { QueryParams } from "@/Models/QueryParams";
import { WalletProvider } from "@/Models/WalletProvider";
import DepositMethodComponent from "@/components/FeeDetails/DepositMethod";
import { updateForm, updateFormBulk } from "./updateForm";
import { transformFormValuesToQuoteArgs, useQuoteData } from "@/hooks/useFee";
import { useValidationContext } from "@/context/validationContext";
import { InsufficientBalanceWarning } from "@/components/insufficientBalance";
import { useSwapDataState } from "@/context/swap";
import RefuelToggle from "@/components/FeeDetails/Refuel";
import ReserveGasNote from "@/components/ReserveGasNote";
import RefuelModal from "@/components/FeeDetails/RefuelModal";
import { useSelectedAccount } from "@/context/balanceAccounts";
import { useBalance } from "@/lib/balances/useBalance";

type Props = {
    partner?: Partner;
};

const NetworkForm: FC<Props> = ({ partner }) => {
    const [openRefuelModal, setOpenRefuelModal] = useState(false);
    const {
        values,
        setValues, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();

    const {
        to: destination,
        from: source,
        amount,
        depositMethod
    } = values;

    const { provider } = useWallet(source, 'withdrawal');
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);

    const { providers, wallets } = useWallet();
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values, true), [values]);
    const { swapId, swapModalOpen } = useSwapDataState()
    const quoteRefreshInterval = !!swapId ? 0 : undefined;
    const { minAllowedAmount, maxAllowedAmount, isQuoteLoading, quote } = useQuoteData(quoteArgs, quoteRefreshInterval);

    const toAsset = values.toAsset;
    const fromAsset = values.fromAsset;
    const { formValidation, routeValidation } = useValidationContext();
    const query = useQueryState();

    const isValid = !formValidation.message;
    const error = formValidation.message;

    const { balances } = useBalance(selectedSourceAccount?.address, source)
    const walletBalance = source && balances?.find(b => b?.network === source?.name && b?.token === fromAsset?.symbol)
    const walletBalanceAmount = walletBalance?.amount

    useEffect(() => {
        if (!source || !toAsset || !toAsset.refuel) {
            setFieldValue('refuel', false, true);
        }
    }, [toAsset, destination, source, fromAsset]);

    const handleReserveGas = useCallback((nativeTokenBalance: TokenBalance, networkGas: number) => {
        if (nativeTokenBalance.amount && networkGas)
            updateForm({
                formDataKey: 'amount',
                formDataValue: (nativeTokenBalance?.amount - networkGas).toString(),
                setFieldValue
            });
    }, [setFieldValue]);

    const shouldConnectWallet = (source && source?.deposit_methods?.includes('wallet') && depositMethod !== 'deposit_address' && !selectedSourceAccount) || (!source && !wallets.length && depositMethod !== 'deposit_address');

    const showInsufficientBalanceWarning = !!(values.depositMethod === 'wallet'
        && !routeValidation.message
        && !swapModalOpen
        && Number(amount) > 0
        && Number(walletBalanceAmount) < Number(amount))

    return (
        <>
            <DepositMethodComponent />
            <Form className="h-full grow flex flex-col flex-1 justify-between w-full">
                <Widget.Content>
                    <div className="w-full flex flex-col justify-between">
                        <div>
                            <div className='flex-col relative flex justify-between gap-2 w-full leading-4'>
                                {
                                    !(query?.hideFrom && values?.from) && <SourcePicker
                                        minAllowedAmount={minAllowedAmount}
                                        maxAllowedAmount={maxAllowedAmount}
                                        fee={quote}
                                    />
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
                                    !(query?.hideTo && values?.to) && <DestinationPicker
                                        isFeeLoading={isQuoteLoading}
                                        fee={quote}
                                        partner={partner}
                                    />
                                }
                            </div>
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer>
                    <div className="mb-3">
                        <div className="space-y-3">
                            <>
                                {
                                    showInsufficientBalanceWarning &&
                                    <InsufficientBalanceWarning />
                                }
                            </>
                            {
                                Number(values.amount) > 0 &&
                                <ReserveGasNote
                                    maxAllowedAmount={minAllowedAmount}
                                    minAllowedAmount={maxAllowedAmount}
                                    onSubmit={handleReserveGas}
                                />
                            }
                            {
                                values.toAsset?.refuel && !query.hideRefuel &&
                                <RefuelToggle
                                    quote={quote}
                                    onButtonClick={() => setOpenRefuelModal(true)}
                                    minAllowedAmount={minAllowedAmount}
                                />
                            }
                            {
                                routeValidation.message
                                    ? <ValidationError />
                                    : <QuoteDetails swapValues={values} quote={quote} isQuoteLoading={isQuoteLoading} />
                            }
                        </div>
                    </div>
                    <FormButton
                        shouldConnectWallet={shouldConnectWallet}
                        values={values}
                        disabled={!isValid || isSubmitting || !quote || isQuoteLoading}
                        error={error}
                        isSubmitting={isSubmitting}
                        partner={partner}
                    />
                </Widget.Footer>
                <RefuelModal
                    openModal={openRefuelModal}
                    setOpenModal={setOpenRefuelModal}
                    fee={quote}
                />
            </Form>
        </>
    );
};

const ValueSwapperButton: FC<{ values: SwapFormValues, setValues: FormikHelpers<SwapFormValues>['setValues'], providers: WalletProvider[], query: QueryParams }> = ({ values, setValues, providers, query }) => {
    const [animate, cycle] = useCycle(
        { rotateX: 0 },
        { rotateX: 180 }
    );

    let valuesSwapperDisabled = false;

    const {
        sourceRoutes,
        destinationRoutes,
    } = useSettingsState()

    const {
        to: destination,
        fromAsset: fromCurrency,
        toAsset: toCurrency,
        from: source,
    } = values

    const { provider } = useWallet(source, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);

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

        const newFrom = sourceRoutes?.find(l => l.name === destination?.name)
        const newTo = destinationRoutes?.find(l => l.name === source?.name)
        const newFromToken = newFrom?.tokens.find(t => t.symbol === toCurrency?.symbol)
        const newToToken = newTo?.tokens.find(t => t.symbol === fromCurrency?.symbol)

        const destinationProvider = destination
            ? providers.find(p => p.autofillSupportedNetworks?.includes(destination?.name) && p.connectedWallets?.some(w => !w.isNotAvailable && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase())))
            : undefined

        const newDestinationProvider = newTo ? providers.find(p => p.autofillSupportedNetworks?.includes(newTo.name) && p.connectedWallets?.some(w => !w.isNotAvailable && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount?.address?.toLowerCase())))
            : undefined
        const oldDestinationWallet = newDestinationProvider?.connectedWallets?.find(w => w.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo?.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase()))
        const oldDestinationWalletIsNotCompatible = destinationProvider && (destinationProvider?.name !== newDestinationProvider?.name || !(newTo && oldDestinationWallet?.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo?.name.toLowerCase())))
        const destinationWalletIsAvailable = newTo ? newDestinationProvider?.connectedWallets?.some(w => w.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount?.address?.toLowerCase())) : undefined
        const oldSourceWalletIsNotCompatible = destinationProvider && (selectedSourceAccount?.providerName !== destinationProvider?.name || !(newFrom && selectedSourceAccount?.wallet.withdrawalSupportedNetworks?.some(n => n.toLowerCase() === newFrom.name.toLowerCase())))

        const changeDestinationAddress = newTo && (oldDestinationWalletIsNotCompatible || oldSourceWalletIsNotCompatible) && destinationWalletIsAvailable

        const newVales: SwapFormValues = {
            ...values,
            from: newFrom,
            to: newTo,
            fromAsset: newFromToken,
            toAsset: newToToken,
            destination_address: values.destination_address,
            depositMethod: undefined
        }

        if (changeDestinationAddress) {
            newVales.destination_address = selectedSourceAccount?.address
        } else {
            newVales.destination_address = oldDestinationWalletIsNotCompatible ? undefined : values.destination_address
        }

        await updateFormBulk(newVales, true, setValues)

        swapInProgress.current = false;

    }, [values, sourceRoutes, destinationRoutes, sourceCanBeSwapped, selectedSourceAccount])

    return (
        <button
            type="button"
            aria-label="Reverse the source and destination"
            disabled={valuesSwapperDisabled}
            onClick={valuesSwapper}
            className="hover:text-primary-text text-secondary-text absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-lg disabled:cursor-not-allowed disabled:text-secondary-text duration-200 transition disabled:pointer-events-none">
            <motion.div
                animate={animate}
                transition={{ duration: 0.3 }}
                onTap={() => !valuesSwapperDisabled && cycle()}
            >
                <ArrowUpDown className={classNames(valuesSwapperDisabled && 'opacity-50', "w-7 h-auto p-1 bg-secondary-300 hover:bg-secondary-200 rounded-lg disabled:opacity-30")} />
            </motion.div>
        </button>
    )
}

export default NetworkForm;