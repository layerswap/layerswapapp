import { ExternalLink, Fuel } from 'lucide-react';
import { FC } from 'react'
import { useSwapDataState } from '../../../../context/swap';
import { useSettingsState } from '../../../../context/settings';
import { GetSwapStep } from '../../../utils/SwapStatus';
import { SwapStep } from '../../../../Models/Wizard';
import KnownInternalNames from '../../../../lib/knownIds';
import Widget from '../../../Wizard/Widget';
import shortenAddress from '../../../utils/ShortenAddress';
import Steps from '../../StepsComponent';
import SwapSummary from '../../Summary';
import { GetNetworkCurrency } from '../../../../helpers/settingsHelper';
import AverageCompletionTime from '../../../Common/AverageCompletionTime';
import { TransactionType } from '../../../../lib/layerSwapApiClient';
import { truncateDecimals } from '../../../utils/RoundDecimals';
import Processing from './Processing';




const Component: FC = () => {

    const { swap } = useSwapDataState()
    const settings = useSettingsState()
    if(!settings)
        return <div>asdasdas</div>
    return (
        <Processing />
    )
}




export default Component;
