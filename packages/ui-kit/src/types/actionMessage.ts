export enum ActionMessageType {
    ConfirmTransaction = 'ConfirmTransaction',
    TransactionInProgress = 'TransactionInProgress',
    InsufficientFunds = 'InsufficientFunds',
    TransactionRejected = 'TransactionRejected',
    WaletMismatch = 'WaletMismatch',
    TransactionFailed = 'TransactionFailed',
    UnexpectedErrorMessage = 'UnexpectedErrorMessage',
    DifferentAccountsNotAllowedError = 'DifferentAccountsNotAllowedError',
}
