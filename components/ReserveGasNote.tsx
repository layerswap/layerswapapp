import { useMemo } from "react"
import { useBalancesState } from "../context/balances"
import useWallet from "../hooks/useWallet"
import WarningMessage from "./WarningMessage"
import { useFormikContext } from "formik"
import { SwapFormValues } from "./DTOs/SwapFormValues"
import { truncateDecimals } from "./utils/RoundDecimals"
import { CalculateMinAllowedAmount } from "../lib/fees"
import { useSettingsState } from "../context/settings"
import { Balance, Gas } from "../Models/Balance"

const ReserveGasNote = ({ onSubmit }: { onSubmit: (walletBalance: Balance, networkGas: Gas) => void }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { balances, gases } = useBalancesState()
    const settings = useSettingsState()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values.from && getProvider(values.from)
    }, [values.from, getProvider])

    const wallet = provider?.getConnectedWallet()
    const minAllowedAmount = CalculateMinAllowedAmount(values, settings.networks, settings.currencies);

    const walletBalance = wallet && balances[wallet.address]?.find(b => b?.network === values?.from?.internal_name && b?.token === values?.currency?.asset)
    const networkGas = values.from?.internal_name ?
        gases?.[values.from?.internal_name]?.find(g => g.token === values?.currency?.asset)
        : null

    const mightBeAutOfGas = !!(networkGas && walletBalance?.isNativeCurrency && Number(values.amount)
        + networkGas?.gas > walletBalance.amount
        && walletBalance.amount > minAllowedAmount
    )
    const gasToReserveFormatted = mightBeAutOfGas ? truncateDecimals(networkGas?.gas, values?.currency?.precision) : 0

    return (
        mightBeAutOfGas && gasToReserveFormatted > 0 &&
        <WarningMessage messageType="warning" className="mt-4">
            <div className="font-normal text-primary-text">
                <div>
                    You might not be able to complete the transaction.
                </div>
                <div onClick={() => onSubmit(walletBalance, networkGas)} className="cursor-pointer border-b border-dotted border-primary-text w-fit hover:text-primary hover:border-primary text-primary-text">
                    <span>Reserve</span> <span>{gasToReserveFormatted}</span> <span>{values?.currency?.asset}</span> <span>for gas.</span>
                </div>
            </div>
        </WarningMessage>
    )
}

export default ReserveGasNote