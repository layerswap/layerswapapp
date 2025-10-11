import type { Meta, StoryObj } from '@storybook/nextjs';
import { FC, useCallback, useEffect } from 'react';
import { IntercomProvider, useIntercom } from 'react-use-intercom';
import { useRouter } from 'next/router';
import { Widget } from '../components/Widget/Index';
import NotFound from '@/components/Swap/NotFound';

declare global {
    interface Window {
        __STORYBOOK__?: boolean;
    }
}

const NotFoundComp: FC = () => {
    useEffect(() => {
        window.plausible?.('SwapFailed');
    }, []);

    return (
        <IntercomProvider appId='123'>
            <Widget hideMenu={true} >
                <div className={`rounded-lg overflow-hidden relative h-[548px] w-[480px]`}>
                    <NotFound />
                </div>
            </Widget>
        </IntercomProvider>
    );
};

const meta: Meta<typeof NotFoundComp> = {
    title: 'LayerSwap/NotFound',
    component: NotFoundComp,
    parameters: {
        layout: 'centered',
    },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => <NotFoundComp />,
};
