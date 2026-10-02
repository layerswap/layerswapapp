import { FC } from 'react'
import { useSwapDataState } from '../../../../../context/swap';
import Processing from './Processing';

const Component: FC = () => {

    const { swapBasicData, swapDetails, quote, refuel } = useSwapDataState()

    return (
        <>
            {swapDetails && swapBasicData && <Processing swapBasicData={swapBasicData} swapDetails={swapDetails} quote={quote} refuel={refuel} />}
        </>

    )
}

export default Component;
