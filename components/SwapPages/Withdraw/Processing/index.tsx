import { FC } from 'react'
import { useSwapDataState } from '../../../../context/swap';
import Processing from './Processing';

const Component: FC = () => {

    const { swapResponse: swap } = useSwapDataState()

    return (
        <>
            {swap && <Processing swapResponse={swap} />}
        </>

    )
}

export default Component;
