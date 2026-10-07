import type { ResolvedDestination } from './DestinationTokenPicker';
import type { Page2LoadedSnapshot } from '../Swap/Withdraw/Presentation/Page2Snapshot';

export type DepositMethodSnapshot = {
    id: string;
    title: string;
    subtitle: string;
    icon: 'wallet' | 'address' | 'network';
    logo?: string;
    loading?: boolean;
    disabled?: boolean;
    disabledReason?: string;
};

/** Synthetic presentation data; never mounts deposit providers or creates a swap. */
export type DepositSnapshot = { kind: 'deposit'; title?: string } & (
    | {
          step: 'methods';
          destinations: ResolvedDestination[];
          methods: DepositMethodSnapshot[];
      }
    | {
          step: 'address';
          source: ResolvedDestination;
          address?: string;
          loading?: boolean;
          quote: {
              minimum: string;
              maximum: string;
              fees: string;
              estimatedTime: string;
              expanded: boolean;
          };
      }
    | { step: 'wallet' | 'address-processing'; transfer: Page2LoadedSnapshot }
);
