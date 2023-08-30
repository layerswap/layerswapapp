import { FC } from 'react'
import { useSwapDataState } from '../../../../context/swap';
import { useSettingsState } from '../../../../context/settings';
import Processing from './Processing';

const Component: FC = () => {

    const { swap } = useSwapDataState()
    const settings = useSettingsState()
    
    return (
        <Processing settings={settings} swap={swap}/>
    )
}

export default Component;
