import { isValidAddress } from '@/lib/address/validator';
import { addressFormat } from '@/lib/address/formatter';

export type AddressDisplayFormat = 'short' | 'ending' | 'full' | 'emphasized';

export interface AddressFormatOptions {
  format?: AddressDisplayFormat;
  maxNameLength?: number; // For emails
}

/**
 * Immutable Address class that encapsulates address strings with network context.
 * Provides consistent formatting, validation, and display methods.
 *
 * @example
 * ```typescript
 * const addr = new Address('0x1234...', network);
 * addr.toShortString(); // "0x123...5678"
 * Address.isValid('0x1234...', { name: 'ETHEREUM_MAINNET' }); // true
 * ```
 */
export class Address {
  private readonly _raw: string;
  private readonly _normalized: string;
  private readonly _network: { name: string } | null | undefined;
  private readonly _prefix: string | null;
  private readonly _providerName: string | undefined;

  /**
   * Creates a new Address instance with network context
   * @param address - The raw address string
   * @param network - Network context for network-specific formatting
   * @param providerName - Optional provider name for additional context
   */
  constructor(address: string, network: { name: string }, providerName?: string);

  /**
   * Creates a new Address instance with provider name only
   * @param address - The raw address string
   * @param network - Must be null or undefined when using providerName alone
   * @param providerName - Provider name for provider-specific formatting
   */
  constructor(address: string, network: null | undefined, providerName: string);

  /**
   * Creates a new Address instance with optional network and required provider name
   * Used when network may or may not be available but provider name is known
   * @param address - The raw address string
   * @param network - Optional network context (can be null or undefined)
   * @param providerName - Provider name for provider-specific formatting
   */
  constructor(address: string, network: { name: string } | null | undefined, providerName: string);

  constructor(address: string, network: { name: string } | null | undefined, providerName?: string) {
    if (!network && !providerName) {
      throw new Error('Address requires either network or providerName');
    }

    this._raw = address || '';
    this._network = network;
    this._providerName = providerName;

    this._normalized = addressFormat({ address: this._raw, network, providerName });
  }

  /**
   * Get the raw, unmodified address string (includes prefix if present)
   */
  get raw(): string {
    return this._raw;
  }

  /**
   * Get the normalized address (formatted for the network, without prefix)
   */
  get normalized(): string {
    return this._normalized;
  }

  /**
   * Get the full address with prefix if present
   */
  get full(): string {
    return this._prefix
      ? `${this._prefix}:${this._normalized}`
      : this._normalized;
  }

  /**
   * Get the network prefix (ronin, zksync) or null
   */
  get prefix(): string | null {
    return this._prefix;
  }

  /**
   * Get the associated network
   */
  get network(): { name: string } | null | undefined {
    return this._network;
  }

  /**
   * Check if this address is valid for its network
   */
  static isValid(address: string, network: { name: string } | null = null): boolean {
    return isValidAddress(address, network);
  }

  /**
   * Format address as shortened display: first5...last4
   * Preserves network prefix if present
   * @returns Shortened address (e.g., "0x123...5678" or "ronin:0x123...5678")
   */
  toShortString(): string {
    const addr = this._normalized;

    if (!addr || addr.length < 13) {
      return this.full;
    }

    const shortened = `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
    return this._prefix ? `${this._prefix}:${shortened}` : shortened;
  }

  /**
   * Format address as ending only: ...last4
   * @returns Last 4 characters with ellipsis (e.g., "...5678")
   */
  toEndingString(): string {
    const addr = this._normalized;
    if (!addr) return '';
    return `...${addr.substring(addr.length - 4)}`;
  }

  /**
   * Get address parts for emphasized display (bold first4 and last4)
   * Used for rendering with different styles for start/middle/end
   * @returns Object with start, middle, end parts (without prefix)
   */
  toEmphasizedParts(): { start: string; middle: string; end: string } {
    const addr = this._normalized;
    if (!addr || addr.length <= 8) {
      return { start: addr, middle: '', end: '' };
    }

    return {
      start: addr.slice(0, 4),
      middle: addr.slice(4, -4),
      end: addr.slice(-4)
    };
  }

  /**
   * Get seed number for icon generation (chars 2-10 as hex integer)
   * Used by AddressIcon component with Jazzicon
   * @returns Integer seed for deterministic icon generation
   */
  static toIconSeed(address: string): number {
    if (!address || address.length < 10) return 0;
    return parseInt(address.slice(2, 10), 16);
  }

  /**
   * Static factory method for emails (exchange accounts)
   * Returns an EmailAddress instance with email-specific formatting
   * @param email - Email address string
   * @param maxNameLength - Maximum length for email name before shortening (default: 14)
   */
  static fromEmail(email: string, maxNameLength: number = 14): EmailAddress {
    return new EmailAddress(email, maxNameLength);
  }

  /**
   * Convert to string (default: full format)
   */
  toString(): string {
    return this.full;
  }

  /**
   * Check if this address equals another address string
   * Creates an Address instance with the same network context for proper comparison
   * @param other - Raw address string to compare
   */
  equals(other: string): boolean {
    const otherAddr = this._network
      ? new Address(other, this._network, this._providerName)
      : new Address(other, null, this._providerName!);
    return this._normalized === otherAddr.normalized;
  }
}

/**
 * Special class for email addresses (exchange accounts)
 * Handles email-specific shortening logic
 */
export class EmailAddress {
  private readonly _email: string;
  private readonly _maxNameLength: number;

  constructor(email: string, maxNameLength: number = 14) {
    this._email = email || '';
    this._maxNameLength = maxNameLength;
  }

  /**
   * Format email with shortened name if necessary
   * Keeps domain intact, shortens long names with ellipsis
   * @returns Shortened email (e.g., "verylong...name@example.com")
   */
  toShortString(): string {
    const [name, domain] = this._email.split('@');
    if (!domain) return this._email; // Invalid email, return as-is

    const len = name.length;

    if (len <= this._maxNameLength) {
      return this._email;
    }

    const shortName =
      name.substring(0, Math.floor((this._maxNameLength / 3) * 2)) +
      '...' +
      name.substring(len - Math.floor(this._maxNameLength / 3), len);

    return `${shortName}@${domain}`;
  }

}

/**
 * Type guard to check if address is an EmailAddress
 */
export function isEmailAddress(address: Address | EmailAddress): address is EmailAddress {
  return address instanceof EmailAddress;
}
