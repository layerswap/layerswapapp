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
 * addr.isValid(); // true
 * ```
 */
export class Address {
  private readonly _raw: string;
  private readonly _normalized: string;
  private readonly _network: { name: string } | null;
  private readonly _prefix: string | null;
  private readonly _providerName: string | undefined;

  /**
   * Creates a new Address instance
   * @param address - The raw address string (may include network prefixes like ronin:, zksync:)
   * @param network - Optional network context for network-specific formatting
   * @param providerName - Optional provider name for provider-specific formatting when network is unavailable
   */
  constructor(address: string, network: { name: string } | null = null, providerName?: string) {
    this._raw = address || '';
    this._network = network;
    this._providerName = providerName;

    // Extract network prefix if present
    const prefixMatch = this._raw.match(/^(ronin|zksync):/);
    this._prefix = prefixMatch ? prefixMatch[1] : null;

    // Normalize address using existing formatter
    const addressWithoutPrefix = this._prefix
      ? this._raw.replace(`${this._prefix}:`, '')
      : this._raw;

    this._normalized = (network || providerName)
      ? addressFormat({ address: addressWithoutPrefix, network, providerName })
      : addressWithoutPrefix;
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
  get network(): { name: string } | null {
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
  toIconSeed(): number {
    const addr = this._normalized;
    if (!addr || addr.length < 10) return 0;
    return parseInt(addr.slice(2, 10), 16);
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
    const otherAddr = new Address(other, this._network, this._providerName);
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

  get raw(): string {
    return this._email;
  }

  get full(): string {
    return this._email;
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

  toEndingString(): string {
    return this.toShortString();
  }

  toString(): string {
    return this._email;
  }

  isValid(): boolean {
    return this._email.includes('@') && this._email.split('@')[1]?.length > 0;
  }

  toEmphasizedParts(): { start: string; middle: string; end: string } {
    return { start: this._email, middle: '', end: '' };
  }

  toIconSeed(): number {
    // Use email hash for icon generation
    let hash = 0;
    for (let i = 0; i < this._email.length; i++) {
      hash = ((hash << 5) - hash) + this._email.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Type guard to check if address is an EmailAddress
 */
export function isEmailAddress(address: Address | EmailAddress): address is EmailAddress {
  return address instanceof EmailAddress;
}
