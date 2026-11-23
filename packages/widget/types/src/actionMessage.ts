export enum ActionMessageType {
  ConfirmTransaction = 'ConfirmTransaction',
  TransactionInProgress = 'TransactionInProgress',
  InsufficientFunds = 'InsufficientFunds',
  TransactionRejected = 'TransactionRejected',
  WaletMismatch = 'WaletMismatch',
  TransactionFailed = 'TransactionFailed',
  TransactionExpired = 'TransactionExpired',
  UnexpectedErrorMessage = 'UnexpectedErrorMessage',
  DifferentAccountsNotAllowedError = 'DifferentAccountsNotAllowedError',
}
