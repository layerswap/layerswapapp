import { FC } from 'react'
import { useSwapDataState } from '../../../../../context/swap';
import Processing from './Processing';
import { SwapFailureReason } from '@/hooks/useSwapRetry';

type Props = {
    failureReason?: SwapFailureReason;
}

const Component: FC<Props> = ({ failureReason }) => {

    const { swapBasicData, swapDetails, quote, refuel } = useSwapDataState()

    return (
        <>
            {swapDetails && swapBasicData && <Processing swapBasicData={swapBasicData} swapDetails={swapDetails} quote={quote} refuel={refuel} failureReason={failureReason} />}
        </>

    )
}

export default Component;
