import { FC } from 'react'
import { useSwapDataState } from '../../../../../context/swap';
import Processing from './Processing';

type Props = {
    inputFailureMessage?: string;
}

const Component: FC<Props> = ({ inputFailureMessage }) => {

    const { swapBasicData, swapDetails, quote, refuel } = useSwapDataState()

    return (
        <>
            {swapDetails && swapBasicData && <Processing swapBasicData={swapBasicData} swapDetails={swapDetails} quote={quote} refuel={refuel} inputFailureMessage={inputFailureMessage} />}
        </>

    )
}

export default Component;
