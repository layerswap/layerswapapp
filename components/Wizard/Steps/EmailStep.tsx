import { FC, useEffect } from 'react'
import { useAuthDataUpdate } from '../../../context/authContext';
import SendEmail from '../../SendEmail';

type Props = {
    OnNext: () => void
}

const EmailStep: FC<Props> = ({ OnNext }) => {
    return (
        <>
            <SendEmail onSend={OnNext} />
        </>
    )
}

export default EmailStep;