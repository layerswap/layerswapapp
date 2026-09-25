import type { WalletsIconsProps } from '@/components/Wallet/WalletComponents/WalletsHeaderView';
import type { GasFeePresentation } from '../../Form/FeeDetails/SwapQuote/GasFeeView';
import type { Network, Token } from '@layerswap/widget-types';
import type {
    GaslessAuthorizationResult,
    DepositAction,
    SwapBasicData,
    SwapDetails,
    SwapQuote,
    QuoteReward,
    TransactionStatus,
} from '@/lib/apiClients/layerSwapApiClient';
import type { SwapTransaction } from '@/stores/swapTransactionStore';
import type { RecipientPresentation } from '@/components/Common/RecipientAddressView';
import type { ActionMessageType, Refuel } from '@layerswap/widget-types';

/** Presentation inputs only. No providers, callbacks, live clocks or persisted viewer state. */
export type Page2WalletState =
    | { kind: 'connect'; pending?: boolean; error?: string }
    | { kind: 'network'; pending?: boolean; error?: string }
    | { kind: 'account-mismatch' }
    | {
          kind: 'send';
          pending?: boolean;
          label?: string;
          isSignatureError?: boolean;
          error?: ActionMessageType | 'unknown';
          swapError?: boolean;
          errorExpanded?: boolean;
          critical?: 'warning' | 'confirmation';
          gaslessUnavailable?: boolean;
          gaslessMessage?: string;
          gaslessFailureStage?: 'create' | 'deposit';
      }
    | {
          kind: 'specialized';
          provider: 'Hyperliquid' | 'Polymarket';
          connected: boolean;
          accountMismatch?: boolean;
          pending?: boolean;
          rejected?: boolean;
          progress?: { title: string; description?: string };
          error?: { header: string; details: string };
      };

export type Page2LoadedSnapshot = {
    kind: 'swap';
    swap: SwapBasicData;
    details: SwapDetails;
    swapId?: string;
    depositActions?: DepositAction[];
    quote?: SwapQuote;
    refuel?: Refuel;
    sourceAddress: string;
    recipient?: RecipientPresentation;
    connectedWallets?: WalletsIconsProps['wallets'];
    isDepositFlow?: boolean;
    usdMode?: boolean;
    quoteState: {
        status: 'ready' | 'loading' | 'error';
        expanded: boolean;
        gasFeeInUsd?: number;
        gasless?: boolean;
        gaslessCapable?: boolean;
        gas?: Pick<
            GasFeePresentation,
            'gas' | 'gasCurrencyName' | 'isGasLoading'
        >;
        slippage?: { slippage?: number; autoSlippage?: boolean };
        reward?: QuoteReward;
        showReward?: boolean;
    };
    wallet: Page2WalletState;
    manual?: {
        loading: boolean;
        address?: string;
        qrOpen?: boolean;
        amountCopied?: boolean;
        addressCopied?: boolean;
        selectedNetwork?: Network;
        withdrawalNetworks?: { network: Network; token: Token }[];
    };
    quoteUpdate?: {
        isBelowMin: boolean;
        minAllowedAmount: number;
        maxAllowedAmount: number;
    };
    balanceWarning?:
        | { kind: 'balance'; amount: number; refreshing?: boolean }
        | { kind: 'gas' };
    rpc?: { pending: boolean; status: 'idle' | 'success' | 'error' };
    storedWalletTransaction?: SwapTransaction;
    inputTxStatusFromApi?: TransactionStatus;
    gaslessAuthorization?: GaslessAuthorizationResult;
};

export type Page2Snapshot =
    | { kind: 'loading' }
    | { kind: 'not-found' }
    | Page2LoadedSnapshot;
