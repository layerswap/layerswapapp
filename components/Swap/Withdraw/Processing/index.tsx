import { FC } from 'react'
import { useSwapDataState } from '../../../../context/swap';
import { useSettingsState } from '../../../../context/settings';
import Processing from './Processing';
import Success from '../Success';
import Failed from '../Failed';
import Delay from '../Delay';
import { SwapStatus } from '../../../../Models/SwapStatus';

const Component: FC = () => {

    const { swap } = useSwapDataState()
    const swapStatus = swap.status;
    const settings = useSettingsState()

    return (
        <>
            <Processing settings={settings} swap={swap} />
            {
                (swapStatus === SwapStatus.Failed || swapStatus === SwapStatus.Cancelled || swapStatus === SwapStatus.Expired) &&
                <Failed />
            }
            {
                swapStatus === SwapStatus.UserTransferDelayed &&
                <Delay />
            }
        </>

    )
}

export default Component;
