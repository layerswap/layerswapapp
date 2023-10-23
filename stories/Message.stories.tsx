import type { Meta, StoryObj } from '@storybook/react';
import ColorSchema from '../components/ColorSchema';
import { THEME_COLORS } from '../Models/Theme';
import WalletMessage from '../components/Swap/Withdraw/Wallet/WalletTransfer/message';
import { FC } from 'react';

window.plausible = () => { }
const Comp: FC<{ theme?: "default" | "light", header: string, status: 'pending' | 'error', details: string }> = ({ theme, status, details, header }) => {
    const themeData = theme ? THEME_COLORS[theme] : THEME_COLORS["default"];
    return <>
        <WalletMessage status={status}
            header={header}
            details={details} />
        <ColorSchema themeData={themeData} />
    </>
}

const meta = {
    title: 'Example/Message',
    component: Comp,
    parameters: {
        layout: 'centered',
    },
    args: {
        theme: 'default',
    },
    argTypes: {
        theme: {
            options: ['light', 'default', 'evmos', 'imxMarketplace', 'ea7df14a1597407f9f755f05e25bab42'],
            control: { type: 'select' },
        },
    },
    render: (args) => <Comp {...args} />,
} satisfies Meta<typeof Comp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PreparingTransactionMessage: Story = {
    args: {
        status: "pending",
        header: 'Preparing the transaction',
        details: 'Will be ready to sign in a couple of seconds'
    }
};
export const ConfirmTransactionMessage: Story = {
    args: {
        header: 'Confirm in wallet',
        status: 'pending',
        details: 'Please confirm the transaction in your wallet'
    }
};
export const TransactionInProgressMessage: Story = {
    args: {
        header: 'Transaction in progress',
        status: 'pending',
        details: 'Waiting for your transaction to be published'
    }
};
export const InsufficientFundsMessage: Story = {
    args: {
        header: 'Insufficient funds',
        status: 'error',
        details: 'The balance of the connected wallet is not enough'
    }
};

export const TransactionRejectedMessage: Story = {
    args: {
        status: "error",
        header: "Transaction rejected",
        details: "You've rejected the transaction in your wallet. Click “Try again” to open the prompt again."
    }
}