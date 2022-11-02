import { FC } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { SwapCreateStep } from '../../../Models/Wizard';
import ConnectApiKeyExchange from '../../connectApiKeyExchange';

type Props = {
    onSuccess: () => Promise<void>,
}
const APIKeyStep: FC<Props> = ({onSuccess}) => {
    const { swapFormData } = useSwapDataState()
    const { exchange } = swapFormData || {}
    const onConnect = async () => {
        await onSuccess()
    }
    if (!exchange)
        return <></>

    return (
        <>
            <ConnectApiKeyExchange exchange={swapFormData?.exchange?.baseObject} onSuccess={onConnect} slideOverPlace='inStep' />
        </>
    )
}

export default APIKeyStep;