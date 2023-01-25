import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import ConnectApiKeyExchange from '../../connectApiKeyExchange';
import returnBySwapType from '../../utils/returnBySwapType';

type Props = {
    onSuccess: () => Promise<void>,
}
const APIKeyStep: FC<Props> = ({onSuccess}) => {
    const { swapFormData } = useSwapDataState()
    const { from, to, swapType } = swapFormData || {}
    const onConnect = async () => {
        await onSuccess()
    }
    if (!from)
        return <></>

    return (
        <ConnectApiKeyExchange exchange={returnBySwapType(swapType, from, to)?.baseObject} onSuccess={onConnect} slideOverPlace='inStep' />
    )
}

export default APIKeyStep;