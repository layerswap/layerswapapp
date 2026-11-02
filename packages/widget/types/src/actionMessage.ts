export enum ActionMessageType {
  ConfirmTransaction = 'ConfirmTransaction',
  TransactionInProgress = 'TransactionInProgress',
  InsufficientFunds = 'InsufficientFunds',
  InsufficientGas = 'InsufficientGas',
  TransactionRejected = 'TransactionRejected',
  WaletMismatch = 'WaletMismatch',
  TransactionFailed = 'TransactionFailed',
  TransactionExpired = 'TransactionExpired',
  UnexpectedErrorMessage = 'UnexpectedErrorMessage',
  DifferentAccountsNotAllowedError = 'DifferentAccountsNotAllowedError',
}
