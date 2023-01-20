import { FC, useCallback } from 'react'
import { AuthConnectResponse } from '../../../Models/LayerSwapAuth';
import VerifyEmailCode from '../../VerifyEmailCode';

type Props = {
    OnNext: (res: AuthConnectResponse) => Promise<void>
    disclosureLogin?: boolean
}

const CodeStep: FC<Props> = ({ OnNext, disclosureLogin }) => {

    const onSuccessfullVerifyHandler = useCallback(async (res: AuthConnectResponse) => {
        await OnNext(res)
    }, [OnNext]);

    return (
        <VerifyEmailCode onSuccessfullVerify={onSuccessfullVerifyHandler} disclosureLogin={disclosureLogin} />
    )
}

export default CodeStep;