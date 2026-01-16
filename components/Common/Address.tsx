import { FC } from 'react';
import { Address as AddressClass, AddressDisplayFormat, isEmailAddress } from '@/lib/address/Address';
import { Network } from '@/Models/Network';

export interface AddressProps {
  /**
   * Address to display - can be Address class instance or raw string
   */
  address: AddressClass | string;

  /**
   * Network context (required if address is a string and you want network-specific formatting)
   */
  network?: Network | null;

  /**
   * Display format
   * - 'short': first5...last4 (default)
   * - 'ending': ...last4
   * - 'full': complete address
   * - 'emphasized': full address with bold first4 and last4
   */
  format?: AddressDisplayFormat;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to display in monospace font (default: true for non-emails)
   */
  mono?: boolean;
}

/**
 * Address display component - simple, composable address renderer
 *
 * @example
 * ```tsx
 * // With Address instance
 * const addr = new Address("0x1234...", network);
 * <Address address={addr} format="short" />
 *
 * // With raw string
 * <Address address="0x1234..." network={network} format="ending" />
 *
 * // Composition with other components
 * <div className="flex items-center gap-2">
 *   <Address address={addr} format="short" />
 *   <CopyButton toCopy={addr.full} />
 * </div>
 * ```
 */
export const Address: FC<AddressProps> = ({
  address,
  network,
  format = 'short',
  className = '',
  mono
}) => {
  // Convert string to Address instance if needed
  const addr = typeof address === 'string'
    ? new AddressClass(address, network || null)
    : address;

  // Determine if monospace should be applied
  const isEmail = isEmailAddress(addr);
  const shouldUseMono = mono !== undefined ? mono : !isEmail;

  // Render based on format
  const renderAddress = () => {
    switch (format) {
      case 'short':
        return <span>{addr.toShortString()}</span>;

      case 'ending':
        return <span>{addr.toEndingString()}</span>;

      case 'full':
        return <span>{addr.full}</span>;

      case 'emphasized': {
        if (isEmail) {
          return <span>{addr.full}</span>;
        }
        const { start, middle, end } = addr.toEmphasizedParts();
        return (
          <>
            <span className="font-medium text-primary-text">{start}</span>
            <span>{middle}</span>
            <span className="font-medium text-primary-text">{end}</span>
          </>
        );
      }

      default:
        return <span>{addr.toShortString()}</span>;
    }
  };

  return (
    <span className={`${shouldUseMono ? 'font-mono' : ''} ${className}`}>
      {renderAddress()}
    </span>
  );
};

/**
 * Pre-configured variant for short address display
 */
export const ShortAddress: FC<Omit<AddressProps, 'format'>> = (props) => (
  <Address {...props} format="short" />
);

/**
 * Pre-configured variant for ending-only address display
 */
export const EndingAddress: FC<Omit<AddressProps, 'format'>> = (props) => (
  <Address {...props} format="ending" />
);

/**
 * Pre-configured variant for full address display
 */
export const FullAddress: FC<Omit<AddressProps, 'format'>> = (props) => (
  <Address {...props} format="full" />
);

/**
 * Pre-configured variant for emphasized address display
 */
export const EmphasizedAddress: FC<Omit<AddressProps, 'format'>> = (props) => (
  <Address {...props} format="emphasized" />
);
