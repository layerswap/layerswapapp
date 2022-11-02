import { FC, useCallback } from 'react'
import { AuthConnectResponse } from '../../../Models/LayerSwapAuth';
import VerifyEmailCode from '../../VerifyEmailCode';

type Props = {
    OnNext: (res: AuthConnectResponse) => Promise<void>
}

const CodeStep: FC<Props> = ({ OnNext }) => {

    const onSuccessfullVerifyHandler = useCallback(async (res: AuthConnectResponse) => {
        await OnNext(res)
    }, [OnNext]);

    return (
        <>
            <VerifyEmailCode onSuccessfullVerify={onSuccessfullVerifyHandler} />
        </>
    )
}

export default CodeStep;