import { ActionMessageType } from "@layerswap/wallet-core/types";
import { FC } from "react"
import WalletMessage, { WalletUnknownError } from "./Message"
import { Address } from "@/lib/address/Address"

const ConfirmActionMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Confirm in wallet'
        details='Please confirm the transaction in your wallet' />
}

const TransactionInProgressMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Transaction in progress'
        details='Waiting for your transaction to be published' />
}

const InsufficientFundsMessage: FC = () => {
    return <WalletMessage
        status="error"
        header='Insufficient funds'
        details='The balance of the connected wallet is not enough' />
}

const TransactionRejectedMessage: FC = () => {
    return <WalletMessage
        status="error"
        header='Transaction rejected'
        details={`You've rejected the transaction in your wallet. Click “Try again” to open the prompt again.`} />
}

const DifferentAccountsNotAllowedError: FC<{ network: string }> = ({ network }) => {
    return <WalletMessage
        status="error"
        header='Action needed'
        details={`Transfers between ${network} and other chains are only allowed within the same account. Please make sure you&apos;re using the same address on both source and destination.`} />
}

const TransactionFailedMessage: FC = () => {
    return <WalletMessage
        status="error"
        header='Transaction failed'
        details={`Transfer failed or terminated`} />
}

const WalletMismatchMessage: FC<{ address: string; network: { name: string } }> = ({ address, network }) => {
    return <WalletMessage
        status="error"
        header='Account mismatch'
        details={`Select ${new Address(address, network).toShortString()} in your wallet, then try again`} />
}

const SwapErrorMessage: FC<{ message: string }> = ({ message }) => {
    return <WalletMessage
        status="error"
        header='API error'
        details={message} />
}

const GaslessUnavailableMessage: FC<{ message?: string }> = ({ message }) => {
    return <WalletMessage
        status="error"
        header={message ? 'Gasless deposit failed' : 'Gasless transfer unavailable'}
        details={message || `Gasless transfers aren't available for this route right now. Switch to a standard transfer to continue — you'll pay the network fee yourself.`} />
}

const UnexpectedErrorMessage: FC<{ message?: string }> = () => {
    return <WalletUnknownError />
}

export const ActionMessages = {
    ConfirmActionMessage,
    TransactionInProgressMessage,
    InsufficientFundsMessage,
    TransactionRejectedMessage,
    WalletMismatchMessage,
    TransactionFailedMessage,
    SwapErrorMessage,
    GaslessUnavailableMessage,
    UnexpectedErrorMessage,
    DifferentAccountsNotAllowedError
}

export { ActionMessageType } from "@layerswap/wallet-core/types"
