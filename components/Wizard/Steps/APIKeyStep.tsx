import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import ConnectApiKeyExchange from '../../connectApiKeyExchange';

type Props = {
    onSuccess: () => Promise<void>,
}
const APIKeyStep: FC<Props> = ({onSuccess}) => {
    const { swapFormData } = useSwapDataState()
    const { from: exchange } = swapFormData || {}
    const onConnect = async () => {
        await onSuccess()
    }
    if (!exchange)
        return <></>

    return (
        <ConnectApiKeyExchange exchange={swapFormData?.from?.baseObject} onSuccess={onConnect} slideOverPlace='inStep' />
    )
}

export default APIKeyStep;