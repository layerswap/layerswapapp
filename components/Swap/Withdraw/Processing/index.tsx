import { FC } from 'react'
import { useSwapDataState } from '../../../../context/swap';
import { useSettingsState } from '../../../../context/settings';
import Processing from './Processing';

const Component: FC = () => {

    const { swapResponse: swap } = useSwapDataState()
    const settings = useSettingsState()

    return (
        <>
            {swap && <Processing settings={settings} swapResponse={swap} />}
        </>

    )
}

export default Component;
