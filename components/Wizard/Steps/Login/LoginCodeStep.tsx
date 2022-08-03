import { useRouter } from 'next/router';
import { FC, useCallback } from 'react'
import VerifyEmailCode from '../../../VerifyEmailCode';

const LoginCodeStep: FC = () => {
    const router = useRouter();
    const { redirect } = router.query;

    const onSuccessfullVerifyHandler = useCallback(async () => {
        await router.push(redirect?.toString() || '/')
    }, [redirect]);

    return (
        <>
            <VerifyEmailCode onSuccessfullVerify={onSuccessfullVerifyHandler} />
        </>
    )
}

export default LoginCodeStep;