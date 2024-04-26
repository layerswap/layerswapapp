import { FC } from 'react'
import Processing from './Processing';
import { SwapResponse } from '../../../../lib/layerSwapApiClient';

interface ComponentProps {
    swapResponse: SwapResponse;
}

const Component: FC<ComponentProps> = (props) => {
    const { swapResponse } = props;

    return (
        <>
            {swapResponse && <Processing swapResponse={swapResponse} />}
        </>

    )
}

export default Component;
