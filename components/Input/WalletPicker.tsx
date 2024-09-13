import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect } from "react";
import useWallet from "../../hooks/useWallet";

type Props = {
    direction: 'from' | 'to'
}

const Component: FC<Props> = ({ direction }) => {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();


    const walletNetwork = values.fromExchange ? undefined : (direction === "from" ? values.from : values.to)
    const { provider } = useWallet(walletNetwork, 'autofil')
    const wallet = provider?.activeWallet

    useEffect(() => {

        setFieldValue('source_wallet', wallet)

    }, [wallet?.address])

    return <>

        {wallet?.address}

    </>
}
export default Component