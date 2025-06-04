import { Form, useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import React from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Partner } from "../../../Models/Partner";
import { motion, useCycle } from "framer-motion";
import { ArrowUpDown } from 'lucide-react'
import { Widget } from "../../Widget/Index";
import { classNames } from "../../utils/classNames";
import { useQueryState } from "../../../context/query";
import FeeDetailsComponent from "../../FeeDetails";
import { useFee } from "../../../context/feeContext";
import dynamic from "next/dynamic";
import { TokenBalance } from "../../../Models/Balance";
import ResizablePanel from "../../ResizablePanel";
import ValidationError from "../../validationError";
import { Exchange, ExchangeToken } from "../../../Models/Exchange";
import { useValidationContext } from "../../../context/validationErrorContext";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import useWallet from "../../../hooks/useWallet";
import { useSettingsState } from "../../../context/settings";
import SourcePicker from "../../Input/SourcePicker";
import DestinationPicker from "../../Input/DestinationPicker";
import CexNetworkPicker from "../../Input/CexNetworkPicker";
import FormButton from "../FormButton";
import { AmountFocusProvider } from "../../../context/amountFocusContext";
import useAllBalances from "../../../hooks/useAllBalances";

type Props = {
    partner?: Partner,
}

const ReserveGasNote = dynamic(() => import("../../ReserveGasNote"), {
    loading: () => <></>,
});

const SwapForm: FC<Props> = ({ partner }) => {
    const {
        values,
        setValues,
        errors, isValid, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();
    const {
        to: destination,
        fromCurrency,
        toCurrency,
        from: source,
        fromExchange,
        toExchange,
        currencyGroup,
    } = values

    const { selectedSourceAccount } = useSwapDataState()
    const { setSelectedSourceAccount } = useSwapDataUpdate()
    const { providers, wallets } = useWallet()
    const { minAllowedAmount, valuesChanger } = useFee()
    const toAsset = values.toCurrency
    const fromAsset = values.fromCurrency

    const { validationMessage } = useValidationContext();

    const query = useQueryState();
    let valuesSwapperDisabled = false;

    const actionDisplayName = query?.actionButtonText || "Swap now"

    useEffect(() => {
        valuesChanger(values)
    }, [values])

    useEffect(() => {
        if (!source || !toAsset || !toAsset.refuel) {
            setFieldValue('refuel', false, true)
        }
    }, [toAsset, destination, source, fromAsset, currencyGroup])

    useEffect(() => {
        (async () => {
            (await import("../../Input/Address")).default
        })()
    }, [destination])

    useEffect(() => {
        if (values.refuel && minAllowedAmount && (Number(values.amount) < minAllowedAmount)) {
            setFieldValue('amount', minAllowedAmount)
        }
    }, [values.refuel, destination, minAllowedAmount])

    const [animate, cycle] = useCycle(
        { rotate: 0 },
        { rotate: 180 }
    );
    const { sourceExchanges, destinationExchanges, destinationRoutes, sourceRoutes } = useSettingsState();


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

    const valuesSwapper = useCallback(() => {
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
            fromCurrency: newFromToken,
            toCurrency: newToToken,
            toExchange: newToExchange,
            fromExchange: newFromExchange,
            currencyGroup: (fromExchange || toExchange) ? (fromExchange ? newToExchangeToken : newFromExchangeToken) : undefined,
            destination_address: (toExchange || fromExchange) ? undefined : values.destination_address,
            depositMethod: undefined
        }

        if (changeDestinationAddress) {
            newVales.destination_address = selectedSourceAccount?.address
        }

        setValues(newVales, true);

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

    const handleReserveGas = useCallback((walletBalance: TokenBalance, networkGas: number) => {
        if (walletBalance && networkGas)
            setFieldValue('amount', walletBalance?.amount - networkGas)
    }, [values.amount])

    const sourceWalletNetwork = values.fromExchange ? undefined : values.from
    const shouldConnectWallet = (sourceWalletNetwork && values.from?.deposit_methods?.includes('wallet') && values.depositMethod !== 'deposit_address' && !selectedSourceAccount) || (!values.from && !values.fromExchange && !wallets.length && values.depositMethod !== 'deposit_address')

    return <AmountFocusProvider>
        <Widget className="sm:min-h-[450px] h-full">
            <Form className={`h-full grow flex flex-col justify-between ${(isSubmitting) ? 'pointer-events-none' : 'pointer-events-auto'}`} >
                <Widget.Content>
                    <div className='flex-col relative flex justify-between gap-1.5 w-full mb-3.5 leading-4'>
                        {!(query?.hideFrom && values?.from) && <div className="flex flex-col w-full bg-secondary-500 rounded-2xl">
                            <SourcePicker />
                        </div>}
                        {!query?.hideFrom && !query?.hideTo &&
                            <button
                                type="button"
                                aria-label="Reverse the source and destination"
                                disabled={valuesSwapperDisabled}
                                onClick={valuesSwapper}
                                className="hover:text-primary absolute right-[calc(50%-16px)] top-[132px] z-10 rounded-lg disabled:cursor-not-allowed disabled:text-secondary-text duration-200 transition disabled:pointer-events-none">
                                <motion.div
                                    animate={animate}
                                    transition={{ duration: 0.3 }}
                                    onTap={() => !valuesSwapperDisabled && cycle()}
                                >
                                    <ArrowUpDown className={classNames(valuesSwapperDisabled && 'opacity-50', "w-7 h-auto p-1 bg-secondary-300 rounded-lg disabled:opacity-30")} />
                                </motion.div>
                            </button>}
                        {!(query?.hideTo && values?.to) && <div className="flex flex-col w-full bg-secondary-500 rounded-xl">
                            <DestinationPicker partner={partner} />
                        </div>}
                    </div>
                    {
                        (((fromExchange && destination) || (toExchange && source)) && currencyGroup) ?
                            <div className="mb-6 leading-4">
                                <ResizablePanel>
                                    <CexNetworkPicker direction={fromExchange ? 'from' : 'to'} partner={partner} />
                                </ResizablePanel>
                            </div>
                            : <></>
                    }
                    <div className="w-full">
                        {validationMessage ?
                            <ValidationError />
                            :
                            <FeeDetailsComponent values={values} />
                        }
                        {
                            values.amount &&
                            <ReserveGasNote onSubmit={(walletBalance, networkGas) => handleReserveGas(walletBalance, networkGas)} />
                        }
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
            </Form>
        </Widget>
    </AmountFocusProvider>
}

export default SwapForm