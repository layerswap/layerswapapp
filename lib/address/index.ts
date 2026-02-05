// Export Address class and related types
export { Address, EmailAddress, isEmailAddress } from './Address';
export type { AddressDisplayFormat, AddressFormatOptions } from './Address';

// Re-export existing utilities for backward compatibility
export { isValidAddress } from './validator';
export { addressFormat } from './formatter';
export { getExplorerUrl } from './explorerUrl';
