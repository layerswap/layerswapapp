import type { Meta, StoryObj } from '@storybook/nextjs';
import { FC, useEffect } from 'react';
import { IntercomProvider } from 'react-use-intercom';
import { Widget } from '../components/Widget/Index';
import ErrorFallback from '@/components/ErrorFallback';

declare global {
    interface Window {
        __STORYBOOK__?: boolean;
    }
}

const ErrorPage: FC = () => {
    useEffect(() => {
        window.plausible?.('SwapFailed');
    }, []);

    return (
        <IntercomProvider appId='123'>
            <Widget hideMenu={true} >
                <div className={`rounded-lg overflow-hidden relative h-[548px] w-[480px]`}>
                    <ErrorFallback
                        error={new Error('Simulated error for Storybook')}
                        resetErrorBoundary={() => {
                            console.log('resetErrorBoundary called');
                        }}
                    />
                </div>
            </Widget>
        </IntercomProvider>
    );
};

const meta: Meta<typeof ErrorPage> = {
    title: 'LayerSwap/NotFound',
    component: ErrorPage,
    parameters: {
        layout: 'centered',
    },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => <ErrorPage />,
};
