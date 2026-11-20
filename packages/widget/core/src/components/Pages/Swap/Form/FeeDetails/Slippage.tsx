import type { ComponentProps } from 'react';
import { useSlippageStore } from '@/stores/slippageStore';
import type { SwapValues } from '.';
import { SlippageView } from './SlippageView';

export function Slippage(
    props: Pick<
        ComponentProps<typeof SlippageView>,
        'quoteData' | 'disableEditingBackground'
    > & { values: SwapValues },
) {
    const { slippage, setSlippage, autoSlippage, setAutoSlippage } =
        useSlippageStore();
    return (
        <SlippageView
            {...props}
            slippage={slippage}
            setSlippage={setSlippage}
            autoSlippage={autoSlippage}
            setAutoSlippage={setAutoSlippage}
        />
    );
}
